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

const PAID_KEYS: OptionKey[] = ['ACOMPAT_LOVE', 'ACOMPAT_SEX', 'ACOMPAT_MONEY', 'ACOMPAT_CONFLICT', 'ACOMPAT_FAMILY'];

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
  const y = Number(yyyy);
  const m = Number(mm);
  const d = Number(dd);
  if (!y || !m || !d) return null;
  if (y < 1900 || y > 2100) return null;
  if (m < 1 || m > 12) return null;
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

function countPaidSelected(selected: Record<OptionKey, boolean>) {
  return PAID_KEYS.filter((k) => selected[k] === true).length;
}

function lc(v: any) {
  return String(v ?? '').trim().toLowerCase();
}

function isPaidPricing(pricingJson: any): boolean {
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
  try {
    const botToken = envClean('TELEGRAM_BOT_TOKEN');
    if (!botToken) {
      return NextResponse.json({ ok: false, error: 'NO_BOT_TOKEN' }, { status: 500 });
    }

    const body = (await req.json().catch(() => null)) as any;
    if (!body) {
      return NextResponse.json({ ok: false, error: 'BAD_JSON' }, { status: 400 });
    }

    const initData = String(body.initData || '').trim();
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

    const selected = normalizeSelected(body.selected);

    const clientPriceRub = safeNum(body.priceRub);
    const clientSummaryPriceRub = safeNum(body.summaryPriceRub);
    const clientTotalRub = safeNum(body.totalRub);

    if (!initData) return NextResponse.json({ ok: false, error: 'NO_INIT_DATA' }, { status: 401 });
    if (!dob1 || !dob2) return NextResponse.json({ ok: false, error: 'NO_DOB' }, { status: 400 });

    const d1 = parseDobToUtcDate(dob1);
    const d2 = parseDobToUtcDate(dob2);
    if (!d1 || !d2) return NextResponse.json({ ok: false, error: 'BAD_DOB' }, { status: 400 });

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

    const priceRub = Number.isFinite(clientPriceRub as number) && (clientPriceRub as number) > 0 ? Number(clientPriceRub) : 39;
    const summaryPriceRub =
      Number.isFinite(clientSummaryPriceRub as number) && (clientSummaryPriceRub as number) > 0 ? Number(clientSummaryPriceRub) : 49;

    const paidCount = countPaidSelected(selected);
    const totalRub = paidCount * priceRub + summaryPriceRub;

    if (!Number.isFinite(totalRub) || totalRub <= 0) {
      return NextResponse.json({ ok: false, error: 'BAD_TOTAL_RUB' }, { status: 400 });
    }

    if (clientTotalRub !== null && Number(clientTotalRub) !== totalRub) {
      console.log('[ASTRO_COMPAT_SUBMIT_TOTAL_MISMATCH]', {
        clientTotalRub,
        serverTotalRub: totalRub,
        paidCount,
        priceRub,
        summaryPriceRub,
      });
    }

    const inputJson = {
      mode: 'ASTRO_COMPAT',
      a: {
        dob: dob1,
        age: age1,
        birthPlace: place1,
        birthTime: time1,
        accuracyLevel: acc1,
      },
      b: {
        dob: dob2,
        age: age2,
        birthPlace: place2,
        birthTime: time2,
        accuracyLevel: acc2,
      },
      selected,
      clientPricing: {
        totalRub: clientTotalRub,
        priceRub: clientPriceRub,
        summaryPriceRub: clientSummaryPriceRub,
      },
      serverPricing: {
        paidCount,
        priceRub,
        summaryPriceRub,
        totalRub,
      },
      savedAt: new Date().toISOString(),
    };

    const existing = await prisma.report.findFirst({
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
        pricingJson: true,
      },
    });

    if (existing && isPaidPricing(existing.pricingJson)) {
      return NextResponse.json({
        ok: true,
        reportId: existing.id,
        totalRub,
        paidCount,
        alreadyPaid: true,
      });
    }

    const nextPricingJson = {
      kind: 'ASTRO_COMPAT',
      totalRub,
      priceRub,
      summaryPriceRub,
      paidCount,
      selected,
      persons: {
        a: {
          dob: dob1,
          birthPlace: place1 || null,
          birthTime: time1 || null,
          accuracyLevel: acc1 ?? null,
        },
        b: {
          dob: dob2,
          birthPlace: place2 || null,
          birthTime: time2 || null,
          accuracyLevel: acc2 ?? null,
        },
      },
      createdAt: new Date().toISOString(),
    };

    if (existing) {
      const prev = existing.pricingJson && typeof existing.pricingJson === 'object' ? (existing.pricingJson as any) : {};
      const pricingJson = {
        ...prev,
        ...nextPricingJson,
      };

      const updated = await prisma.report.update({
        where: { id: existing.id },
        data: {
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

          priceRub,
          totalRub,
          pricingJson,
          errorCode: null,
          errorText: null,
        },
        select: { id: true },
      });

      return NextResponse.json({
        ok: true,
        reportId: updated.id,
        totalRub,
        paidCount,
      });
    }

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

        priceRub,
        totalRub,
        pricingJson: nextPricingJson,
      },
      select: { id: true },
    });

    return NextResponse.json({
      ok: true,
      reportId: created.id,
      totalRub,
      paidCount,
    });
  } catch (e: any) {
    console.error('[ASTRO_COMPAT_SUBMIT_ERROR]', e);
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
