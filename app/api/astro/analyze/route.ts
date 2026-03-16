/* path: app/api/astro/analyze/route.ts */
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
  | 'ASTRO_PERSON'
  | 'ASTRO_LOVE'
  | 'ASTRO_MONEY'
  | 'ASTRO_CAREER'
  | 'ASTRO_TIMING'
  | 'ASTRO_FORMULA';

const PAID_KEYS: OptionKey[] = ['ASTRO_PERSON', 'ASTRO_LOVE', 'ASTRO_MONEY', 'ASTRO_CAREER', 'ASTRO_TIMING'];

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
  return String(v ?? '').replace(/\s+/g, '').trim().slice(0, 8);
}

function safeNum(v: any): number | null {
  if (v === null || v === undefined) return null;
  const n = Number(v);
  if (!Number.isFinite(n)) return null;
  return n;
}

function normalizeSelected(v: any): Record<OptionKey, boolean> {
  const src = v && typeof v === 'object' ? v : {};
  return {
    ASTRO_PERSON: src.ASTRO_PERSON === true,
    ASTRO_LOVE: src.ASTRO_LOVE === true,
    ASTRO_MONEY: src.ASTRO_MONEY === true,
    ASTRO_CAREER: src.ASTRO_CAREER === true,
    ASTRO_TIMING: src.ASTRO_TIMING === true,
    ASTRO_FORMULA: true,
  };
}

function pickSelected(selected: Record<OptionKey, boolean>): OptionKey[] {
  const out: OptionKey[] = [];
  for (const k of PAID_KEYS) {
    if (selected[k] === true) out.push(k);
  }
  out.push('ASTRO_FORMULA');
  return out;
}

