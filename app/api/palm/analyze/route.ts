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

const ALL_KEYS: OptionKey[] = ['HEART', 'HEAD', 'LIFE', 'FATE', 'SUN', 'MERCURY', 'MOUNTS', 'HANDS_DIFF'];

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

function safeNum(v: any): number | null {
  if (v === null || v === undefined) return null;
  const n = Number(v);
  if (!Number.isFinite(n)) return null;
  return n;
}

function normalizeSelected(v: any): Record<OptionKey, boolean> {
  const src = v && typeof v === 'object' ? v : {};
  return {
    HEART: src.HEART === true,
    HEAD: src.HEAD === true,
    LIFE: src.LIFE === true,
    FATE: src.FATE === true,
    SUN: src.SUN === true,
    MERCURY: src.MERCURY === true,
    MOUNTS: src.MOUNTS === true,
    HANDS_DIFF: src.HANDS_DIFF === true,
  };
}

function pickSelected(selected: Record<OptionKey, boolean>): OptionKey[] {
  return ALL_KEYS.filter((k) => selected[k] === true);
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
      return String(k);
  }
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
  const status = lc(pricingJson?.yookassa?.status);
  return ['succeeded', 'paid', 'success', 'captured', 'waiting_for_capture', 'authorized'].includes(status);
}

function buildPrompt(args: {
  handedness: Handedness;
  dob: string;
  age: number | null;
  selectedList: OptionKey[];
}) {
  const selectedTitles = args.selectedList.map((k) => optionTitle(k)).join('\n');
  const ageLine = Number.isFinite(args.age as any) && args.age !== null ? String(args.age) : '';

  return [
    'Ты — эксперт по чтению ладони. Проанализируй ДВА фото ладоней: фото №1 — левая, фото №2 — правая.',
    '',
    'КРИТИЧЕСКИЕ ПРАВИЛА ВЫВОДА:',
    '1) Никаких символов Markdown: НЕ используй ##, **, *, _, `, > и любые оформлялки. Не используй списки с тире. Только обычный текст.',
    '2) Не пиши оговорки вроде “развлекательная интерпретация”, “не медицина”, “не диагностика”, “обратитесь к врачу”. Вообще не упоминай это.',
    '3) Не делай вступление. Сразу начинай с пункта 1).',
    '4) Не задавай вопросов пользователю.',
    '5) Если что-то плохо видно на фото — скажи кратко: “на фото видно нечетко” и не придумывай детали.',
    '',
    'ДАННЫЕ ПОЛЬЗОВАТЕЛЯ:',
    `handedness: ${args.handedness}`,
    `дата рождения: ${args.dob}`,
    `возраст: ${ageLine}`,
    '',
    'ПРАВИЛО АКТИВНОЙ РУКИ:',
    'RIGHT: активная правая, пассивная левая',
    'LEFT: активная левая, пассивная правая',
    'AMBI: активная та, которой чаще пользуются; если неясно — ориентируйся на более выраженную руку, без вопросов пользователю',
    '',
    'ФОРМАТ ОТВЕТА (СТРОГО):',
    'Пункты только в виде 1), 2), 3)… в порядке, который дан в СПИСКЕ ПУНКТОВ НИЖЕ.',
    'Каждый пункт должен содержать ровно 4 блока в таком порядке:',
    'А) Что видно:',
    'Б) Значение:',
    'В) Риск-зона:',
    'Г) Практика (5 советов):',
    '',
    'ТРЕБОВАНИЯ К СОДЕРЖАНИЮ:',
    'А) Что видно:',
    'Пиши конкретные визуальные признаки: где проходит линия, длинная или короткая, глубокая или тонкая, ровная или ломаная, есть ли разрывы, островки, ветви, направление, четкость на левой и на правой.',
    'Обязательно сравни левую и правую и сделай вывод “на активной выражено сильнее/слабее”, если это видно.',
    'Если не видно — “на фото видно нечетко” и только безопасное наблюдение.',
    '',
    'Б) Значение:',
    'Не философствуй. Связывай 2–4 наблюдения с 2–4 конкретными поведенческими выводами.',
    'Формулируй выводы так, чтобы их можно было проверить в жизни: стиль решений, стиль отношений, реакция на стресс, стратегия работы, способ общения.',
    '',
    'В) Риск-зона:',
    '1–2 конкретных сценария, где человек сам себе мешает. Формат: “когда происходит X, вы делаете Y, итог Z”.',
    'Без общих слов. Если не уверен — скажи “по фото видно нечетко” и дай мягкую версию.',
    '',
    'Г) Практика (5 советов):',
    'Ровно 5 советов.',
    'Каждый совет — одна строка, в формате действия: “Сделай…”, “Введи правило…”, “Раз в неделю…”, “Ограничь…”, “Запланируй…”.',
    'Советы должны быть реально применимы: привычки, коммуникация, принятие решений, дисциплина, границы, фокус, восстановление.',
    'Не давай медицинские назначения и не используй медицинские формулировки.',
    '',
    'СПИСОК ПУНКТОВ ДЛЯ РАЗБОРА (ИМЕННО ИХ И ТОЛЬКО ИХ):',
    selectedTitles,
    '',
    'ПОСЛЕ ВСЕХ ПУНКТОВ ДОБАВЬ ДВА ДОПОЛНИТЕЛЬНЫХ БЛОКА:',
    'Общий вывод:',
    '6–9 предложений.',
    'Объедини главные повторяющиеся темы из пунктов: сильные стороны, основной стиль поведения, ключевой ограничитель, куда растёт активная рука относительно пассивной.',
    '',
    'Общие советы:',
    'Ровно 7 советов, каждый с новой строки, формат: "1) ...", "2) ...", "3) ...".',
    'Только действия: правила, привычки, коммуникация, работа, режим, границы, фокус.',
    'Без воды и без повторов советов из пунктов.',
    '',
    'Ограничение объёма: каждый пункт 12–18 строк максимум.',
    '',
    'Начинай ответ сразу с “1) …”.',
    '',
    'Фото:',
    'Фото №1 — левая ладонь',
    'Фото №2 — правая ладонь',
  ].join('\n');
}

