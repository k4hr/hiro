/* path: app/api/astro-compat/analyze/route.ts */
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

function safeNum(v: any): number | null {
  if (v === null || v === undefined) return null;
  const n = Number(v);
  if (!Number.isFinite(n)) return null;
  return n;
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

/**
 * - пользователь может включать/выключать 5 пунктов
 * - итог всегда включён и всегда последний
 */
function pickSelected(selected: Record<string, any> | null | undefined): OptionKey[] {
  const paid: OptionKey[] = ['ACOMPAT_LOVE', 'ACOMPAT_SEX', 'ACOMPAT_MONEY', 'ACOMPAT_CONFLICT', 'ACOMPAT_FAMILY'];
  const out: OptionKey[] = [];

  if (selected && typeof selected === 'object') {
    for (const k of paid) if ((selected as any)[k] === true) out.push(k);
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
      'ТОЧНОСТЬ 3/3: дата+место+время есть.',
      'Можно использовать оси и дома как каркас совместимости (1–12, 1–7, 2–8, 4–10, 5–11, 6–12).',
      'Но так как расчётов натала нет, запрещено утверждать конкретные градусы/аспекты/планеты-в-домах как факт.',
      'Говори через темы: “ось 1–7”, “фокус 5 дома”, “напряжение 2–8”, “сценарий 4 дома”, и т.д.',
    ].join(' ');
  }
  if (acc.lvl === 2) {
    return [
      'ТОЧНОСТЬ 2/3: дата+место есть, времени нет.',
      'Асцендент/дома НЕ фиксируй как точные. Используй дома как универсальные темы, без привязки “у вас в 7 доме стоит…”',
    ].join(' ');
  }
  return [
    'ТОЧНОСТЬ 1/3: только дата.',
    'Без асцендента и домов как конкретики. Только домовые темы как универсальный каркас + психологические архетипы отношений.',
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
    'ШКАЛА ОЦЕНКИ (для итогового процента):',
    'Оцени 5 категорий по 0–20 баллов (целые числа): Любовь/близость, Секс/страсть, Деньги/ресурсы, Конфликты/примирение, Быт/семья.',
    'Сумма даёт 0–100%.',
    'Если какой-то пункт НЕ выбран пользователем, всё равно оцени его кратко (2–4 предложения) и дай баллы, но детально расписывай только выбранные пункты.',
  ].join('\n');

  return [
    'Ты — топ-эксперт по астрологии и совместимости пары. Сделай максимально подробный разбор.',
    '',
    'КРИТИЧЕСКИЕ ПРАВИЛА ВЫВОДА:',
    '1) Никаких символов Markdown: НЕ используй ##, **, *, _, `, >. Не используй списки с тире.',
    '2) Не делай вступление/пролог. Сразу начинай с “1) …”.',
    '3) Не задавай вопросов пользователю.',
    '4) Пиши очень подробно, но без воды: плотные абзацы и чёткие формулировки.',
    '5) Запрещено придумывать конкретные градусы/аспекты/планеты-в-домах как факт. Дома и оси используй как КАРКАС ТЕМ.',
    '6) Никакой медицины/диагнозов/запугивания.',
    '',
    'ДАННЫЕ:',
    `Человек A: дата=${args.a.dob}, возраст=${ageA}, место=${args.a.birthPlace || 'не указано'}, время=${args.a.birthTime || 'не указано'}`,
    `Политика точности A: ${accuracyPolicyText(accA)}`,
    `Человек B: дата=${args.b.dob}, возраст=${ageB}, место=${args.b.birthPlace || 'не указано'}, время=${args.b.birthTime || 'не указано'}`,
    `Политика точности B: ${accuracyPolicyText(accB)}`,
    '',
    weightLines,
    '',
    'ФОРМАТ ОТВЕТА (СТРОГО):',
    '1) Сначала строка: “Совместимость: NN%” (NN — целое число 0–100).',
    '2) Затем строка: “Баллы: Любовь NN/20 · Секс NN/20 · Деньги NN/20 · Конфликты NN/20 · Быт NN/20”.',
    '3) Затем строка: “Короткий вердикт:” и 3 строки-вердикта (каждая с новой строки).',
    '4) Далее пункты 1), 2), 3)… строго в порядке, который дан в СПИСКЕ ПУНКТОВ НИЖЕ.',
    '',
    'ДЕТАЛЬНЫЙ ФОРМАТ ДЛЯ КАЖДОГО ВЫБРАННОГО ПУНКТА (КРОМЕ ФИНАЛЬНОГО):',
    'А) Каркас домов и осей (совместимость):',
    'Б) Что видно по паре:',
    'В) Значение:',
    'Г) Триггеры и риск-сценарии:',
    'Д) Практика (5 правил):',
    '',
    'ПРАВИЛА К БЛОКАМ:',
    'А) Каркас домов и осей: 10–14 строк. Формат строго:',
    '“Ось 1–7: …”',
    '“Ось 2–8: …”',
    '“Ось 4–10: …”',
    '“Ось 5–11: …”',
    '“Ось 6–12: …”',
    'и далее “Дом 4: …”, “Дом 5: …”, “Дом 7: …”, “Дом 8: …”, “Дом 10: …”, “Дом 2: …” (ключевые дома в совместимости).',
    'Если точность 2/3 или 1/3 — в блоке А делай это как универсальные темы, без заявлений “у вас конкретно так”.',
    '',
    'Б) Что видно по паре: 10–18 тезисов. Обязательно покрыть:',
    'романтика/тепло (5 дом), партнёрство/контракт (7 дом), секс/слияние/ревность/контроль (8 дом), деньги/ценность/траты (2 дом), общий дом/семья (4 дом), статус/цели (10 дом), дружба/команда (11 дом), рутина/быт (6 дом).',
    '',
    'В) Значение: 10–18 выводов про динамику: кто ведёт, как вы принимаете решения, как распределяется власть, как строится доверие, какие сценарии укрепляют/ломают связь.',
    '',
    'Г) Триггеры и риск-сценарии: 5–8 сценариев строго в формате:',
    '“когда X → вы делаете Y → итог Z”.',
    'Из них обязательно: 2 про деньги/контроль (2–8), 2 про секс/границы (8), 2 про конфликты/эскалацию (7/Марс-Сатурн темы), 1 про быт (4/6), 1 про статус/цели (10).',
    '',
    'Д) Практика: ровно 5 правил. Каждое с новой строки и начинается глаголом действия:',
    '“Договоритесь…”, “Введите правило…”, “Запретите…”, “Раз в неделю…”, “Если начинается спор — …”.',
    '',
    'ФИНАЛЬНЫЙ ПУНКТ (ИТОГ: формула пары) — всегда последний и имеет структуру:',
    'А) “Эта пара про …” (1 предложение).',
    'Б) “Сильная сторона: …” (1 предложение).',
    'В) “Слабая сторона: …” (1 предложение).',
    'Г) “7 правил пары:” и далее ровно 7 правил с новой строки, формат 1) 2) 3).',
    '',
    'СПЕЦИФИКА ПО ПУНКТАМ (делай максимально подробно):',
    'Любовь и близость: 5/7 дом, эмоциональная безопасность, стиль заботы, что делает отношения “живыми”.',
    'Секс и страсть: 8 дом, власть/ревность/слияние, границы, что разжигает и что гасит.',
    'Деньги и ресурсы: 2/8 дом, деньги как ценность и как власть, стратегия, доверие, общий бюджет, долги/риски.',
    'Конфликты и примирение: 7 дом + марсианско-сатурнианские темы давления/границ; деэскалация, правила ссоры, восстановление.',
    'Быт и семья: 4/6 дом, распределение нагрузки, дом как система, “кто за что отвечает”, долгий формат.',
    '',
    'СПИСОК ПУНКТОВ ДЛЯ РАЗБОРА (ИМЕННО ИХ И ТОЛЬКО ИХ):',
    selectedTitles,
    '',
    'Начинай ответ строго с “1) Совместимость: …%”.',
  ].join('\n');
}

