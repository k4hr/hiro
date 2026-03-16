/* path: app/api/astro/get/route.ts */
import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type TgUser = {
  id: string;
  username: string | null;
  first_name: string | null;
  last_name: string | null;
};

function envClean(name: string) {
  return String(process.env[name] ?? '').replace(/[\r\n]/g, '').trim();
}

function getRuProxyBase() {
  return String(process.env.YOOKASSA_RU_PROXY_BASE || '')
    .trim()
    .replace(/\/+$/, '');
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

function parseDobToUtcDate(dob: string): Date | null {
  if (!/^\d{2}\.\d{2}\.\d{4}$/.test(dob)) return null;
  const [dd, mm, yyyy] = dob.split('.');
  const iso = `${yyyy}-${mm}-${dd}T00:00:00.000Z`;
  const dt = new Date(iso);
  if (!Number.isFinite(dt.getTime())) return null;
  return dt;
}

function cleanText(v: any, max = 96): string {
  return String(v ?? '').replace(/\s+/g, ' ').trim().slice(0, max);
}

function cleanTime(v: any): string {
  return String(v ?? '').replace(/\s+/g, '').trim().slice(0, 8);
}

function lc(v: any) {
  return String(v ?? '').trim().toLowerCase();
}

function extractPaid(last: any): boolean {
  const reportStatus = lc(last?.status);

  if (reportStatus === 'ready' || reportStatus === 'analyzing' || reportStatus === 'processing') {
    return true;
  }

  const pricing = last?.pricingJson && typeof last.pricingJson === 'object' ? last.pricingJson : {};
  const input = last?.input && typeof last.input === 'object' ? last.input : {};

  const candidates = [
    pricing?.yookassa?.status,
    pricing?.payment?.status,
    pricing?.paymentStatus,
    pricing?.status,

    input?.yookassa?.status,
    input?.payment?.status,
    input?.paymentStatus,
    input?.status,
  ]
    .map((x) => lc(x))
    .filter(Boolean);

  return candidates.some((s) =>
    ['succeeded', 'paid', 'success', 'captured', 'waiting_for_capture', 'authorized'].includes(s)
  );
}

function extractPaymentStatus(last: any): string {
  const pricing = last?.pricingJson && typeof last.pricingJson === 'object' ? last.pricingJson : {};
  const input = last?.input && typeof last.input === 'object' ? last.input : {};

  return (
    String(
      pricing?.yookassa?.status ??
        pricing?.payment?.status ??
        pricing?.paymentStatus ??
        pricing?.status ??
        input?.yookassa?.status ??
        input?.payment?.status ??
        input?.paymentStatus ??
        input?.status ??
        ''
    ).trim() || null
  ) as any;
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

async function syncPaymentStatusFromProxy(last: any) {
  try {
    const paymentId = String((last?.pricingJson as any)?.yookassa?.paymentId ?? '').trim();
    if (!paymentId) return last;

    const currentStatus = lc((last?.pricingJson as any)?.yookassa?.status);
    if (currentStatus === 'succeeded') return last;

    const proxyBase = getRuProxyBase();
    if (!proxyBase) return last;

    const r = await fetch(`${proxyBase}/get-payment?paymentId=${encodeURIComponent(paymentId)}`, {
      method: 'GET',
      cache: 'no-store',
      headers: { Accept: 'application/json' },
    });

    const data = await readJsonSafe(r);
    if (!r.ok || !(data as any)?.ok) return last;

    const remoteStatus = String((data as any)?.status ?? '').trim();
    const remotePaid = Boolean((data as any)?.paid);
    const remoteAmount = (data as any)?.amount ?? null;
    const remoteMetadata = (data as any)?.metadata ?? null;

    const nextPricing = {
      ...((last?.pricingJson && typeof last.pricingJson === 'object') ? last.pricingJson : {}),
      yookassa: {
        ...(((last?.pricingJson as any)?.yookassa && typeof (last?.pricingJson as any)?.yookassa === 'object')
          ? (last?.pricingJson as any).yookassa
          : {}),
        paymentId,
        status: remoteStatus || (last?.pricingJson as any)?.yookassa?.status || null,
        syncedAt: new Date().toISOString(),
        amount: remoteAmount ?? (last?.pricingJson as any)?.yookassa?.amount ?? null,
        metadata: remoteMetadata ?? (last?.pricingJson as any)?.yookassa?.metadata ?? null,
      },
    } as any;

    if (remotePaid || lc(remoteStatus) === 'succeeded') {
      nextPricing.yookassa.paidAt = nextPricing.yookassa.paidAt || new Date().toISOString();
    }

    await prisma.report.update({
      where: { id: last.id },
      data: {
        pricingJson: nextPricing,
      },
    });

    return {
      ...last,
      pricingJson: nextPricing,
    };
  } catch (e: any) {
    console.log('[ASTRO_GET_PROXY_SYNC_ERROR]', String(e?.message ?? e));
    return last;
  }
}

export async function POST(req: Request) {
  try {
    const botToken = envClean('TELEGRAM_BOT_TOKEN');
    if (!botToken) return NextResponse.json({ ok: false, error: 'NO_BOT_TOKEN' }, { status: 500 });

    const body = (await req.json().catch(() => null)) as any;
    if (!body) return NextResponse.json({ ok: false, error: 'BAD_JSON' }, { status: 400 });

    const initData = String(body.initData || '').trim();
    const reportId = String(body.reportId || '').trim();
    const dob = String(body.dob || '').trim();
    const birthPlace = cleanText(body.birthPlace, 96);
    const birthTime = cleanTime(body.birthTime);

    if (!initData) return NextResponse.json({ ok: false, error: 'NO_INIT_DATA' }, { status: 401 });

    const v = verifyTelegramWebAppInitData(initData, botToken);
    if (!v.ok) return NextResponse.json({ ok: false, error: v.error }, { status: 401 });

    const telegramId = v.user.id;
    const user = await prisma.user.findUnique({ where: { telegramId }, select: { id: true } });
    if (!user) return NextResponse.json({ ok: false, error: 'NO_USER' }, { status: 404 });

    let last: any = null;

    if (reportId) {
      last = await prisma.report.findFirst({
        where: {
          id: reportId,
          userId: user.id,
          type: 'ASTRO',
          astroMode: 'CHART',
        },
        select: {
          id: true,
          status: true,
          createdAt: true,
          errorCode: true,
          errorText: true,
          input: true,
          text: true,
          pricingJson: true,
        },
      });
    } else {
      if (!dob) return NextResponse.json({ ok: false, error: 'NO_DOB' }, { status: 400 });

      const d = parseDobToUtcDate(dob);
      if (!d) return NextResponse.json({ ok: false, error: 'BAD_DOB' }, { status: 400 });

      last = await prisma.report.findFirst({
        where: {
          userId: user.id,
          type: 'ASTRO',
          astroMode: 'CHART',
          astroDob: d,
          astroCity: birthPlace || null,
          astroTime: birthTime || null,
        },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          status: true,
          createdAt: true,
          errorCode: true,
          errorText: true,
          input: true,
          text: true,
          pricingJson: true,
        },
      });
    }

    if (last && !extractPaid(last)) {
      last = await syncPaymentStatusFromProxy(last);
    }

    const hasText = Boolean(last?.status === 'READY' && last?.text);
    const paid = extractPaid(last);
    const paymentStatus = extractPaymentStatus(last);

    return NextResponse.json({
      ok: true,
      report: last
        ? {
            id: last.id,
            status: last.status,
            createdAt: last.createdAt.toISOString(),
            errorCode: last.errorCode,
            errorText: last.errorText,
            input: last.input,
          }
        : null,
      text: hasText ? String(last!.text) : '',
      hasText,
      paid,
      paymentStatus,
    });
  } catch (e: any) {
    console.error('[ASTRO_GET_ERROR]', e);
    return NextResponse.json(
      { ok: false, error: 'GET_FAILED', hint: String(e?.message || 'See server logs') },
      { status: 500 }
    );
  }
}
