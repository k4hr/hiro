/* path: app/api/telegram/webhook/route.ts */
import { NextResponse } from 'next/server';
import { createTelegramBot } from '@/lib/telegram-bot';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

let botInstance: ReturnType<typeof createTelegramBot> | null = null;

function getBot() {
  if (!botInstance) {
    botInstance = createTelegramBot();
  }
  return botInstance;
}

export async function POST(req: Request) {
  try {
    const bot = getBot();
    const update = await req.json();

    await bot.handleUpdate(update);

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error('[TELEGRAM_WEBHOOK_ERROR]', e);
    return NextResponse.json(
      {
        ok: false,
        error: String(e?.message || 'WEBHOOK_ERROR'),
      },
      { status: 500 }
    );
  }
}