async function callOpenAI(args: { apiKey: string; prompt: string }) {
  const res = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: { Authorization: `Bearer ${args.apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'gpt-5.2',
      reasoning: { effort: 'high' },
      input: [{ role: 'user', content: [{ type: 'input_text', text: args.prompt }] }],
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
        for (const c of item.content) if (c?.type === 'output_text' && typeof c.text === 'string') outText += c.text;
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

export async function POST(req: Request) {
  let reportId: string | null = null;

  try {
    const apiKey = envClean('OPENAI_API_KEY');
    if (!apiKey) return NextResponse.json({ ok: false, error: 'NO_OPENAI_API_KEY' }, { status: 500 });

    const botToken = envClean('TELEGRAM_BOT_TOKEN');
    if (!botToken) return NextResponse.json({ ok: false, error: 'NO_BOT_TOKEN' }, { status: 500 });

    const body = (await req.json().catch(() => null)) as any;
    if (!body) return NextResponse.json({ ok: false, error: 'BAD_JSON' }, { status: 400 });

    const initData = String(body.initData || '').trim();

    const a = body.a && typeof body.a === 'object' ? body.a : null;
    const b = body.b && typeof body.b === 'object' ? body.b : null;

    const dob1 = String(a?.dob || '').trim();
    const dob2 = String(b?.dob || '').trim();

    const age1 = safeNum(a?.age);
    const age2 = safeNum(b?.age);

    const place1 = cleanText(a?.birthPlace, 96);
    const place2 = cleanText(b?.birthPlace, 96);

    const time1 = cleanText(a?.birthTime, 8);
    const time2 = cleanText(b?.birthTime, 8);

    const acc1 = safeNum(a?.accuracyLevel);
    const acc2 = safeNum(b?.accuracyLevel);

    const selectedFromReq = body.selected as Record<string, any> | undefined;

    if (!initData) return NextResponse.json({ ok: false, error: 'NO_INIT_DATA' }, { status: 401 });
    if (!dob1 || !dob2) return NextResponse.json({ ok: false, error: 'NO_DOB' }, { status: 400 });

    const d1 = parseDobToUtcDate(dob1);
    const d2 = parseDobToUtcDate(dob2);
    if (!d1 || !d2) return NextResponse.json({ ok: false, error: 'BAD_DOB' }, { status: 400 });

    const v = verifyTelegramWebAppInitData(initData, botToken);
    if (!v.ok) return NextResponse.json({ ok: false, error: v.error }, { status: 401 });

    const telegramId = v.user.id;
    const user = await prisma.user.findUnique({ where: { telegramId }, select: { id: true } });
    if (!user) return NextResponse.json({ ok: false, error: 'NO_USER' }, { status: 404 });

    // если пришёл selected — это новый заказ, кеш отдаём только если список совпадает
    const selectedFixed = { ...(selectedFromReq ?? {}), ACOMPAT_FORMULA: true };
    const wantedList = pickSelected(selectedFixed);

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
      select: { id: true, text: true, input: true },
    });

    if (lastReady?.text) {
      const prevList = (lastReady.input as any)?.selectedList;
      if (!selectedFromReq || sameSelectedList(prevList, wantedList)) {
        return NextResponse.json({ ok: true, text: lastReady.text, cached: true });
      }
    }

    const lastAny = await prisma.report.findFirst({
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
      select: { id: true, status: true, input: true, text: true },
    });

    const selectedObj =
      selectedFromReq ??
      ((lastAny?.input && typeof lastAny.input === 'object' && (lastAny.input as any).selected)
        ? (lastAny.input as any).selected
        : undefined);

    const selectedObjFixed = { ...(selectedObj ?? {}), ACOMPAT_FORMULA: true };
    const selectedList = pickSelected(selectedObjFixed);

    const draft = await prisma.report.findFirst({
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
        status: 'DRAFT',
      },
      orderBy: { createdAt: 'desc' },
      select: { id: true },
    });

    const inputJson = {
      mode: 'ASTRO_COMPAT',
      a: { dob: dob1, age: age1, birthPlace: place1, birthTime: time1, accuracyLevel: acc1 },
      b: { dob: dob2, age: age2, birthPlace: place2, birthTime: time2, accuracyLevel: acc2 },
      selected: selectedObjFixed,
      selectedList,
      analyzedAt: new Date().toISOString(),
    };

    if (draft) {
      reportId = draft.id;
      await prisma.report.update({
        where: { id: reportId },
        data: {
          input: inputJson,
          errorCode: null,
          errorText: null,

          type: 'ASTRO',
          astroMode: 'COMPAT',

          astroDob: d1,
          astroCity: place1 || null,
          astroTime: time1 || null,
          astroAccuracyLevel: acc1 ?? null,

          astroDob2: d2,
          astroCity2: place2 || null,
          astroTime2: time2 || null,
          astroAccuracyLevel2: acc2 ?? null,
        },
      });
    } else {
      const created = await prisma.report.create({
        data: {
          userId: user.id,
          type: 'ASTRO',
          status: 'DRAFT',
          input: inputJson,
          astroMode: 'COMPAT',

          astroDob: d1,
          astroCity: place1 || null,
          astroTime: time1 || null,
          astroAccuracyLevel: acc1 ?? null,

          astroDob2: d2,
          astroCity2: place2 || null,
          astroTime2: time2 || null,
          astroAccuracyLevel2: acc2 ?? null,
        },
        select: { id: true },
      });
      reportId = created.id;
    }

    const prompt = buildPrompt({
      a: { dob: dob1, age: age1, birthPlace: place1, birthTime: time1, accuracyLevel: acc1 },
      b: { dob: dob2, age: age2, birthPlace: place2, birthTime: time2, accuracyLevel: acc2 },
      selectedList,
    });

    const ai = await callOpenAI({ apiKey, prompt });

    if (!ai.ok) {
      if (reportId) {
        await prisma.report.update({
          where: { id: reportId },
          data: { status: 'FAILED', errorCode: 'OPENAI_FAILED', errorText: String(ai.error || 'OPENAI_FAILED'), json: ai.raw ?? null },
        });
      }
      return NextResponse.json({ ok: false, error: String(ai.error || 'OPENAI_FAILED') }, { status: 500 });
    }

    if (reportId) {
      await prisma.report.update({
        where: { id: reportId },
        data: { status: 'READY', text: ai.text, json: ai.raw ?? null, errorCode: null, errorText: null },
      });
    }

    return NextResponse.json({ ok: true, text: ai.text, cached: false });
  } catch (e: any) {
    const msg = e?.message ? String(e.message) : 'SERVER_ERROR';
    try {
      if (reportId) await prisma.report.update({ where: { id: reportId }, data: { status: 'FAILED', errorCode: 'SERVER_ERROR', errorText: msg } });
    } catch {}
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
