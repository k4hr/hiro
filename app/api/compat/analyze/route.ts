/* path: app/api/compat/analyze/route.ts */
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
  | 'COMPAT_RESONANCE'
  | 'COMPAT_GOOD'
  | 'COMPAT_BAD'
  | 'COMPAT_TALKS'
  | 'COMPAT_MONEY_HOME'
  | 'COMPAT_FORMULA';

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

function cleanName(v: any): string {
  return String(v ?? '').replace(/\s+/g, ' ').trim().slice(0, 64);
}

function safeNum(v: any): number | null {
  if (v === null || v === undefined) return null;
  const n = Number(v);
  if (!Number.isFinite(n)) return null;
  return n;
}

function optionTitle(k: OptionKey) {
  switch (k) {
    case 'COMPAT_RESONANCE':
      return 'Резонанс “моё имя ↔ его путь” и “его имя ↔ мой путь”';
    case 'COMPAT_GOOD':
      return 'Сильные зоны пары';
    case 'COMPAT_BAD':
      return 'Слабые зоны пары';
    case 'COMPAT_TALKS':
      return 'Как договариваться (ключ к миру)';
    case 'COMPAT_MONEY_HOME':
      return 'Деньги и быт (правила пары)';
    case 'COMPAT_FORMULA':
      return 'Итог: формула пары (фраза + 7 правил)';
    default:
      return String(k);
  }
}

/**
 * ✅ Выбор пунктов:
 * - пользователь может включать/выключать 5 пунктов
 * - COMPAT_FORMULA всегда включён и всегда последний
 */
function pickSelected(selected: Record<string, any> | null | undefined): OptionKey[] {
  const paid: OptionKey[] = ['COMPAT_RESONANCE', 'COMPAT_GOOD', 'COMPAT_BAD', 'COMPAT_TALKS', 'COMPAT_MONEY_HOME'];
  const out: OptionKey[] = [];

  if (selected && typeof selected === 'object') {
    for (const k of paid) if ((selected as any)[k] === true) out.push(k);
  }

  out.push('COMPAT_FORMULA');
  return out;
}

