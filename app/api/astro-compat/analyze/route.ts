import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type TgUser = {
  id: string;
  username: string | null;
  first_name: string | null;
  last_name: string | null;
};

type OptionKey =
  | 'ACOMPAT_LOVE'
  | 'ACOMPAT_SEX'
  | 'ACOMPAT_MONEY'
  | 'ACOMPAT_CONFLICT'
  | 'ACOMPAT_FAMILY'
  | 'ACOMPAT_FORMULA';

function envClean(name: string) {
  return String(process.env[name] ?? '').replace(/[\r\n]/g, '').trim();
}

function timingSafeEqualHex(a: string, b: string) {
  try {
    const ab = Buffer.from(a, 'hex');
    const bb = Buffer.from(b, 'hex');
    if (ab.length !== bb.length) return false;
    return crypto.timingSafeEqual(ab, bb);
  } catch {
    return false;
  }
}

function verifyTelegramWebAppInitData(initData: string, botToken: string, maxAgeSec = 60 * 60 * 24) {
  const params = new URLSearchParams(initData);
  const hash = params.get('hash');
  if (!hash) return { ok: false as const, error: 'NO_HASH' as const };

  const authDateStr = params.get('auth_date');
  if (!authDateStr) return { ok: false as const, error: 'NO_AUTH_DATE' as const };

  const authDate = Number(authDateStr);
  if (!Number.isFinite(authDate)) return { ok: false as const, error: 'BAD_AUTH_DATE' as const };

  const nowSec = Math.floor(Date.now() / 1000);
  if (authDate > nowSec + 60) return { ok: false as const, error: 'AUTH_DATE_IN_FUTURE' as const };
  if (nowSec - authDate > maxAgeSec) return { ok: false as const, error: 'INITDATA_EXPIRED' as const };

  params.delete('hash');

  const dataCheckString = [...params.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join('\n');

  const secretKey = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest();
  const computedHash = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');

  if (!timingSafeEqualHex(computedHash, hash)) return { ok: false as const, error: 'BAD_HASH' as const };

  const userStr = params.get('user');
  if (!userStr) return { ok: false as const, error: 'NO_USER' as const };

  let userJson: any;
  try {
    userJson = JSON.parse(userStr);
  } catch {
    return { ok: false as const, error: 'BAD_USER_JSON' as const };
  }

  if (!userJson?.id) return { ok: false as const, error: 'NO_USER_ID' as const };

  const user: TgUser = {
    id: String(userJson.id),
    username: userJson.username ? String(userJson.username) : null,
    first_name: userJson.first_name ? String(userJson.first_name) : null,
    last_name: userJson.last_name ? String(userJson.last_name) : null,
  };

  return { ok: true as const, user };
}

function parseDobToUtcDate(dob: string): Date | null {
  if (!/^\d{2}\.\d{2}\.\d{4}$/.test(dob)) return null;
  const [dd, mm, yyyy] = dob.split('.');
  const iso = `${yyyy}-${mm}-${dd}T00:00:00.000Z`;
  const dt = new Date(iso);
  if (!Number.isFinite(dt.getTime())) return null;
  return dt;
}

function cleanText(v: any, max = 96): string {
  return String(v ?? '').replace(/\s+/g, ' ').trim().slice(0, max);
}

function cleanTime(v: any): string {
  return String(v ?? '').replace(/\s+/g, '').trim().slice(0, 5);
}

function safeNum(v: any): number | null {
  if (v === null || v === undefined) return null;
  const n = Number(v);
  if (!Number.isFinite(n)) return null;
  return n;
}

function normalizeAccuracy(v: any): number | null {
  const n = safeNum(v);
  if (n === null) return null;
  const x = Math.floor(n);
  if (x < 1) return 1;
  if (x > 3) return 3;
  return x;
}

function optionTitle(k: OptionKey) {
  switch (k) {
    case 'ACOMPAT_LOVE':
      return 'Любовь и близость';
    case 'ACOMPAT_SEX':
      return 'Секс и страсть';
    case 'ACOMPAT_MONEY':
      return 'Деньги и ресурсы';
    case 'ACOMPAT_CONFLICT':
      return 'Конфликты и примирение';
    case 'ACOMPAT_FAMILY':
      return 'Быт и семья';
    case 'ACOMPAT_FORMULA':
      return 'Итог: формула пары (фраза + 7 правил)';
    default:
      return String(k);
  }
}

function normalizeSelected(v: any): Record<OptionKey, boolean> {
  const src = v && typeof v === 'object' ? v : {};
  return {
    ACOMPAT_LOVE: src.ACOMPAT_LOVE === true,
    ACOMPAT_SEX: src.ACOMPAT_SEX === true,
    ACOMPAT_MONEY: src.ACOMPAT_MONEY === true,
    ACOMPAT_CONFLICT: src.ACOMPAT_CONFLICT === true,
    ACOMPAT_FAMILY: src.ACOMPAT_FAMILY === true,
    ACOMPAT_FORMULA: true,
  };
}

function pickSelected(selected: Record<string, any> | null | undefined): OptionKey[] {
  const paid: OptionKey[] = ['ACOMPAT_LOVE', 'ACOMPAT_SEX', 'ACOMPAT_MONEY', 'ACOMPAT_CONFLICT', 'ACOMPAT_FAMILY'];
  const out: OptionKey[] = [];

  if (selected && typeof selected === 'object') {
    for (const k of paid) {
      if ((selected as any)[k] === true) out.push(k);
    }
  }

  out.push('ACOMPAT_FORMULA');
  return out;
}

function computeAccuracyLevel(args: { birthPlace: string; birthTime: string; accuracyLevel: number | null }) {
  const hasPlace = Boolean(args.birthPlace && args.birthPlace.trim().length >= 3);
  const hasTime = Boolean(args.birthTime && /^\d{2}:\d{2}$/.test(args.birthTime.trim()));
  const lvl =
    typeof args.accuracyLevel === 'number' && Number.isFinite(args.accuracyLevel) && args.accuracyLevel > 0
      ? Math.max(1, Math.min(3, Math.floor(args.accuracyLevel)))
      : hasPlace && hasTime
        ? 3
        : hasPlace
          ? 2
          : 1;

  return { lvl, hasPlace, hasTime };
}

function accuracyPolicyText(acc: { lvl: number }) {
  if (acc.lvl >= 3) {
    return [
      'ТОЧНОСТЬ 3/3: дата, место и время есть.',
      'Можно использовать оси и дома как тематический каркас совместимости.',
      'Запрещено выдавать конкретные градусы, аспекты и планеты-в-домах как установленный факт.',
      'Говори через темы осей и домов: партнёрство, быт, деньги, близость, статус, семья.',
    ].join(' ');
  }
  if (acc.lvl === 2) {
    return [
      'ТОЧНОСТЬ 2/3: есть дата и место, времени нет.',
      'Асцендент и дома не фиксируй как точные.',
      'Используй темы домов как универсальный каркас, а не как будто карта посчитана до минуты.',
    ].join(' ');
  }
  return [
    'ТОЧНОСТЬ 1/3: есть только дата.',
    'Без конкретизации домов и асцендента как факта.',
    'Используй универсальные темы совместимости и психологическую динамику пары.',
  ].join(' ');
}

function buildPrompt(args: {
  a: { dob: string; age: number | null; birthPlace: string; birthTime: string; accuracyLevel: number | null };
  b: { dob: string; age: number | null; birthPlace: string; birthTime: string; accuracyLevel: number | null };
  selectedList: OptionKey[];
}) {
  const selectedTitles = args.selectedList.map((k) => optionTitle(k)).join('\n');

  const accA = computeAccuracyLevel({ birthPlace: args.a.birthPlace, birthTime: args.a.birthTime, accuracyLevel: args.a.accuracyLevel });
  const accB = computeAccuracyLevel({ birthPlace: args.b.birthPlace, birthTime: args.b.birthTime, accuracyLevel: args.b.accuracyLevel });

  const ageA = Number.isFinite(args.a.age as any) && args.a.age !== null ? String(args.a.age) : '';
  const ageB = Number.isFinite(args.b.age as any) && args.b.age !== null ? String(args.b.age) : '';

  const weightLines = [
    'ШКАЛА ОЦЕНКИ:',
    'Оцени 5 категорий по 0–20 баллов целыми числами: Любовь, Секс, Деньги, Конфликты, Быт.',
    'Сумма даёт итог 0–100.',
    'Даже если какой-то пункт не выбран, кратко оцени его и дай баллы, но подробно расписывай только выбранные пункты.',
  ].join('\n');

  return [
    'Ты — сильный эксперт по астрологии и совместимости пары.',
    'Сделай подробный и структурный разбор.',
    '',
    'КРИТИЧЕСКИЕ ПРАВИЛА:',
    '1) Не используй markdown.',
    '2) Не используй символы ##, **, *, _, `, >.',
    '3) Не используй списки с тире.',
    '4) Не делай вступление. Начинай сразу с пункта 1).',
    '5) Не задавай пользователю вопросов.',
    '6) Не лей воду.',
    '7) Не выдумывай конкретные градусы, аспекты и планеты-в-домах как установленный факт.',
    '8) Используй дома и оси как тематический каркас совместимости.',
    '9) Не пиши медицинские диагнозы и не запугивай.',
    '',
    'ДАННЫЕ:',
    `Человек A: дата=${args.a.dob}, возраст=${ageA}, место=${args.a.birthPlace || 'не указано'}, время=${args.a.birthTime || 'не указано'}`,
    `Политика точности A: ${accuracyPolicyText(accA)}`,
    `Человек B: дата=${args.b.dob}, возраст=${ageB}, место=${args.b.birthPlace || 'не указано'}, время=${args.b.birthTime || 'не указано'}`,
    `Политика точности B: ${accuracyPolicyText(accB)}`,
    '',
    weightLines,
    '',
    'ФОРМАТ ОТВЕТА СТРОГО:',
    '1) Первая строка: “1) Совместимость: NN%”.',
    '2) Вторая строка: “Баллы: Любовь NN/20 · Секс NN/20 · Деньги NN/20 · Конфликты NN/20 · Быт NN/20”.',
    '3) Затем строка: “Короткий вердикт:” и после неё 3 короткие строки.',
    '4) Далее пункты 2), 3), 4) и так далее, строго по порядку выбранных пунктов.',
    '',
    'ДЛЯ КАЖДОГО ВЫБРАННОГО ПУНКТА, КРОМЕ ФИНАЛЬНОГО, СТРУКТУРА СТРОГО ТАКАЯ:',
    'А) Каркас домов и осей:',
    'Б) Что видно по паре:',
    'В) Значение:',
    'Г) Триггеры и риск-сценарии:',
    'Д) Практика (5 правил):',
    '',
    'ТРЕБОВАНИЯ К БЛОКАМ:',
    'А) Каркас домов и осей: 10–14 строк. Используй форматы “Ось 1–7: …”, “Ось 2–8: …”, “Ось 4–10: …”, “Ось 5–11: …”, “Ось 6–12: …”, затем темы домов 4, 5, 7, 8, 10, 2.',
    'Б) Что видно по паре: 10–18 тезисов.',
    'В) Значение: 10–18 выводов про динамику, доверие, власть, решения, эмоциональную близость и устойчивость.',
    'Г) Триггеры и риск-сценарии: 5–8 сценариев в формате “когда X → вы делаете Y → итог Z”.',
    'Д) Практика: ровно 5 правил, каждое с новой строки, каждое начинается с глагола действия.',
    '',
    'ФИНАЛЬНЫЙ ПУНКТ “Итог: формула пары (фраза + 7 правил)” ВСЕГДА ПОСЛЕДНИЙ И ИМЕЕТ СТРУКТУРУ:',
    'А) “Эта пара про …”',
    'Б) “Сильная сторона: …”',
    'В) “Слабая сторона: …”',
    'Г) “7 правил пары:” и затем ровно 7 правил с новой строки в формате 1) 2) 3).',
    '',
    'СПЕЦИФИКА:',
    'Любовь и близость: романтика, эмоциональная безопасность, стиль заботы, включённость в связь.',
    'Секс и страсть: влечение, ревность, власть, границы, интенсивность, уязвимость.',
    'Деньги и ресурсы: ценность, контроль, траты, стратегия, общий бюджет, риски.',
    'Конфликты и примирение: триггеры, эскалация, способы деэскалации, восстановление контакта.',
    'Быт и семья: дом, рутина, распределение нагрузки, устойчивость долгого формата.',
    '',
    'СПИСОК ПУНКТОВ ДЛЯ РАЗБОРА:',
    selectedTitles,
    '',
    'Начинай строго с “1) Совместимость:”.',
  ].join('\n');
}

async function callOpenAI(args: { apiKey: string; prompt: string }) {
  const res = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${args.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-5.2',
      reasoning: { effort: 'high' },
      input: [
        {
          role: 'user',
          content: [{ type: 'input_text', text: args.prompt }],
        },
      ],
    }),
  });

  const j = (await res.json().catch(() => null)) as any;
  if (!res.ok || !j) {
    const msg =
      (j?.error?.message ? String(j.error.message) : '') ||
      (j?.error ? JSON.stringify(j.error) : '') ||
      `OPENAI_FAILED(${res.status})`;
    return { ok: false as const, error: msg, raw: j };
  }

  let outText = '';
  if (typeof j.output_text === 'string' && j.output_text.trim()) {
    outText = j.output_text.trim();
  } else if (Array.isArray(j.output)) {
    for (const item of j.output) {
      if (item?.type === 'message' && Array.isArray(item.content)) {
        for (const c of item.content) {
          if (c?.type === 'output_text' && typeof c.text === 'string') {
            outText += c.text;
          }
        }
      }
    }
    outText = outText.trim();
  }

  if (!outText) return { ok: false as const, error: 'EMPTY_MODEL_OUTPUT', raw: j };
  return { ok: true as const, text: outText, raw: j };
}

