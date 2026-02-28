/* path: app/api/num/analyze/route.ts */
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

type OptionKey = 'LIFE_PATH' | 'BIRTHDAY' | 'DIGITS' | 'PERIODS' | 'YEAR12' | 'SUMMARY';

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

  if (!timingSafeEqualHex(computedHash, hash)) {
    return { ok: false as const, error: 'BAD_HASH' as const };
  }

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

function safeNum(v: any): number | null {
  if (v === null || v === undefined) return null;
  const n = Number(v);
  if (!Number.isFinite(n)) return null;
  return n;
}

function pickSelected(selected: Record<string, any> | null | undefined): OptionKey[] {
  const keys: OptionKey[] = ['LIFE_PATH', 'BIRTHDAY', 'DIGITS', 'PERIODS', 'YEAR12', 'SUMMARY'];
  const out: OptionKey[] = [];
  if (!selected || typeof selected !== 'object') return ['SUMMARY'];

  for (const k of keys) {
    if (k === 'SUMMARY') continue;
    if ((selected as any)[k] === true) out.push(k);
  }

  // SUMMARY всегда в конце
  out.push('SUMMARY');
  return out;
}

function optionTitle(k: OptionKey) {
  switch (k) {
    case 'LIFE_PATH':
      return 'Число жизненного пути';
    case 'BIRTHDAY':
      return 'Число дня рождения';
    case 'DIGITS':
      return 'Сильные/пустые цифры в дате';
    case 'PERIODS':
      return 'Периоды и вызовы (этапы)';
    case 'YEAR12':
      return 'Личный год + 12 месяцев';
    case 'SUMMARY':
      return 'Итог + общие советы';
    default:
      return String(k);
  }
}

function buildPrompt(args: { dob: string; age: number | null; selectedList: OptionKey[] }) {
  const selectedTitles = args.selectedList.map((k) => optionTitle(k)).join('\n');
  const ageLine = Number.isFinite(args.age as any) && args.age !== null ? String(args.age) : '';

  return [
    'Ты — эксперт по нумерологии. Сделай разбор строго по выбранным пунктам.',
    '',
    'КРИТИЧЕСКИЕ ПРАВИЛА ВЫВОДА:',
    '1) Никаких символов Markdown: НЕ используй ##, **, *, _, `, >. Не используй списки с тире.',
    '2) Не делай вступление/пролог. Сразу начинай с пункта 1).',
    '3) Не задавай вопросов пользователю.',
    '4) Пиши конкретно, без воды.',
    '',
    'ДАННЫЕ:',
    `дата рождения: ${args.dob}`,
    `возраст: ${ageLine}`,
    '',
    'ФОРМАТ ОТВЕТА (СТРОГО):',
    'Пункты только в виде 1), 2), 3)… в порядке, который дан в СПИСКЕ ПУНКТОВ НИЖЕ.',
    'Каждый пункт должен содержать ровно 4 блока в таком порядке и с такими метками:',
    'А) Расчёт:',
    'Б) Значение:',
    'В) Риск-зона:',
    'Г) Практика (5 советов):',
    '',
    'ТРЕБОВАНИЯ:',
    'А) Расчёт: покажи вычисление коротко и понятно (какие числа сложили и к чему привели).',
    'Б) Значение: 3–6 конкретных выводов о стиле поведения/решений/работы/отношений.',
    'В) Риск-зона: 1–2 сценария “когда X → вы делаете Y → итог Z”.',
    'Г) Практика: ровно 5 советов, каждый с новой строки, формат действия: “Сделай…”, “Введи правило…”, “Раз в неделю…”.',
    '',
    'ВАЖНО ПРО ИТОГ:',
    'Пункт "Итог + общие советы" всегда последний.',
    'Внутри него сначала дай общий вывод на 6–9 предложений, затем "Общие советы:" и 7 советов (каждый с новой строки, формат 1) 2) 3)).',
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
          if (c?.type === 'output_text' && typeof c.text === 'string') outText += c.text;
        }
      }
    }
    outText = outText.trim();
  }

  if (!outText) return { ok: false as const, error: 'EMPTY_MODEL_OUTPUT', raw: j };
  return { ok: true as const, text: outText, raw: j };
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
    const mode = String(body.mode || '').trim(); // DATE
    const dob = String(body.dob || '').trim();
    const age = safeNum(body.age);

    const selectedFromReq = body.selected as Record<string, any> | undefined;

    if (!initData) return NextResponse.json({ ok: false, error: 'NO_INIT_DATA' }, { status: 401 });
    if (mode !== 'DATE') return NextResponse.json({ ok: false, error: 'BAD_MODE' }, { status: 400 });
    if (!dob) return NextResponse.json({ ok: false, error: 'NO_DOB' }, { status: 400 });

    const dobDate = parseDobToUtcDate(dob);
    if (!dobDate) return NextResponse.json({ ok: false, error: 'BAD_DOB' }, { status: 400 });

    const v = verifyTelegramWebAppInitData(initData, botToken);
    if (!v.ok) return NextResponse.json({ ok: false, error: v.error }, { status: 401 });

    const telegramId = v.user.id;
    const user = await prisma.user.findUnique({ where: { telegramId }, select: { id: true } });
    if (!user) return NextResponse.json({ ok: false, error: 'NO_USER' }, { status: 404 });

    // если уже есть READY — отдаём
    const lastReady = await prisma.report.findFirst({
      where: { userId: user.id, type: 'NUM', numMode: 'DATE', numDob1: dobDate, status: 'READY' },
      orderBy: { createdAt: 'desc' },
      select: { id: true, text: true },
    });
    if (lastReady?.text) {
      return NextResponse.json({ ok: true, text: lastReady.text, cached: true });
    }

    // берём последний отчёт (любой статус) чтобы подтянуть selected из БД если запрос без selected
    const lastAny = await prisma.report.findFirst({
      where: { userId: user.id, type: 'NUM', numMode: 'DATE', numDob1: dobDate },
      orderBy: { createdAt: 'desc' },
      select: { id: true, status: true, input: true, text: true },
    });

    const selectedObj =
      selectedFromReq ??
      ((lastAny?.input && typeof lastAny.input === 'object' && (lastAny.input as any).selected)
        ? (lastAny.input as any).selected
        : undefined);

    const selectedList = pickSelected(selectedObj);
    if (!selectedList.length) return NextResponse.json({ ok: false, error: 'NO_SELECTED' }, { status: 400 });

    // Report: если есть DRAFT — переиспользуем, иначе создаём
    const draft = await prisma.report.findFirst({
      where: { userId: user.id, type: 'NUM', numMode: 'DATE', numDob1: dobDate, status: 'DRAFT' },
      orderBy: { createdAt: 'desc' },
      select: { id: true },
    });

    const inputJson = {
      mode: 'DATE',
      dob,
      age,
      selected: selectedObj ?? null,
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
        },
      });
    } else {
      const created = await prisma.report.create({
        data: {
          userId: user.id,
          type: 'NUM',
          status: 'DRAFT',
          input: inputJson,
          numMode: 'DATE',
          numDob1: dobDate,
        },
        select: { id: true },
      });
      reportId = created.id;
    }

    const prompt = buildPrompt({ dob, age, selectedList });
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
      if (reportId) {
        await prisma.report.update({ where: { id: reportId }, data: { status: 'FAILED', errorCode: 'SERVER_ERROR', errorText: msg } });
      }
    } catch {}
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
