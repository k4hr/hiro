/* path: app/api/yookassa/webhook/route.ts */
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function checkSecret(url: string): boolean {
  const want = String(process.env.YOOKASSA_WEBHOOK_SECRET ?? '').trim();
  if (!want) return false;
  try {
    const u = new URL(url);
    return u.searchParams.get('secret') === want;
  } catch {
    return false;
  }
}

export async function POST(req: Request) {
  try {
    if (!checkSecret(req.url)) {
      return NextResponse.json({ ok: false, error: 'FORBIDDEN' }, { status: 403 });
    }

    const event = await req.json().catch(() => null);
    if (!event) return NextResponse.json({ ok: false, error: 'BAD_JSON' }, { status: 400 });

    const kind = String(event?.event ?? '');
    const obj = event?.object ?? null;

    const paymentId = String(obj?.id ?? '');
    const status = String(obj?.status ?? '');
    const meta = obj?.metadata ?? {};
    const reportId = String(meta?.reportId ?? '');

    console.log('[YOOKASSA_WEBHOOK]', { kind, paymentId, status, reportId });

    if (!reportId) {
      // без reportId нам некуда прикрепить событие — но отвечаем 200, чтобы ЮKassa не долбила
      return NextResponse.json({ ok: true });
    }

    const report = await prisma.report.findUnique({
      where: { id: reportId },
      select: { id: true, pricingJson: true },
    });

    if (!report) return NextResponse.json({ ok: true });

    const prev = (report.pricingJson && typeof report.pricingJson === 'object') ? (report.pricingJson as any) : {};

    const nextPricing = {
      ...prev,
      yookassa: {
        ...(prev?.yookassa ?? {}),
        paymentId: paymentId || prev?.yookassa?.paymentId || null,
        status: status || prev?.yookassa?.status || null,
        lastEvent: kind || null,
        updatedAt: new Date().toISOString(),
      },
    };

    if (kind === 'payment.succeeded') {
      (nextPricing as any).yookassa.paidAt = new Date().toISOString();
    }

    await prisma.report.update({
      where: { id: report.id },
      data: { pricingJson: nextPricing },
    });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.log('[YOOKASSA_WEBHOOK_ERROR]', String(e?.message ?? e));
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
