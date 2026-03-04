/* path: app/api/yookassa/get-payment/route.ts */
import { NextResponse } from 'next/server';
import { basicAuthHeader } from '@/lib/yookassa';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const paymentId = String(searchParams.get('paymentId') ?? '').trim();
    if (!paymentId) return NextResponse.json({ ok: false, error: 'NO_PAYMENT_ID' }, { status: 400 });

    const r = await fetch(`https://api.yookassa.ru/v3/payments/${encodeURIComponent(paymentId)}`, {
      method: 'GET',
      headers: {
        Authorization: basicAuthHeader(),
        'Content-Type': 'application/json',
      },
    });

    const data = await r.json();
    if (!r.ok) return NextResponse.json({ ok: false, error: 'YOOKASSA_ERROR', details: data }, { status: 400 });

    return NextResponse.json({
      ok: true,
      id: data?.id ?? null,
      status: data?.status ?? null,
      paid: data?.paid ?? null,
      amount: data?.amount ?? null,
      metadata: data?.metadata ?? null,
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: 'GET_PAYMENT_FAILED', hint: String(e?.message ?? e) }, { status: 500 });
  }
}
