/* path: app/api/yookassa/create-payment/route.ts */
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { basicAuthHeader, getYookassaConfig, makeIdempotenceKey } from '@/lib/yookassa';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Body = { reportId: string; description?: string };

export async function POST(req: Request) {
  try {
    const cfg = getYookassaConfig();
    if (!cfg) {
      console.log('[create-payment] missing env', {
        hasShopId: Boolean(process.env.YOOKASSA_SHOP_ID),
        hasSecret: Boolean(process.env.YOOKASSA_SECRET_KEY),
        hasReturn: Boolean(process.env.YOOKASSA_RETURN_URL),
      });
      return NextResponse.json({ ok: false, error: 'YOOKASSA_ENV_MISSING' }, { status: 500 });
    }

    const body = (await req.json().catch(() => null)) as Body | null;
    if (!body) return NextResponse.json({ ok: false, error: 'BAD_JSON' }, { status: 400 });

    const reportId = String(body.reportId ?? '').trim();
    if (!reportId) return NextResponse.json({ ok: false, error: 'NO_REPORT_ID' }, { status: 400 });

    const report = await prisma.report.findUnique({
      where: { id: reportId },
      select: { id: true, userId: true, type: true, totalRub: true },
    });

    if (!report) return NextResponse.json({ ok: false, error: 'REPORT_NOT_FOUND' }, { status: 404 });

    const totalRub = Number(report.totalRub ?? 0);
    if (!Number.isFinite(totalRub) || totalRub <= 0) {
      console.log('[create-payment] bad totalRub', { reportId, totalRub });
      return NextResponse.json({ ok: false, error: 'REPORT_TOTAL_RUB_INVALID', totalRub }, { status: 400 });
    }

    const description = String(body.description ?? `Оплата отчёта ${report.type}`).slice(0, 128);

    const payload = {
      amount: { value: totalRub.toFixed(2), currency: 'RUB' },
      confirmation: { type: 'redirect', return_url: cfg.returnUrl },
      capture: true,
      description,
      metadata: { reportId: report.id, userId: report.userId, reportType: report.type },
    };

    const r = await fetch('https://api.yookassa.ru/v3/payments', {
      method: 'POST',
      headers: {
        Authorization: basicAuthHeader(cfg),
        'Content-Type': 'application/json',
        'Idempotence-Key': makeIdempotenceKey('yk'),
      },
      body: JSON.stringify(payload),
    });

    const data = await r.json();

    if (!r.ok) {
      console.log('[create-payment] yookassa error', data);
      return NextResponse.json({ ok: false, error: 'YOOKASSA_ERROR', details: data }, { status: 400 });
    }

    const paymentId = String(data?.id ?? '');
    const confirmationUrl = String(data?.confirmation?.confirmation_url ?? '');

    if (!confirmationUrl) {
      console.log('[create-payment] no confirmationUrl', data);
      return NextResponse.json({ ok: false, error: 'NO_CONFIRMATION_URL' }, { status: 500 });
    }

    return NextResponse.json({ ok: true, reportId: report.id, paymentId, confirmationUrl });
  } catch (e: any) {
    console.log('[create-payment] crash', e);
    return NextResponse.json({ ok: false, error: 'CREATE_PAYMENT_FAILED', hint: String(e?.message ?? e) }, { status: 500 });
  }
}
