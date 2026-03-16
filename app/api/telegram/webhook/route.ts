import { NextResponse } from 'next/server';
import { bot } from '@/lib/telegram-bot';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

let isBotInitialized = false;

async function ensureBotInitialized() {
  if (isBotInitialized) return;
  isBotInitialized = true;
}

export async function POST(req: Request) {
  try {
    await ensureBotInitialized();

    const update = await req.json();
    await bot.handleUpdate(update);

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error('[TELEGRAM_WEBHOOK_ERROR]', e);
    return NextResponse.json(
      { ok: false, error: String(e?.message || 'WEBHOOK_ERROR') },
      { status: 500 }
    );
  }
}
