import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { prisma } from '@/lib/prisma';
import { makeIdempotenceKey } from '@/lib/yookassa';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Body = {
  initData?: string;
  reportId: string;
  description?: string;
  returnPath?: string;
};

type TgUser = {
  id: string;
  username: string | null;
  first_name: string | null;
  last_name: string | null;
};

function envClean(name: string) {
  return String(process.env[name] ?? '').replace(/[\r\n]/g, '').trim();
}

function timingSafeEqualHex(a: string, b: string) {
  try {
    const ab = Buffer.from(a, 'hex');
    const bb = Buffer.from(b, 'hex');
    if (ab.length !== bb.length) return false;
    return crypto.timingSafeEqual(ab, bb);
  } catch {
    return false;
  }
}

function verifyTelegramWebAppInitData(initData: string, botToken: string, maxAgeSec = 60 * 60 * 24) {
  const params = new URLSearchParams(initData);
  const hash = params.get('hash');
  if (!hash) return { ok: false as const, error: 'NO_HASH' as const };

  const authDateStr = params.get('auth_date');
  if (!authDateStr) return { ok: false as const, error: 'NO_AUTH_DATE' as const };

  const authDate = Number(authDateStr);
  if (!Number.isFinite(authDate)) return { ok: false as const, error: 'BAD_AUTH_DATE' as const };

  const nowSec = Math.floor(Date.now() / 1000);
  if (authDate > nowSec + 60) return { ok: false as const, error: 'AUTH_DATE_IN_FUTURE' as const };
  if (nowSec - authDate > maxAgeSec) return { ok: false as const, error: 'INITDATA_EXPIRED' as const };

  params.delete('hash');

  const dataCheckString = [...params.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join('\n');

  const secretKey = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest();
  const computedHash = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');

  if (!timingSafeEqualHex(computedHash, hash)) return { ok: false as const, error: 'BAD_HASH' as const };

  const userStr = params.get('user');
  if (!userStr) return { ok: false as const, error: 'NO_USER' as const };

  let userJson: any;
  try {
    userJson = JSON.parse(userStr);
  } catch {
    return { ok: false as const, error: 'BAD_USER_JSON' as const };
  }

  if (!userJson?.id) return { ok: false as const, error: 'NO_USER_ID' as const };

  const user: TgUser = {
    id: String(userJson.id),
    username: userJson.username ? String(userJson.username) : null,
    first_name: userJson.first_name ? String(userJson.first_name) : null,
    last_name: userJson.last_name ? String(userJson.last_name) : null,
  };

  return { ok: true as const, user };
}

function normalizeOrigin(raw: string): string {
  const clean = String(raw || '').trim().replace(/\/+$/, '');
  if (!clean) return '';

  try {
    const u = new URL(clean);
    return `${u.protocol}//${u.host}`;
  } catch {
    return '';
  }
}

function getPublicAppOrigin(req: Request): string {
  const envOrigin =
    normalizeOrigin(envClean('APP_PUBLIC_URL')) ||
    normalizeOrigin(envClean('NEXT_PUBLIC_APP_URL')) ||
    normalizeOrigin(envClean('NEXT_PUBLIC_SITE_URL'));

  if (envOrigin) return envOrigin;

  const h = req.headers;
  const xfProto = String(h.get('x-forwarded-proto') || '').trim();
  const xfHost = String(h.get('x-forwarded-host') || '').trim();
  const host = String(h.get('host') || '').trim();

  const proto = xfProto || 'https';
  const usedHost = xfHost || host;

  if (!usedHost) return '';

  return normalizeOrigin(`${proto}://${usedHost}`);
}

function normalizeReturnPath(v: string): string {
  const raw = String(v || '').trim();
  if (!raw) return '/';
  if (!raw.startsWith('/')) return '/';
  if (raw.startsWith('//')) return '/';
  return raw;
}

function getRuProxyBase() {
  return String(process.env.YOOKASSA_RU_PROXY_BASE || '')
    .trim()
    .replace(/\/+$/, '');
}

function getReceiptEmail() {
  return String(process.env.YOOKASSA_RECEIPT_EMAIL || '').trim();
}

async function readJsonSafe(res: Response) {
  const text = await res.text().catch(() => '');
  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch {
    return { _raw: text };
  }
}

function getCookieValue(req: Request, name: string): string {
  try {
    const raw = req.headers.get('cookie') || '';
    if (!raw) return '';

    const parts = raw.split(';');
    for (const part of parts) {
      const [k, ...rest] = part.trim().split('=');
      if (decodeURIComponent(k) === name) {
        return decodeURIComponent(rest.join('='));
      }
    }
  } catch {}
  return '';
}

function resolveInitData(req: Request, body: Body | null): string {
  const fromBody = String(body?.initData ?? '').trim();
  if (fromBody) return fromBody;

  const fromHeader = String(req.headers.get('x-telegram-init-data') || '').trim();
  if (fromHeader) return fromHeader;

  const fromCookie = String(getCookieValue(req, 'tg_init_data') || '').trim();
  if (fromCookie) return fromCookie;

  return '';
}

export async function POST(req: Request) {
  try {
    const proxyBase = getRuProxyBase();
    if (!proxyBase) {
      return NextResponse.json({ ok: false, error: 'YOOKASSA_RU_PROXY_BASE_MISSING' }, { status: 500 });
    }

    const receiptEmail = getReceiptEmail();
    if (!receiptEmail) {
      return NextResponse.json({ ok: false, error: 'YOOKASSA_RECEIPT_EMAIL_MISSING' }, { status: 500 });
    }

    const botToken = envClean('TELEGRAM_BOT_TOKEN');
    if (!botToken) {
      return NextResponse.json({ ok: false, error: 'NO_BOT_TOKEN' }, { status: 500 });
    }

    const body = (await req.json().catch(() => null)) as Body | null;
    if (!body) {
      return NextResponse.json({ ok: false, error: 'BAD_JSON' }, { status: 400 });
    }

    const initData = resolveInitData(req, body);
    const reportId = String(body.reportId ?? '').trim();

    if (!initData) {
      return NextResponse.json(
        {
          ok: false,
          error: 'NO_INIT_DATA',
          hint: 'Pass initData in body, x-telegram-init-data header, or tg_init_data cookie',
        },
        { status: 401 }
      );
    }

    if (!reportId) {
      return NextResponse.json({ ok: false, error: 'NO_REPORT_ID' }, { status: 400 });
    }

    const v = verifyTelegramWebAppInitData(initData, botToken);
    if (!v.ok) {
      return NextResponse.json({ ok: false, error: v.error }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { telegramId: v.user.id },
      select: { id: true },
    });

    if (!user) {
      return NextResponse.json({ ok: false, error: 'NO_USER' }, { status: 404 });
    }

    const report = await prisma.report.findFirst({
      where: { id: reportId, userId: user.id },
      select: {
        id: true,
        userId: true,
        type: true,
        totalRub: true,
        pricingJson: true,
      },
    });

    if (!report) {
      return NextResponse.json({ ok: false, error: 'REPORT_NOT_FOUND' }, { status: 404 });
    }

    const totalRub = Number(report.totalRub ?? 0);
    if (!Number.isFinite(totalRub) || totalRub <= 0) {
      return NextResponse.json(
        {
          ok: false,
          error: 'REPORT_TOTAL_RUB_INVALID',
          totalRub,
        },
        { status: 400 }
      );
    }

    const origin = getPublicAppOrigin(req);
    if (!origin) {
      return NextResponse.json(
        {
          ok: false,
          error: 'NO_PUBLIC_ORIGIN',
          hint: 'Set APP_PUBLIC_URL env, e.g. https://your-domain.com',
        },
        { status: 500 }
      );
    }

    const returnPath = normalizeReturnPath(String(body.returnPath ?? ''));
    const returnUrl = `${origin}${returnPath}`;

    const description = String(body.description ?? `Оплата отчёта ${report.type}`).slice(0, 128);

    const payload = {
      amount: {
        value: totalRub.toFixed(2),
        currency: 'RUB',
      },
      confirmation: {
        type: 'redirect',
        return_url: returnUrl,
      },
      capture: true,
      description,
      metadata: {
        reportId: report.id,
        userId: report.userId,
        reportType: report.type,
      },
      receipt: {
        customer: {
          email: receiptEmail,
        },
        items: [
          {
            description,
            quantity: '1.00',
            amount: {
              value: totalRub.toFixed(2),
              currency: 'RUB',
            },
            vat_code: 1,
            payment_mode: 'full_payment',
            payment_subject: 'service',
          },
        ],
      },
      idempotenceKey: makeIdempotenceKey('yk'),
    };

    const r = await fetch(`${proxyBase}/create-payment`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      cache: 'no-store',
    });

    const data = await readJsonSafe(r);

    if (!r.ok || !(data as any)?.ok) {
      return NextResponse.json(
        {
          ok: false,
          error: 'YOOKASSA_PROXY_ERROR',
          status: r.status,
          details: data,
          proxyError: (data as any)?.error ?? null,
          proxyRaw: (data as any)?.raw ?? null,
          debugReturnUrl: returnUrl,
        },
        { status: 400 }
      );
    }

    const paymentId = String((data as any)?.paymentId ?? '').trim();
    const confirmationUrl = String((data as any)?.confirmationUrl ?? '').trim();
    const paymentStatus = String((data as any)?.status ?? 'pending').trim();

    if (!paymentId) {
      return NextResponse.json({ ok: false, error: 'NO_PAYMENT_ID', details: data }, { status: 500 });
    }

    if (!confirmationUrl) {
      return NextResponse.json({ ok: false, error: 'NO_CONFIRMATION_URL', details: data }, { status: 500 });
    }

    const prev =
      report.pricingJson && typeof report.pricingJson === 'object'
        ? (report.pricingJson as any)
        : {};

    await prisma.report.update({
      where: { id: report.id },
      data: {
        pricingJson: {
          ...prev,
          yookassa: {
            ...(prev?.yookassa ?? {}),
            paymentId,
            status: paymentStatus || 'pending',
            returnUrl,
            returnPath,
            createdAt: new Date().toISOString(),
            amount: {
              value: totalRub.toFixed(2),
              currency: 'RUB',
            },
            receiptEmail,
          },
        },
      },
    });

    return NextResponse.json({
      ok: true,
      reportId: report.id,
      paymentId,
      url: confirmationUrl,
      confirmationUrl,
      returnUrl,
      openInTelegram: true,
    });
  } catch (e: any) {
    return NextResponse.json(
      {
        ok: false,
        error: 'CREATE_PAYMENT_FAILED',
        hint: String(e?.message ?? e),
      },
      { status: 500 }
    );
  }
}