function optionTitle(k: OptionKey) {
  switch (k) {
    case 'ASTRO_PERSON':
      return 'Портрет личности';
    case 'ASTRO_LOVE':
      return 'Любовь и отношения';
    case 'ASTRO_MONEY':
      return 'Деньги, богатство, успех';
    case 'ASTRO_CAREER':
      return 'Карьера и предназначение';
    case 'ASTRO_TIMING':
      return 'Тайминг: год + 12 месяцев';
    case 'ASTRO_FORMULA':
      return 'Итог: формула карты (фраза + 7 правил)';
    default:
      return String(k);
  }
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

function buildPrompt(args: {
  dob: string;
  age: number | null;
  birthPlace: string;
  birthTime: string;
  accuracyLevel: number | null;
  selectedList: OptionKey[];
}) {
  const selectedTitles = args.selectedList.map((k) => optionTitle(k)).join('\n');
  const ageLine = Number.isFinite(args.age as any) && args.age !== null ? String(args.age) : '';
  const acc = computeAccuracyLevel({ birthPlace: args.birthPlace, birthTime: args.birthTime, accuracyLevel: args.accuracyLevel });

  const accuracyPolicy =
    acc.lvl >= 3
      ? [
          'ТОЧНОСТЬ 3/3: дата+место+время есть.',
          'Разрешено подробно разбирать ОСИ и ДОМА (1–12) как ключевой каркас интерпретации.',
          'Но так как вычисления натала не предоставлены, НЕ утверждай конкретные градусы/планеты-в-домах “как факт”.',
          'Формулируй так: “по теме 7 дома”, “ось 1–7”, “фокус 2/8”, “для вашей карты важно…”, без выдуманных чисел и градусов.',
        ].join(' ')
      : acc.lvl === 2
        ? [
            'ТОЧНОСТЬ 2/3: дата+место есть, времени нет.',
            'ДОМА/АСЦЕНДЕНТ НЕ фиксируй как точные. Делай разбор через темы домов и архетипы (1–12) без привязки к асценденту.',
          ].join(' ')
        : [
            'ТОЧНОСТЬ 1/3: только дата.',
            'Никаких асцендентов/домов “как конкретики”. Только домовые темы как универсальный каркас и психологические архетипы.',
          ].join(' ');

  return [
    'Ты — очень сильный астролог-аналитик. Твоя задача — сделать максимально подробный разбор по выбранным пунктам.',
    '',
    'КРИТИЧЕСКИЕ ПРАВИЛА ВЫВОДА:',
    '1) Никаких символов Markdown: НЕ используй ##, **, *, _, `, >. Не используй списки с тире.',
    '2) Не делай вступление/пролог. Сразу начинай с пункта 1).',
    '3) Не задавай вопросов пользователю.',
    '4) Пиши уверенно, конкретно, без воды. Текст должен быть плотным.',
    '5) Запрещено придумывать точные градусы, аспекты и “планета в доме” как факт, если это не вытекает из входа. Используй дома как каркас тем.',
    '6) Никакой медицины, диагнозов и запугивания.',
    '',
    'ДАННЫЕ:',
    `Человек: дата=${args.dob}, возраст=${ageLine}`,
    `Место рождения=${args.birthPlace ? args.birthPlace : 'не указано'}`,
    `Время рождения=${args.birthTime ? args.birthTime : 'не указано'}`,
    `Политика точности: ${accuracyPolicy}`,
    '',
    'ФОРМАТ ОТВЕТА (СТРОГО):',
    'Пункты только в виде 1), 2), 3)… в порядке, который дан в СПИСКЕ ПУНКТОВ НИЖЕ.',
    'Для каждого пункта, КРОМЕ финального, используй 4 блока строго в таком порядке:',
    'А) Карта и дома (структура):',
    'Б) Что видно по человеку:',
    'В) Риск-зона:',
    'Г) Практика (3 правила):',
    '',
    'ОБЯЗАТЕЛЬНО ПРО БЛОК “А) Карта и дома (структура):”',
    'Сделай мини-разбор домов 1–12 как про сценарии жизни человека.',
    'Формат строго: “Дом 1: …”, “Дом 2: …” … “Дом 12: …”.',
    'В каждом доме: 1–2 коротких предложения максимум, но по делу.',
    'Обязательно подсвети: 2 дом (деньги), 8 дом (секс/ресурсы/власть/страхи), 5 дом (романтика), 7 дом (партнёрство), 10 дом (статус/карьера), 4 дом (дом/семья).',
    'Если точность 3/3 — дополнительно в конце блока А добавь “Ось 1–7” и “Ось 2–8” (по 1–2 предложения) и что они требуют от человека.',
    '',
    'ОБЯЗАТЕЛЬНО ПРО БЛОК “Б) Что видно по человеку:”',
    'Сделай 8–14 тезисов.',
    'Нужно покрыть: характер и темперамент, эмоции, любовь и привязанность, секс и желание, власть и контроль, рост и удачу, границы и ответственность, публичный образ и карьеру, деньги.',
    'Не называй конкретные знаки и градусы как факт. Говори через темы: венерианский стиль, марсианская динамика, сатурнианская дисциплина.',
    '',
    'ОБЯЗАТЕЛЬНО ПРО БЛОК “В) Риск-зона:”',
    'Дай 2–4 сценария формата: “когда X → вы делаете Y → итог Z”.',
    'Один сценарий обязательно про отношения, один — про деньги и контроль, один — про карьеру и амбиции.',
    '',
    'ОБЯЗАТЕЛЬНО ПРО БЛОК “Г) Практика (3 правила):”',
    'Ровно 3 правила. Каждое с новой строки.',
    'Формат действия: “Договоритесь…”, “Введите правило…”, “Раз в неделю…”.',
    '',
    'СПЕЦИФИКА ПО ПУНКТАМ:',
    'ПОРТРЕТ ЛИЧНОСТИ: внутренний мотор, реакции на стресс, стиль решений, самооценка, зона бессознательного.',
    'ЛЮБОВЬ И ОТНОШЕНИЯ: романтика, партнёрство, сексуальность, ревность, правила близости, триггеры, как вы любите и как вы ссоритесь.',
    'ДЕНЬГИ: доход, ценность, чужие ресурсы, риски, статусная монетизация, стратегия роста, ловушки импульсивных трат и контроля.',
    'КАРЬЕРА: статус, рутина, система, социальный капитал, как строить имя, какие роли подходят, что тормозит.',
    'ТАЙМИНГ: без точных астротранзитов. Сделай стратегию года + 12 месяцев: каждый месяц 1 строка “Фокус месяца: …”.',
    '',
    'ВАЖНО ПРО ФИНАЛ:',
    'Пункт "Итог: формула карты (фраза + 7 правил)" всегда последний.',
    'Внутри него:',
    '1) Одна фраза: “Эта карта про …”.',
    '2) Затем строка “7 правил:” и ровно 7 правил с новой строки, формат 1) 2) 3).',
    '',
    'СПИСОК ПУНКТОВ ДЛЯ РАЗБОРА (ИМЕННО ИХ И ТОЛЬКО ИХ):',
    selectedTitles,
    '',
    'Начинай ответ сразу с “1) …”.',
  ].join('\n');
}

async function callOpenAI(args: { apiKey: string; prompt: string }) {
  const res = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: { Authorization: `Bearer ${args.apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'gpt-5.2',
      reasoning: { effort: 'medium' },
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
        for (const c of item.content) {
          if (c?.type === 'output_text' && typeof c.text === 'string') outText += c.text;
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

function getPaymentStatusFromPricing(pricingJson: any): string {
  const candidates = [
    pricingJson?.yookassa?.status,
    pricingJson?.paymentStatus,
    pricingJson?.status,
    pricingJson?.payment?.status,
  ];

  for (const c of candidates) {
    const s = String(c || '').trim().toLowerCase();
    if (s) return s;
  }

  return '';
}

function isPaidPricing(pricingJson: any): boolean {
  const status = getPaymentStatusFromPricing(pricingJson);
  return status === 'succeeded' || status === 'waiting_for_capture';
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
    const dob = String(body.dob || '').trim();
    const requestedReportId = String(body.reportId || '').trim();

    const age = safeNum(body.age);
    const birthPlace = cleanText(body.birthPlace, 96);
    const birthTime = cleanTime(body.birthTime);
    const accuracyLevel = safeNum(body.accuracyLevel);

    const selectedFromReq = body.selected as Record<string, any> | undefined;

    if (!initData) return NextResponse.json({ ok: false, error: 'NO_INIT_DATA' }, { status: 401 });
    if (!dob) return NextResponse.json({ ok: false, error: 'NO_DOB' }, { status: 400 });

    const d = parseDobToUtcDate(dob);
    if (!d) return NextResponse.json({ ok: false, error: 'BAD_DOB' }, { status: 400 });

    const v = verifyTelegramWebAppInitData(initData, botToken);
    if (!v.ok) return NextResponse.json({ ok: false, error: v.error }, { status: 401 });

    const telegramId = v.user.id;
    const user = await prisma.user.findUnique({ where: { telegramId }, select: { id: true } });
    if (!user) return NextResponse.json({ ok: false, error: 'NO_USER' }, { status: 404 });

    const selectedFixed = normalizeSelected(selectedFromReq);
    const wantedList = pickSelected(selectedFixed);

    let targetReport:
      | {
          id: string;
          userId: string;
          status: string;
          input: any;
          text: string | null;
          pricingJson: any;
          astroMode: string | null;
        }
      | null = null;

    if (requestedReportId) {
      targetReport = await prisma.report.findUnique({
        where: { id: requestedReportId },
        select: {
          id: true,
          userId: true,
          status: true,
          input: true,
          text: true,
          pricingJson: true,
          astroMode: true,
        } as any,
      });

      if (!targetReport) return NextResponse.json({ ok: false, error: 'NO_REPORT' }, { status: 404 });
      if (targetReport.userId !== user.id) return NextResponse.json({ ok: false, error: 'FORBIDDEN' }, { status: 403 });
      if (targetReport.astroMode !== 'CHART') return NextResponse.json({ ok: false, error: 'BAD_ASTRO_MODE' }, { status: 400 });

      reportId = targetReport.id;
    } else {
      const draft = await prisma.report.findFirst({
        where: {
          userId: user.id,
          type: 'ASTRO',
          astroMode: 'CHART',
          astroDob: d,
          astroCity: birthPlace || null,
          astroTime: birthTime || null,
          status: 'DRAFT',
        },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          userId: true,
          status: true,
          input: true,
          text: true,
          pricingJson: true,
          astroMode: true,
        } as any,
      });

      if (draft) {
        targetReport = draft;
        reportId = draft.id;
      }
    }

    if (!targetReport && !requestedReportId) {
      const anyLatest = await prisma.report.findFirst({
        where: {
          userId: user.id,
          type: 'ASTRO',
          astroMode: 'CHART',
          astroDob: d,
          astroCity: birthPlace || null,
          astroTime: birthTime || null,
        },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          userId: true,
          status: true,
          input: true,
          text: true,
          pricingJson: true,
          astroMode: true,
        } as any,
      });

      if (anyLatest) {
        targetReport = anyLatest;
        reportId = anyLatest.id;
      }
    }

    if (!targetReport || !reportId) {
      return NextResponse.json({ ok: false, error: 'NO_REPORT' }, { status: 404 });
    }

    if (!isPaidPricing(targetReport.pricingJson)) {
      return NextResponse.json({ ok: false, error: 'PAYMENT_NOT_CONFIRMED' }, { status: 402 });
    }

    const selectedObj = selectedFromReq
      ? selectedFixed
      : normalizeSelected(
          targetReport.input && typeof targetReport.input === 'object' ? (targetReport.input as any).selected : null
        );

    const selectedList = pickSelected(selectedObj);
    if (!selectedList.length) return NextResponse.json({ ok: false, error: 'NO_SELECTED' }, { status: 400 });

    if (targetReport.status === 'READY' && targetReport.text) {
      const prevList = (targetReport.input as any)?.selectedList;
      if (!selectedFromReq || sameSelectedList(prevList, selectedList)) {
        return NextResponse.json({ ok: true, text: targetReport.text, cached: true });
      }
    }

    const reusableReady = await prisma.report.findFirst({
      where: {
        userId: user.id,
        type: 'ASTRO',
        astroMode: 'CHART',
        astroDob: d,
        astroCity: birthPlace || null,
        astroTime: birthTime || null,
        status: 'READY',
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        text: true,
        json: true,
        input: true,
      },
    });

    if (reusableReady?.text) {
      const prevList = (reusableReady.input as any)?.selectedList;
      if (sameSelectedList(prevList, selectedList)) {
        await prisma.report.update({
          where: { id: reportId },
          data: {
            status: 'READY',
            text: reusableReady.text,
            json: reusableReady.json ?? null,
            errorCode: null,
            errorText: null,
            input: {
              mode: 'ASTRO',
              dob,
              age,
              birthPlace,
              birthTime,
              accuracyLevel,
              selected: selectedObj,
              selectedList,
              analyzedAt: new Date().toISOString(),
              reusedFromReportId: reusableReady.id,
            },
            astroMode: 'CHART',
            astroDob: d,
            astroCity: birthPlace || null,
            astroTime: birthTime || null,
            astroAccuracyLevel: accuracyLevel ?? null,
          },
        });

        return NextResponse.json({ ok: true, text: reusableReady.text, cached: true, reused: true });
      }
    }

    const inputJson = {
      mode: 'ASTRO',
      dob,
      age,
      birthPlace,
      birthTime,
      accuracyLevel,
      selected: selectedObj,
      selectedList,
      analyzedAt: new Date().toISOString(),
    };

    await prisma.report.update({
      where: { id: reportId },
      data: {
        status: 'ANALYZING',
        input: inputJson,
        errorCode: null,
        errorText: null,
        text: null,
        astroMode: 'CHART',
        astroDob: d,
        astroCity: birthPlace || null,
        astroTime: birthTime || null,
        astroAccuracyLevel: accuracyLevel ?? null,
      },
    });

    const prompt = buildPrompt({ dob, age, birthPlace, birthTime, accuracyLevel, selectedList });
    const ai = await callOpenAI({ apiKey, prompt });

    if (!ai.ok) {
      await prisma.report.update({
        where: { id: reportId },
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
      where: { id: reportId },
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
          data: { status: 'FAILED', errorCode: 'SERVER_ERROR', errorText: msg },
        });
      }
    } catch {}
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
