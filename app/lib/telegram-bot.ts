/* path: lib/telegram-bot.ts */
import { Telegraf, Markup } from 'telegraf';

function env(name: string) {
  return String(process.env[name] ?? '').trim();
}

function getBotToken() {
  return env('TELEGRAM_BOT_TOKEN');
}

function getMiniAppUrl() {
  return (
    env('TELEGRAM_MINI_APP_URL') ||
    env('NEXT_PUBLIC_APP_URL') ||
    env('APP_PUBLIC_URL')
  );
}

function getStartText() {
  return [
    '✨ Добро пожаловать',
    '',
    'Здесь вы можете получить персональные разборы о себе сразу по нескольким направлениям:',
    '',
    '✋🏻 Хиромантия — разбор по линиям ладони',
    '🔢 Нумерология — расшифровка ваших чисел',
    '🌌 Натальная карта — разбор вашей карты неба',
    '',
    'Иногда одна деталь в ладони, числе или дате рождения говорит о человеке больше, чем длинные объяснения.',
    '',
    'Если хотите узнать свои сильные стороны, скрытые черты, жизненные уроки, темы любви, денег и пути — открывайте приложение 👇',
  ].join('\n');
}

export function createTelegramBot() {
  const BOT_TOKEN = getBotToken();
  const MINI_APP_URL = getMiniAppUrl();

  if (!BOT_TOKEN) {
    throw new Error('TELEGRAM_BOT_TOKEN is missing');
  }

  if (!MINI_APP_URL) {
    throw new Error('TELEGRAM_MINI_APP_URL or NEXT_PUBLIC_APP_URL or APP_PUBLIC_URL is missing');
  }

  const bot = new Telegraf(BOT_TOKEN);

  bot.start(async (ctx) => {
    await ctx.reply(
      getStartText(),
      Markup.inlineKeyboard([
        [Markup.button.webApp('✨ Открыть приложение', MINI_APP_URL)],
      ])
    );
  });

  return bot;
}
