/* path: app/api/yookassa/create-payment/route.ts */
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { makeIdempotenceKey } from '@/lib/yookassa';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Body = {
  reportId: string;
  description?: string;
  returnPath?: string;
};

function getOrigin(req: Request) {
  const h = req.headers;

  const xfProto = (h.get('x-forwarded-proto') || '').trim();
  const xfHost = (h.get('x-forwarded-host') || '').trim();
  const host = (h.get('host') || '').trim();

  const proto = xfProto || 'https';
  const usedHost = xfHost || host;

  if (!usedHost) return '';

  return `${proto}://${usedHost}`;
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

export async function POST(req: Request) {
  try {
    const proxyBase = getRuProxyBase();
    if (!proxyBase) {
      console.log('[YOOKASSA_CREATE_PAYMENT] missing YOOKASSA_RU_PROXY_BASE');
      return NextResponse.json(
        { ok: false, error: 'YOOKASSA_RU_PROXY_BASE_MISSING' },
        { status: 500 }
      );
    }

    const receiptEmail = getReceiptEmail();
    if (!receiptEmail) {
      console.log('[YOOKASSA_CREATE_PAYMENT] missing YOOKASSA_RECEIPT_EMAIL');
      return NextResponse.json(
        { ok: false, error: 'YOOKASSA_RECEIPT_EMAIL_MISSING' },
        { status: 500 }
      );
    }

    const body = (await req.json().catch(() => null)) as Body | null;
    if (!body) {
      return NextResponse.json({ ok: false, error: 'BAD_JSON' }, { status: 400 });
    }

    const reportId = String(body.reportId ?? '').trim();
    if (!reportId) {
      return NextResponse.json({ ok: false, error: 'NO_REPORT_ID' }, { status: 400 });
    }

    const report = await prisma.report.findUnique({
      where: { id: reportId },
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

    const origin = getOrigin(req);
    if (!origin) {
      console.log('[YOOKASSA_CREATE_PAYMENT] no origin', {
        host: req.headers.get('host'),
        xForwardedHost: req.headers.get('x-forwarded-host'),
        xForwardedProto: req.headers.get('x-forwarded-proto'),
      });

      return NextResponse.json({ ok: false, error: 'NO_ORIGIN' }, { status: 500 });
    }

    const returnPath = String(body.returnPath ?? '').trim();
    const safeReturnPath = returnPath.startsWith('/') ? returnPath : '/';
    const returnUrl = `${origin}${safeReturnPath}`;

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

    console.log('[YOOKASSA_CREATE_PAYMENT_PROXY_REQUEST]', {
      proxyUrl: `${proxyBase}/create-payment`,
      reportId: report.id,
      totalRub,
      returnUrl,
      description,
      receiptEmail,
    });

    const r = await fetch(`${proxyBase}/create-payment`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      cache: 'no-store',
    });

    const data = await readJsonSafe(r);

    console.log('[YOOKASSA_CREATE_PAYMENT_PROXY_RESPONSE]', {
      status: r.status,
      ok: r.ok,
      data,
    });

    if (!r.ok || !(data as any)?.ok) {
      console.log('[YOOKASSA_CREATE_PAYMENT_PROXY_ERROR_DETAILS]', data);

      return NextResponse.json(
        {
          ok: false,
          error: 'YOOKASSA_PROXY_ERROR',
          status: r.status,
          details: data,
          proxyError: (data as any)?.error ?? null,
          proxyRaw: (data as any)?.raw ?? null,
        },
        { status: 400 }
      );
    }

    const paymentId = String((data as any)?.paymentId ?? '').trim();
    const confirmationUrl = String((data as any)?.confirmationUrl ?? '').trim();
    const paymentStatus = String((data as any)?.status ?? 'pending').trim();

    if (!paymentId) {
      return NextResponse.json(
        {
          ok: false,
          error: 'NO_PAYMENT_ID',
          details: data,
        },
        { status: 500 }
      );
    }

    if (!confirmationUrl) {
      return NextResponse.json(
        {
          ok: false,
          error: 'NO_CONFIRMATION_URL',
          details: data,
        },
        { status: 500 }
      );
    }

    try {
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
    } catch (e: any) {
      console.log('[YOOKASSA_CREATE_PAYMENT_PRICINGJSON_UPDATE_ERROR]', String(e?.message ?? e));
    }

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
    console.log('[YOOKASSA_CREATE_PAYMENT_FATAL]', String(e?.message ?? e));

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
