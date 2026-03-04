/* path: app/api/yookassa/create-payment/route.ts */
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { basicAuthHeader, makeIdempotenceKey, ykReturnUrl } from '@/lib/yookassa';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Body = {
  reportId: string;
  description?: string;
};

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => null)) as Body | null;
    if (!body) return NextResponse.json({ ok: false, error: 'BAD_JSON' }, { status: 400 });

    const reportId = String(body.reportId ?? '').trim();
    if (!reportId) return NextResponse.json({ ok: false, error: 'NO_REPORT_ID' }, { status: 400 });

    const report = await prisma.report.findUnique({
      where: { id: reportId },
      select: { id: true, userId: true, type: true, totalRub: true, pricingJson: true },
    });

    if (!report) return NextResponse.json({ ok: false, error: 'REPORT_NOT_FOUND' }, { status: 404 });

    const totalRub = Number(report.totalRub ?? 0);
    if (!Number.isFinite(totalRub) || totalRub <= 0) {
      return NextResponse.json({ ok: false, error: 'REPORT_TOTAL_RUB_INVALID' }, { status: 400 });
    }

    const description = String(body.description ?? `Оплата отчёта ${report.type}`).slice(0, 128);

    const payload = {
      amount: { value: totalRub.toFixed(2), currency: 'RUB' },
      confirmation: { type: 'redirect', return_url: ykReturnUrl },
      capture: true,
      description,
      metadata: {
        reportId: report.id,
        userId: report.userId,
        reportType: report.type,
      },
    };

    const r = await fetch('https://api.yookassa.ru/v3/payments', {
      method: 'POST',
      headers: {
        Authorization: basicAuthHeader(),
        'Content-Type': 'application/json',
        'Idempotence-Key': makeIdempotenceKey('yk'),
      },
      body: JSON.stringify(payload),
    });

    const data = await r.json();

    if (!r.ok) {
      return NextResponse.json({ ok: false, error: 'YOOKASSA_ERROR', details: data }, { status: 400 });
    }

    const paymentId = String(data?.id ?? '');
    const confirmationUrl = String(data?.confirmation?.confirmation_url ?? '');

    // сохраняем след в pricingJson (не критично, но полезно для дебага/статуса)
    try {
      const prev = (report.pricingJson && typeof report.pricingJson === 'object') ? (report.pricingJson as any) : {};
      await prisma.report.update({
        where: { id: report.id },
        data: {
          pricingJson: {
            ...prev,
            yookassa: {
              ...(prev?.yookassa ?? {}),
              paymentId,
              status: String(data?.status ?? 'pending'),
              createdAt: new Date().toISOString(),
              amount: data?.amount ?? null,
            },
          },
        },
      });
    } catch {}

    return NextResponse.json({ ok: true, reportId: report.id, paymentId, confirmationUrl });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: 'CREATE_PAYMENT_FAILED', hint: String(e?.message ?? e) }, { status: 500 });
  }
}