function buildPrompt(args: {
  dob1: string;
  name1: string;
  age1: number | null;
  dob2: string;
  name2: string;
  age2: number | null;
  selectedList: OptionKey[];
}) {
  const selectedTitles = args.selectedList.map((k) => optionTitle(k)).join('\n');
  const age1Line = Number.isFinite(args.age1 as any) && args.age1 !== null ? String(args.age1) : '';
  const age2Line = Number.isFinite(args.age2 as any) && args.age2 !== null ? String(args.age2) : '';

  return [
    'Ты — эксперт по нумерологии и совместимости. Сделай разбор пары строго по выбранным пунктам.',
    '',
    'КРИТИЧЕСКИЕ ПРАВИЛА ВЫВОДА:',
    '1) Никаких символов Markdown: НЕ используй ##, **, *, _, `, >. Не используй списки с тире.',
    '2) Не делай вступление/пролог. Сразу начинай с пункта 1).',
    '3) Не задавай вопросов пользователю.',
    '4) Пиши конкретно, без воды.',
    '',
    'ДАННЫЕ:',
    `Человек A: имя=${args.name1}, дата=${args.dob1}, возраст=${age1Line}`,
    `Человек B: имя=${args.name2}, дата=${args.dob2}, возраст=${age2Line}`,
    '',
    'ФОРМАТ ОТВЕТА (СТРОГО):',
    'Пункты только в виде 1), 2), 3)… в порядке, который дан в СПИСКЕ ПУНКТОВ НИЖЕ.',
    'Для каждого пункта, КРОМЕ финального, используй 4 блока строго в таком порядке:',
    'А) Что видно по паре:',
    'Б) Значение:',
    'В) Риск-зона:',
    'Г) Практика (3 правила):',
    '',
    'ТРЕБОВАНИЯ:',
    'А) Что видно по паре: 3–6 коротких тезисов.',
    'Б) Значение: 3–6 проверяемых выводов о динамике, стиле близости, темпе, лидерстве, границах.',
    'В) Риск-зона: 1–2 сценария “когда X → вы делаете Y → итог Z”.',
    'Г) Практика: ровно 3 правила, каждое с новой строки, формат действия: “Договоритесь…”, “Введите правило…”, “Раз в неделю…”.',
    '',
    'ВАЖНО ПРО ФИНАЛ:',
    'Пункт "Итог: формула пары (фраза + 7 правил)" всегда последний.',
    'Внутри него:',
    '1) Одна фраза: “Эта пара про …” (1 предложение).',
    '2) Затем строка “7 правил пары:” и ровно 7 правил с новой строки, формат 1) 2) 3).',
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
      reasoning: { effort: 'low' },
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
    const dob1 = String(body.dob1 || '').trim();
    const dob2 = String(body.dob2 || '').trim();
    const name1 = cleanName(body.name1);
    const name2 = cleanName(body.name2);

    const age1 = safeNum(body.age1);
    const age2 = safeNum(body.age2);

    const selectedFromReq = body.selected as Record<string, any> | undefined;

    if (!initData) return NextResponse.json({ ok: false, error: 'NO_INIT_DATA' }, { status: 401 });
    if (!dob1 || !dob2) return NextResponse.json({ ok: false, error: 'NO_DOB' }, { status: 400 });
    if (!name1 || !name2) return NextResponse.json({ ok: false, error: 'NO_NAME' }, { status: 400 });

    const d1 = parseDobToUtcDate(dob1);
    const d2 = parseDobToUtcDate(dob2);
    if (!d1 || !d2) return NextResponse.json({ ok: false, error: 'BAD_DOB' }, { status: 400 });

    const v = verifyTelegramWebAppInitData(initData, botToken);
    if (!v.ok) return NextResponse.json({ ok: false, error: v.error }, { status: 401 });

    const telegramId = v.user.id;
    const user = await prisma.user.findUnique({ where: { telegramId }, select: { id: true } });
    if (!user) return NextResponse.json({ ok: false, error: 'NO_USER' }, { status: 404 });

    // если пришёл selected в запросе — это "новый заказ", кеш можно отдавать ТОЛЬКО если список совпадает
    const selectedFixed = { ...(selectedFromReq ?? {}), COMPAT_FORMULA: true };
    const wantedList = pickSelected(selectedFixed);

    const lastReady = await prisma.report.findFirst({
      where: { userId: user.id, type: 'NUM', numMode: 'COMPAT', numDob1: d1, numDob2: d2, numName1: name1, numName2: name2, status: 'READY' },
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
      where: { userId: user.id, type: 'NUM', numMode: 'COMPAT', numDob1: d1, numDob2: d2, numName1: name1, numName2: name2 },
      orderBy: { createdAt: 'desc' },
      select: { id: true, status: true, input: true, text: true },
    });

    const selectedObj =
      selectedFromReq ??
      ((lastAny?.input && typeof lastAny.input === 'object' && (lastAny.input as any).selected) ? (lastAny.input as any).selected : undefined);

    const selectedObjFixed = { ...(selectedObj ?? {}), COMPAT_FORMULA: true };
    const selectedList = pickSelected(selectedObjFixed);

    const draft = await prisma.report.findFirst({
      where: { userId: user.id, type: 'NUM', numMode: 'COMPAT', numDob1: d1, numDob2: d2, numName1: name1, numName2: name2, status: 'DRAFT' },
      orderBy: { createdAt: 'desc' },
      select: { id: true },
    });

    const inputJson = {
      mode: 'COMPAT',
      dob1,
      name1,
      age1,
      dob2,
      name2,
      age2,
      selected: selectedObjFixed,
      selectedList,
      analyzedAt: new Date().toISOString(),
    };

    if (draft) {
      reportId = draft.id;
      await prisma.report.update({ where: { id: reportId }, data: { input: inputJson, errorCode: null, errorText: null } });
    } else {
      const created = await prisma.report.create({
        data: { userId: user.id, type: 'NUM', status: 'DRAFT', input: inputJson, numMode: 'COMPAT', numDob1: d1, numName1: name1, numDob2: d2, numName2: name2 },
        select: { id: true },
      });
      reportId = created.id;
    }

    const prompt = buildPrompt({ dob1, name1, age1, dob2, name2, age2, selectedList });
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
