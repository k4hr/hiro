/* path: app/api/yookassa/create-payment/route.ts */
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { basicAuthHeader, getYookassaConfig, makeIdempotenceKey } from '@/lib/yookassa';

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

async function readJsonSafe(res: Response) {
  const text = await res.text().catch(() => '');
  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch {
    return {
      _raw: text,
    };
  }
}

export async function POST(req: Request) {
  try {
    const cfg = getYookassaConfig();
    if (!cfg) {
      console.log('[YOOKASSA_CREATE_PAYMENT] missing config');
      return NextResponse.json({ ok: false, error: 'YOOKASSA_ENV_MISSING' }, { status: 500 });
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
    };

    console.log('[YOOKASSA_CREATE_PAYMENT_REQUEST]', {
      reportId: report.id,
      totalRub,
      returnUrl,
      description,
    });

    const r = await fetch('https://api.yookassa.ru/v3/payments', {
      method: 'POST',
      headers: {
        Authorization: basicAuthHeader(cfg),
        'Content-Type': 'application/json',
        'Idempotence-Key': makeIdempotenceKey('yk'),
      },
      body: JSON.stringify(payload),
    });

    const data = await readJsonSafe(r);

    console.log('[YOOKASSA_CREATE_PAYMENT_RESPONSE]', {
      status: r.status,
      ok: r.ok,
      data,
    });

    if (!r.ok) {
      return NextResponse.json(
        {
          ok: false,
          error: 'YOOKASSA_ERROR',
          status: r.status,
          details: data,
        },
        { status: 400 }
      );
    }

    const paymentId = String((data as any)?.id ?? '').trim();
    const confirmationUrl = String((data as any)?.confirmation?.confirmation_url ?? '').trim();

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
              status: String((data as any)?.status ?? 'pending'),
              returnUrl,
              createdAt: new Date().toISOString(),
              amount: (data as any)?.amount ?? null,
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
      confirmationUrl,
      returnUrl,
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
