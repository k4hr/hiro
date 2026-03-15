import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function getRuProxyBase() {
  return String(process.env.YOOKASSA_RU_PROXY_BASE || '')
    .trim()
    .replace(/\/+$/, '');
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

export async function GET(req: Request) {
  try {
    const proxyBase = getRuProxyBase();
    if (!proxyBase) {
      return NextResponse.json(
        { ok: false, error: 'YOOKASSA_RU_PROXY_BASE_MISSING' },
        { status: 500 }
      );
    }

    const { searchParams } = new URL(req.url);
    const paymentId = String(searchParams.get('paymentId') ?? '').trim();
    if (!paymentId) {
      return NextResponse.json({ ok: false, error: 'NO_PAYMENT_ID' }, { status: 400 });
    }

    const r = await fetch(`${proxyBase}/get-payment?paymentId=${encodeURIComponent(paymentId)}`, {
      method: 'GET',
      cache: 'no-store',
    });

    const data = await readJsonSafe(r);

    if (!r.ok || !(data as any)?.ok) {
      return NextResponse.json(
        {
          ok: false,
          error: 'YOOKASSA_PROXY_ERROR',
          details: data,
        },
        { status: 400 }
      );
    }

    const remotePaymentId = String((data as any)?.id ?? paymentId).trim();
    const status = String((data as any)?.status ?? '').trim();
    const paid = Boolean((data as any)?.paid);
    const amount = (data as any)?.amount ?? null;
    const metadata = (data as any)?.metadata ?? null;

    const rep = await prisma.report.findFirst({
      where: {
        pricingJson: {
          path: ['yookassa', 'paymentId'],
          equals: remotePaymentId,
        } as any,
      },
      select: {
        id: true,
        pricingJson: true,
      },
    }).catch(() => null);

    if (rep) {
      const prev =
        rep.pricingJson && typeof rep.pricingJson === 'object'
          ? (rep.pricingJson as any)
          : {};

      const nextPricing = {
        ...prev,
        yookassa: {
          ...(prev?.yookassa ?? {}),
          paymentId: remotePaymentId,
          status: status || prev?.yookassa?.status || null,
          syncedAt: new Date().toISOString(),
          amount: amount ?? prev?.yookassa?.amount ?? null,
          metadata: metadata ?? prev?.yookassa?.metadata ?? null,
        },
      };

      if (paid || String(status).toLowerCase() === 'succeeded') {
        (nextPricing as any).yookassa.paidAt =
          prev?.yookassa?.paidAt || new Date().toISOString();
      }

      await prisma.report.update({
        where: { id: rep.id },
        data: { pricingJson: nextPricing },
      });
    }

    return NextResponse.json({
      ok: true,
      id: remotePaymentId,
      status,
      paid,
      amount,
      metadata,
    });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: 'GET_PAYMENT_FAILED', hint: String(e?.message ?? e) },
      { status: 500 }
    );
  }
}
