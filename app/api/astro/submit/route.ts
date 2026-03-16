/* path: app/api/astro/submit/route.ts */
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
const SUMMARY_KEY: OptionKey = 'ASTRO_FORMULA';

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

function pickSelectedList(selected: Record<OptionKey, boolean>): OptionKey[] {
  const out = PAID_KEYS.filter((k) => selected[k] === true);
  out.push(SUMMARY_KEY);
  return out;
}

function countPaidSelected(selected: Record<OptionKey, boolean>) {
  return PAID_KEYS.filter((k) => selected[k] === true).length;
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
  try {
    const botToken = envClean('TELEGRAM_BOT_TOKEN');
    if (!botToken) return NextResponse.json({ ok: false, error: 'NO_BOT_TOKEN' }, { status: 500 });

    const body = (await req.json().catch(() => null)) as any;
    if (!body) return NextResponse.json({ ok: false, error: 'BAD_JSON' }, { status: 400 });

    const initData = String(body.initData || '').trim();
    const dob = String(body.dob || '').trim();
    const birthPlace = cleanText(body.birthPlace, 96);
    const birthTime = cleanTime(body.birthTime);
    const accuracyLevelRaw = safeNum(body.accuracyLevel);
    const accuracyLevel =
      accuracyLevelRaw !== null ? Math.max(0, Math.min(3, Math.trunc(accuracyLevelRaw))) : 0;

    const age = safeNum(body.age);
    const selected = normalizeSelected(body.selected);

    const clientPriceRub = safeNum(body.priceRub);
    const clientSummaryPriceRub = safeNum(body.summaryPriceRub);
    const clientTotalRub = safeNum(body.totalRub);

    if (!initData) return NextResponse.json({ ok: false, error: 'NO_INIT_DATA' }, { status: 401 });
    if (!dob) return NextResponse.json({ ok: false, error: 'NO_DOB' }, { status: 400 });

    const dobDate = parseDobToUtcDate(dob);
    if (!dobDate) return NextResponse.json({ ok: false, error: 'BAD_DOB' }, { status: 400 });

    const v = verifyTelegramWebAppInitData(initData, botToken);
    if (!v.ok) return NextResponse.json({ ok: false, error: v.error }, { status: 401 });

    const user = await prisma.user.upsert({
      where: { telegramId: v.user.id },
      update: {
        username: v.user.username,
        firstName: v.user.first_name,
        lastName: v.user.last_name,
      },
      create: {
        telegramId: v.user.id,
        username: v.user.username,
        firstName: v.user.first_name,
        lastName: v.user.last_name,
        locale: 'ru',
      },
      select: { id: true },
    });

    const modulePriceRub = 39;
    const summaryPriceRub = 49;

    const selectedCountPaid = countPaidSelected(selected);
    const selectedList = pickSelectedList(selected);
    const totalRub = selectedCountPaid * modulePriceRub + summaryPriceRub;

    if (!Number.isFinite(totalRub) || totalRub <= 0) {
      return NextResponse.json({ ok: false, error: 'BAD_TOTAL_RUB' }, { status: 400 });
    }

    const inputJson = {
      mode: 'ASTRO',
      astroMode: 'CHART',
      dob,
      age,
      birthPlace,
      birthTime,
      accuracyLevel,
      selected,
      selectedList,
      clientPricing: {
        totalRub: clientTotalRub,
        priceRub: clientPriceRub,
        summaryPriceRub: clientSummaryPriceRub,
      },
      serverPricing: {
        modulePriceRub,
        summaryPriceRub,
        selectedCountPaid,
        totalRub,
      },
      savedAt: new Date().toISOString(),
    };

    const basePricingJson = {
      kind: 'ASTRO_CHART',
      modulePriceRub,
      summaryPriceRub,
      selectedCountPaid,
      totalRub,
      selected,
      selectedList,
      accuracyLevel,
    };

    const existingPaid = await prisma.report.findFirst({
      where: {
        userId: user.id,
        type: 'ASTRO',
        astroMode: 'CHART',
        astroDob: dobDate,
        astroCity: birthPlace || null,
        astroTime: birthTime || null,
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        pricingJson: true,
      },
    });

    if (existingPaid && isPaidPricing(existingPaid.pricingJson)) {
      await prisma.report.update({
        where: { id: existingPaid.id },
        data: {
          input: inputJson,
          priceRub: modulePriceRub,
          totalRub,
          pricingJson: {
            ...(typeof existingPaid.pricingJson === 'object' && existingPaid.pricingJson ? existingPaid.pricingJson : {}),
            ...basePricingJson,
          },
          errorCode: null,
          errorText: null,
        },
      });

      return NextResponse.json({
        ok: true,
        reportId: existingPaid.id,
        totalRub,
        selectedCountPaid,
        alreadyPaid: true,
      });
    }

    const draft = await prisma.report.findFirst({
      where: {
        userId: user.id,
        type: 'ASTRO',
        status: 'DRAFT',
        astroMode: 'CHART',
        astroDob: dobDate,
        astroCity: birthPlace || null,
        astroTime: birthTime || null,
      },
      orderBy: { createdAt: 'desc' },
      select: { id: true, pricingJson: true },
    });

    if (draft) {
      await prisma.report.update({
        where: { id: draft.id },
        data: {
          input: inputJson,
          type: 'ASTRO',
          astroMode: 'CHART',
          astroDob: dobDate,
          astroCity: birthPlace || null,
          astroTime: birthTime || null,
          astroAccuracyLevel: accuracyLevel,
          priceRub: modulePriceRub,
          totalRub,
          pricingJson: {
            ...(typeof draft.pricingJson === 'object' && draft.pricingJson ? draft.pricingJson : {}),
            ...basePricingJson,
          },
          errorCode: null,
          errorText: null,
          text: null,
          json: null,
          status: 'DRAFT',
        },
      });

      return NextResponse.json({
        ok: true,
        reportId: draft.id,
        totalRub,
        selectedCountPaid,
        alreadyPaid: false,
      });
    }

    const created = await prisma.report.create({
      data: {
        userId: user.id,
        type: 'ASTRO',
        status: 'DRAFT',
        input: inputJson,
        astroMode: 'CHART',
        astroDob: dobDate,
        astroCity: birthPlace || null,
        astroTime: birthTime || null,
        astroAccuracyLevel: accuracyLevel,
        priceRub: modulePriceRub,
        totalRub,
        pricingJson: basePricingJson,
      },
      select: { id: true },
    });

    return NextResponse.json({
      ok: true,
      reportId: created.id,
      totalRub,
      selectedCountPaid,
      alreadyPaid: false,
    });
  } catch (e: any) {
    console.error('[ASTRO_SUBMIT_ERROR]', e);
    return NextResponse.json(
      {
        ok: false,
        error: 'SUBMIT_FAILED',
        hint: String(e?.message || 'See server logs'),
      },
      { status: 500 }
    );
  }
}
