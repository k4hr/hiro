/* path: app/api/palm/analyze/route.ts */
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

type Handedness = 'RIGHT' | 'LEFT' | 'AMBI';
type OptionKey =
  | 'HEART'
  | 'HEAD'
  | 'LIFE'
  | 'FATE'
  | 'SUN'
  | 'MERCURY'
  | 'MOUNTS'
  | 'HANDS_DIFF';

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

function pickSelected(selected: Record<string, any> | null | undefined): OptionKey[] {
  const keys: OptionKey[] = ['HEART', 'HEAD', 'LIFE', 'FATE', 'SUN', 'MERCURY', 'MOUNTS', 'HANDS_DIFF'];
  const out: OptionKey[] = [];
  if (!selected || typeof selected !== 'object') return out;
  for (const k of keys) {
    if (selected[k] === true) out.push(k);
  }
  return out;
}

function optionTitle(k: OptionKey) {
  switch (k) {
    case 'HEART':
      return 'Линия Сердца';
    case 'HEAD':
      return 'Линия Головы';
    case 'LIFE':
      return 'Линия Жизни';
    case 'FATE':
      return 'Линия Судьбы';
    case 'SUN':
      return 'Линия Солнца';
    case 'MERCURY':
      return 'Линия Меркурия';
    case 'MOUNTS':
      return 'Горы ладони';
    case 'HANDS_DIFF':
      return 'Разница между руками';
    default:
      return k;
  }
}

function safeNum(v: any): number | null {
  if (v === null || v === undefined) return null;
  const n = Number(v);
  if (!Number.isFinite(n)) return null;
  return n;
}

function buildPrompt(args: { handedness: Handedness; dob: string; age: number | null; selectedList: OptionKey[] }) {
  const selectedHuman = args.selectedList.map((k) => `- ${optionTitle(k)}`).join('\n');

  return [
    'Ты — опытный хиромант-аналитик. Дай понятный структурированный разбор по двум фото ладоней.',
    '',
    'ВАЖНО:',
    '- Не задавай вопросов пользователю.',
    '- Если на фото чего-то не видно, аккуратно скажи: "не видно достаточно чётко" и продолжай по тому, что видно.',
    '- Не выдумывай конкретику, если она не подтверждается визуально.',
    '- Тон: уверенный, спокойный, без мистического пафоса, но можно немного "магии" как развлекательный стиль.',
    '- Это развлекательная интерпретация (хиромантия), а не медицина и не диагностика.',
    '',
    'ЗАДАЧА:',
    '1) В начале: короткий summary на 5–7 строк (ключевые выводы).',
    '2) Потом блоки строго по выбранным пунктам (каждый с заголовком).',
    '3) В конце: "что усилить/на что опереться" — 5 практичных советов (не медицина).',
    '',
    'ДАННЫЕ:',
    `- handedness: ${args.handedness} (RIGHT=активная правая, LEFT=активная левая, AMBI=активная чаще используемая)`,
    `- дата рождения: ${args.dob}${Number.isFinite(args.age as any) ? ` (возраст: ${args.age})` : ''}`,
    '',
    'ВЫБРАННЫЕ ПУНКТЫ:',
    selectedHuman,
    '',
    'ФОТО:',
    '- Фото #1: левая ладонь',
    '- Фото #2: правая ладонь',
  ].join('\n');
}