function sameSelectedList(a: any, b: any): boolean {
  try {
    const aa = Array.isArray(a) ? a.map(String) : [];
    const bb = Array.isArray(b) ? b.map(String) : [];
    return JSON.stringify(aa) === JSON.stringify(bb);
  } catch {
    return false;
  }
}

function lc(v: any) {
  return String(v ?? '').trim().toLowerCase();
}

function isPaidByPricing(pricingJson: any): boolean {
  const candidates = [
    pricingJson?.yookassa?.status,
    pricingJson?.payment?.status,
    pricingJson?.paymentStatus,
    pricingJson?.status,
  ]
    .map((x) => lc(x))
    .filter(Boolean);

  return candidates.some((s) => ['succeeded', 'paid', 'success', 'captured', 'waiting_for_capture', 'authorized'].includes(s));
}

export async function POST(req: Request) {
  let reportId: string | null = null;

  try {
    const apiKey = envClean('OPENAI_API_KEY');
    if (!apiKey) {
      return NextResponse.json({ ok: false, error: 'NO_OPENAI_API_KEY' }, { status: 500 });
    }

    const botToken = envClean('TELEGRAM_BOT_TOKEN');
    if (!botToken) {
      return NextResponse.json({ ok: false, error: 'NO_BOT_TOKEN' }, { status: 500 });
    }

    const body = (await req.json().catch(() => null)) as any;
    if (!body) {
      return NextResponse.json({ ok: false, error: 'BAD_JSON' }, { status: 400 });
    }

    const initData = String(body.initData || '').trim();
    reportId = String(body.reportId || '').trim() || null;

    const a = body.a && typeof body.a === 'object' ? body.a : null;
    const b = body.b && typeof body.b === 'object' ? body.b : null;

    const dob1 = String(a?.dob || '').trim();
    const dob2 = String(b?.dob || '').trim();

    const age1 = safeNum(a?.age);
    const age2 = safeNum(b?.age);

    const place1 = cleanText(a?.birthPlace, 96);
    const place2 = cleanText(b?.birthPlace, 96);

    const time1 = cleanTime(a?.birthTime);
    const time2 = cleanTime(b?.birthTime);

    const acc1 = normalizeAccuracy(a?.accuracyLevel);
    const acc2 = normalizeAccuracy(b?.accuracyLevel);

    const selectedFromReq = normalizeSelected(body.selected);

    if (!initData) return NextResponse.json({ ok: false, error: 'NO_INIT_DATA' }, { status: 401 });
    if (!dob1 || !dob2) return NextResponse.json({ ok: false, error: 'NO_DOB' }, { status: 400 });

    const d1 = parseDobToUtcDate(dob1);
    const d2 = parseDobToUtcDate(dob2);
    if (!d1 || !d2) return NextResponse.json({ ok: false, error: 'BAD_DOB' }, { status: 400 });

    const v = verifyTelegramWebAppInitData(initData, botToken);
    if (!v.ok) return NextResponse.json({ ok: false, error: v.error }, { status: 401 });

    const user = await prisma.user.findUnique({
      where: { telegramId: v.user.id },
      select: { id: true },
    });
    if (!user) {
      return NextResponse.json({ ok: false, error: 'NO_USER' }, { status: 404 });
    }

    let currentReport: any = null;

    if (reportId) {
      currentReport = await prisma.report.findFirst({
        where: {
          id: reportId,
          userId: user.id,
          type: 'ASTRO',
          astroMode: 'COMPAT',
        },
        select: {
          id: true,
          status: true,
          text: true,
          input: true,
          pricingJson: true,
          errorCode: true,
          errorText: true,
          json: true,
        },
      });

      if (!currentReport) {
        return NextResponse.json({ ok: false, error: 'REPORT_NOT_FOUND' }, { status: 404 });
      }
    } else {
      currentReport = await prisma.report.findFirst({
        where: {
          userId: user.id,
          type: 'ASTRO',
          astroMode: 'COMPAT',
          astroDob: d1,
          astroCity: place1 || null,
          astroTime: time1 || null,
          astroDob2: d2,
          astroCity2: place2 || null,
          astroTime2: time2 || null,
        },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          status: true,
          text: true,
          input: true,
          pricingJson: true,
          errorCode: true,
          errorText: true,
          json: true,
        },
      });

      if (!currentReport) {
        return NextResponse.json({ ok: false, error: 'REPORT_NOT_FOUND' }, { status: 404 });
      }

      reportId = currentReport.id;
    }

    if (!isPaidByPricing(currentReport.pricingJson)) {
      return NextResponse.json({ ok: false, error: 'PAYMENT_NOT_CONFIRMED' }, { status: 402 });
    }

    const wantedList = pickSelected(selectedFromReq);

    if (String(currentReport.status || '').toUpperCase() === 'READY' && typeof currentReport.text === 'string' && currentReport.text.trim()) {
      return NextResponse.json({ ok: true, text: currentReport.text, cached: true });
    }

    const lastReady = await prisma.report.findFirst({
      where: {
        userId: user.id,
        type: 'ASTRO',
        astroMode: 'COMPAT',
        astroDob: d1,
        astroCity: place1 || null,
        astroTime: time1 || null,
        astroDob2: d2,
        astroCity2: place2 || null,
        astroTime2: time2 || null,
        status: 'READY',
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        text: true,
        input: true,
        json: true,
      },
    });

    if (lastReady?.text) {
      const prevList = (lastReady.input as any)?.selectedList;
      if (sameSelectedList(prevList, wantedList)) {
        const inputJson = {
          mode: 'ASTRO_COMPAT',
          a: { dob: dob1, age: age1, birthPlace: place1, birthTime: time1, accuracyLevel: acc1 },
          b: { dob: dob2, age: age2, birthPlace: place2, birthTime: time2, accuracyLevel: acc2 },
          selected: selectedFromReq,
          selectedList: wantedList,
          analyzedAt: new Date().toISOString(),
        };

        await prisma.report.update({
          where: { id: reportId! },
          data: {
            status: 'READY',
            text: lastReady.text,
            input: inputJson,
            json: lastReady.json ?? null,
            errorCode: null,
            errorText: null,
          },
        });

        return NextResponse.json({ ok: true, text: lastReady.text, cached: true });
      }
    }

    const inputJson = {
      mode: 'ASTRO_COMPAT',
      a: { dob: dob1, age: age1, birthPlace: place1, birthTime: time1, accuracyLevel: acc1 },
      b: { dob: dob2, age: age2, birthPlace: place2, birthTime: time2, accuracyLevel: acc2 },
      selected: selectedFromReq,
      selectedList: wantedList,
      analyzedAt: new Date().toISOString(),
    };

    await prisma.report.update({
      where: { id: reportId! },
      data: {
        status: 'ANALYZING',
        input: inputJson,
        errorCode: null,
        errorText: null,
      },
    });

    const prompt = buildPrompt({
      a: { dob: dob1, age: age1, birthPlace: place1, birthTime: time1, accuracyLevel: acc1 },
      b: { dob: dob2, age: age2, birthPlace: place2, birthTime: time2, accuracyLevel: acc2 },
      selectedList: wantedList,
    });

    const ai = await callOpenAI({ apiKey, prompt });

    if (!ai.ok) {
      await prisma.report.update({
        where: { id: reportId! },
        data: {
          status: 'FAILED',
          errorCode: 'OPENAI_FAILED',
          errorText: String(ai.error || 'OPENAI_FAILED'),
          json: ai.raw ?? null,
        },
      });

      return NextResponse.json({ ok: false, error: String(ai.error || 'OPENAI_FAILED') }, { status: 500 });
    }

    await prisma.report.update({
      where: { id: reportId! },
      data: {
        status: 'READY',
        text: ai.text,
        json: ai.raw ?? null,
        errorCode: null,
        errorText: null,
      },
    });

    return NextResponse.json({ ok: true, text: ai.text, cached: false });
  } catch (e: any) {
    const msg = e?.message ? String(e.message) : 'SERVER_ERROR';

    try {
      if (reportId) {
        await prisma.report.update({
          where: { id: reportId },
          data: {
            status: 'FAILED',
            errorCode: 'SERVER_ERROR',
            errorText: msg,
          },
        });
      }
    } catch {}

    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