async function callOpenAI(args: { apiKey: string; prompt: string; leftUrl: string; rightUrl: string }) {
  const res = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${args.apiKey}`,
      'Content-Type': 'application/json',
    },
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

export async function POST(req: Request) {
  let scanId = '';
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
    scanId = String(body.scanId || '').trim();
    reportId = String(body.reportId || '').trim() || null;

    const handedness = String(body.handedness || '').trim() as Handedness;
    const dob = String(body.dob || '').trim();
    const age = safeNum(body.age);

    const selectedFixed = normalizeSelected(body.selected);
    const wantedList = pickSelected(selectedFixed);

    if (!initData) return NextResponse.json({ ok: false, error: 'NO_INIT_DATA' }, { status: 401 });
    if (!scanId) return NextResponse.json({ ok: false, error: 'NO_SCAN_ID' }, { status: 400 });
    if (!['RIGHT', 'LEFT', 'AMBI'].includes(handedness)) {
      return NextResponse.json({ ok: false, error: 'BAD_HANDEDNESS' }, { status: 400 });
    }
    if (!dob) return NextResponse.json({ ok: false, error: 'NO_DOB' }, { status: 400 });
    if (!wantedList.length) return NextResponse.json({ ok: false, error: 'NO_SELECTED' }, { status: 400 });

    const v = verifyTelegramWebAppInitData(initData, botToken);
    if (!v.ok) return NextResponse.json({ ok: false, error: v.error }, { status: 401 });

    const user = await prisma.user.findUnique({
      where: { telegramId: v.user.id },
      select: { id: true },
    });

    if (!user) {
      return NextResponse.json({ ok: false, error: 'NO_USER' }, { status: 404 });
    }

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

    if (!leftUrl || !rightUrl) {
      return NextResponse.json({ ok: false, error: 'NO_PHOTOS' }, { status: 400 });
    }

    let currentReport: any = null;

    if (reportId) {
      currentReport = await prisma.report.findFirst({
        where: {
          id: reportId,
          userId: user.id,
          type: 'PALM',
          palmScanId: scanId,
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
          type: 'PALM',
          palmScanId: scanId,
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

    if (
      String(currentReport.status || '').toUpperCase() === 'READY' &&
      typeof currentReport.text === 'string' &&
      currentReport.text.trim()
    ) {
      if (scan.status !== 'READY' || !scan.aiText) {
        await prisma.palmScan.update({
          where: { id: scanId },
          data: {
            status: 'READY',
            aiText: currentReport.text,
            aiJson: currentReport.json ?? scan.aiJson ?? null,
            errorCode: null,
            errorText: null,
          },
        });
      }

      return NextResponse.json({ ok: true, text: currentReport.text, cached: true });
    }

    if (scan.status === 'READY' && scan.aiText) {
      await prisma.report.update({
        where: { id: reportId! },
        data: {
          status: 'READY',
          text: scan.aiText,
          json: scan.aiJson ?? currentReport.json ?? null,
          errorCode: null,
          errorText: null,
        },
      });

      return NextResponse.json({ ok: true, text: scan.aiText, cached: true });
    }

    const lastReady = await prisma.report.findFirst({
      where: {
        userId: user.id,
        type: 'PALM',
        palmScanId: scanId,
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
          scanId,
          handedness,
          dob,
          age,
          selected: selectedFixed,
          selectedList: wantedList,
          leftUrl,
          rightUrl,
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

        await prisma.palmScan.update({
          where: { id: scanId },
          data: {
            status: 'READY',
            aiText: lastReady.text,
            aiJson: lastReady.json ?? null,
            errorCode: null,
            errorText: null,
            qualityFlag: false,
            qualityNote: null,
          },
        });

        return NextResponse.json({ ok: true, text: lastReady.text, cached: true });
      }
    }

    const inputJson = {
      scanId,
      handedness,
      dob,
      age,
      selected: selectedFixed,
      selectedList: wantedList,
      leftUrl,
      rightUrl,
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

    await prisma.palmScan.update({
      where: { id: scanId },
      data: {
        status: 'ANALYZING',
        errorCode: null,
        errorText: null,
        qualityFlag: false,
        qualityNote: null,
      },
    });

    const prompt = buildPrompt({
      handedness,
      dob,
      age,
      selectedList: wantedList,
    });

    const ai = await callOpenAI({ apiKey, prompt, leftUrl, rightUrl });

    if (!ai.ok) {
      await prisma.palmScan.update({
        where: { id: scanId },
        data: {
          status: 'FAILED',
          errorCode: 'OPENAI_FAILED',
          errorText: String(ai.error || 'OPENAI_FAILED'),
        },
      });

      await prisma.report.update({
        where: { id: reportId! },
        data: {
          status: 'FAILED',
          errorCode: 'OPENAI_FAILED',
          errorText: String(ai.error || 'OPENAI_FAILED'),
          json: ai.raw ?? null,
        },
      });

      return NextResponse.json(
        { ok: false, error: String(ai.error || 'OPENAI_FAILED') },
        { status: 500 }
      );
    }

    await prisma.palmScan.update({
      where: { id: scanId },
      data: {
        status: 'READY',
        aiText: ai.text,
        aiJson: ai.raw ?? null,
        errorCode: null,
        errorText: null,
      },
    });

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
      if (scanId) {
        await prisma.palmScan.update({
          where: { id: scanId },
          data: {
            status: 'FAILED',
            errorCode: 'SERVER_ERROR',
            errorText: msg,
          },
        });
      }
    } catch {}

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