async function callOpenAI(args: { apiKey: string; prompt: string; leftUrl: string; rightUrl: string }) {
  const res = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: { Authorization: `Bearer ${args.apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'gpt-5.2',
      reasoning: { effort: 'low' },
      input: [
        {
          role: 'user',
          content: [
            { type: 'input_text', text: args.prompt },
            { type: 'input_image', image_url: args.leftUrl },
            { type: 'input_image', image_url: args.rightUrl },
          ],
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
  let scanId = '';
  let reportId: string | null = null;

  try {
    const apiKey = envClean('OPENAI_API_KEY');
    if (!apiKey) return NextResponse.json({ ok: false, error: 'NO_OPENAI_API_KEY' }, { status: 500 });

    const botToken = envClean('TELEGRAM_BOT_TOKEN');
    if (!botToken) return NextResponse.json({ ok: false, error: 'NO_BOT_TOKEN' }, { status: 500 });

    const body = (await req.json().catch(() => null)) as any;
    if (!body) return NextResponse.json({ ok: false, error: 'BAD_JSON' }, { status: 400 });

    const initData = String(body.initData || '').trim();
    scanId = String(body.scanId || '').trim();

    const handedness = String(body.handedness || '').trim() as Handedness;
    const dob = String(body.dob || '').trim();
    const age = safeNum(body.age);

    // selected может отсутствовать (тогда возьмём из Report.input)
    const selectedFromReq = body.selected as Record<string, any> | undefined;

    if (!initData) return NextResponse.json({ ok: false, error: 'NO_INIT_DATA' }, { status: 401 });
    if (!scanId) return NextResponse.json({ ok: false, error: 'NO_SCAN_ID' }, { status: 400 });
    if (!['RIGHT', 'LEFT', 'AMBI'].includes(handedness)) return NextResponse.json({ ok: false, error: 'BAD_HANDEDNESS' }, { status: 400 });
    if (!dob) return NextResponse.json({ ok: false, error: 'NO_DOB' }, { status: 400 });

    const v = verifyTelegramWebAppInitData(initData, botToken);
    if (!v.ok) return NextResponse.json({ ok: false, error: v.error }, { status: 401 });

    const telegramId = v.user.id;
    const user = await prisma.user.findUnique({ where: { telegramId }, select: { id: true } });
    if (!user) return NextResponse.json({ ok: false, error: 'NO_USER' }, { status: 404 });

    const scan = await prisma.palmScan.findUnique({
      where: { id: scanId },
      select: {
        id: true,
        userId: true,
        status: true,
        leftImageUrl: true,
        rightImageUrl: true,
        aiText: true,
        aiJson: true,
      },
    });

    if (!scan) return NextResponse.json({ ok: false, error: 'NO_SCAN' }, { status: 404 });
    if (scan.userId !== user.id) return NextResponse.json({ ok: false, error: 'FORBIDDEN' }, { status: 403 });

    const leftUrl = String(scan.leftImageUrl || '').trim();
    const rightUrl = String(scan.rightImageUrl || '').trim();
    if (!leftUrl || !rightUrl) return NextResponse.json({ ok: false, error: 'NO_PHOTOS' }, { status: 400 });

    // если уже готово — отдаём
    if (scan.status === 'READY' && scan.aiText) {
      return NextResponse.json({ ok: true, text: scan.aiText, cached: true });
    }

    // достаём selected из DRAFT/последнего PALM report
    const lastAnyReport = await prisma.report.findFirst({
      where: { userId: user.id, type: 'PALM', palmScanId: scanId },
      orderBy: { createdAt: 'desc' },
      select: { id: true, status: true, input: true, text: true },
    });

    // если в Report уже есть READY текст — отдаём и синхронизируем PalmScan
    if (lastAnyReport?.status === 'READY' && lastAnyReport.text) {
      await prisma.palmScan.update({ where: { id: scanId }, data: { status: 'READY', aiText: lastAnyReport.text } });
      return NextResponse.json({ ok: true, text: lastAnyReport.text, cached: true });
    }

    const selectedObj =
      selectedFromReq ??
      ((lastAnyReport?.input && typeof lastAnyReport.input === 'object' && (lastAnyReport.input as any).selected) ? (lastAnyReport.input as any).selected : undefined);

    const selectedList = pickSelected(selectedObj);
    if (!selectedList.length) return NextResponse.json({ ok: false, error: 'NO_SELECTED' }, { status: 400 });

    // ставим ANALYZING
    await prisma.palmScan.update({
      where: { id: scanId },
      data: { status: 'ANALYZING', errorCode: null, errorText: null, qualityFlag: false, qualityNote: null },
    });

    // Report: если есть DRAFT — переиспользуем, иначе создаём
    const draft = await prisma.report.findFirst({
      where: { userId: user.id, type: 'PALM', palmScanId: scanId, status: 'DRAFT' },
      orderBy: { createdAt: 'desc' },
      select: { id: true },
    });

    const inputJson = {
      scanId,
      handedness,
      dob,
      age,
      selected: selectedObj ?? null,
      selectedList,
      leftUrl,
      rightUrl,
      analyzedAt: new Date().toISOString(),
    };

    if (draft) {
      reportId = draft.id;
      await prisma.report.update({ where: { id: reportId }, data: { input: inputJson } });
    } else {
      const created = await prisma.report.create({
        data: { userId: user.id, type: 'PALM', status: 'DRAFT', palmScanId: scanId, input: inputJson },
        select: { id: true },
      });
      reportId = created.id;
    }

    const prompt = buildPrompt({ handedness, dob, age, selectedList });
    const ai = await callOpenAI({ apiKey, prompt, leftUrl, rightUrl });

    if (!ai.ok) {
      await prisma.palmScan.update({
        where: { id: scanId },
        data: { status: 'FAILED', errorCode: 'OPENAI_FAILED', errorText: String(ai.error || 'OPENAI_FAILED') },
      });

      if (reportId) {
        await prisma.report.update({
          where: { id: reportId },
          data: { status: 'FAILED', errorCode: 'OPENAI_FAILED', errorText: String(ai.error || 'OPENAI_FAILED'), json: ai.raw ?? null },
        });
      }

      return NextResponse.json({ ok: false, error: String(ai.error || 'OPENAI_FAILED') }, { status: 500 });
    }

    await prisma.palmScan.update({
      where: { id: scanId },
      data: { status: 'READY', aiText: ai.text, aiJson: ai.raw ?? null, errorCode: null, errorText: null },
    });

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
      if (scanId) {
        await prisma.palmScan.update({ where: { id: scanId }, data: { status: 'FAILED', errorCode: 'SERVER_ERROR', errorText: msg } });
      }
    } catch {}

    try {
      if (reportId) {
        await prisma.report.update({ where: { id: reportId }, data: { status: 'FAILED', errorCode: 'SERVER_ERROR', errorText: msg } });
      }
    } catch {}

    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
