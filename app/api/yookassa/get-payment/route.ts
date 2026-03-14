/* path: app/api/yookassa/get-payment/route.ts */
import { NextResponse } from 'next/server';

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

    return NextResponse.json({
      ok: true,
      id: (data as any)?.id ?? null,
      status: (data as any)?.status ?? null,
      paid: (data as any)?.paid ?? null,
      amount: (data as any)?.amount ?? null,
      metadata: (data as any)?.metadata ?? null,
    });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: 'GET_PAYMENT_FAILED', hint: String(e?.message ?? e) },
      { status: 500 }
    );
  }
}
