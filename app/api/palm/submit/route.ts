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
  | 'HEART'
  | 'HEAD'
  | 'LIFE'
  | 'FATE'
  | 'SUN'
  | 'MERCURY'
  | 'MOUNTS'
  | 'HANDS_DIFF';

type Handedness = 'RIGHT' | 'LEFT' | 'AMBI';

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

function lc(v: any) {
  return String(v ?? '').trim().toLowerCase();
}

function isPaidPricing(pricingJson: any): boolean {
  const status = lc(pricingJson?.yookassa?.status);

  if (['succeeded', 'paid', 'success', 'captured', 'waiting_for_capture', 'authorized'].includes(status)) {
    return true;
  }

  return false;
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
    const scanId = String(body.scanId || '').trim();
    const handedness = String(body.handedness || '').trim() as Handedness;
    const dob = String(body.dob || '').trim();
    const age = safeNum(body.age);

    const selected = normalizeSelected(body.selected);
    const selectedList = pickSelected(selected);

    const clientPriceRub = safeNum(body.priceRub);
    const clientTotalRub = safeNum(body.totalRub);

    if (!initData) return NextResponse.json({ ok: false, error: 'NO_INIT_DATA' }, { status: 401 });
    if (!scanId) return NextResponse.json({ ok: false, error: 'NO_SCAN_ID' }, { status: 400 });
    if (!['RIGHT', 'LEFT', 'AMBI'].includes(handedness)) {
      return NextResponse.json({ ok: false, error: 'BAD_HANDEDNESS' }, { status: 400 });
    }
    if (!dob) return NextResponse.json({ ok: false, error: 'NO_DOB' }, { status: 400 });
    if (!selectedList.length) return NextResponse.json({ ok: false, error: 'NO_SELECTED' }, { status: 400 });

    const v = verifyTelegramWebAppInitData(initData, botToken);
    if (!v.ok) return NextResponse.json({ ok: false, error: v.error }, { status: 401 });

    const user = await prisma.user.findUnique({
      where: { telegramId: v.user.id },
      select: { id: true },
    });

    if (!user) return NextResponse.json({ ok: false, error: 'NO_USER' }, { status: 404 });

    const scan = await prisma.palmScan.findUnique({
      where: { id: scanId },
      select: {
        id: true,
        userId: true,
        leftImageUrl: true,
        rightImageUrl: true,
      },
    });

    if (!scan) return NextResponse.json({ ok: false, error: 'NO_SCAN' }, { status: 404 });
    if (scan.userId !== user.id) return NextResponse.json({ ok: false, error: 'FORBIDDEN' }, { status: 403 });
    if (!scan.leftImageUrl || !scan.rightImageUrl) {
      return NextResponse.json({ ok: false, error: 'NO_PHOTOS' }, { status: 400 });
    }

    const modulePriceRub =
      Number.isFinite(clientPriceRub as number) && (clientPriceRub as number) > 0
        ? Number(clientPriceRub)
        : 39;

    const paidCount = selectedList.length;
    const totalRub = paidCount * modulePriceRub;

    if (!Number.isFinite(totalRub) || totalRub <= 0) {
      return NextResponse.json({ ok: false, error: 'BAD_TOTAL_RUB' }, { status: 400 });
    }

    if (clientTotalRub !== null && Number(clientTotalRub) !== totalRub) {
      console.log('[PALM_SUBMIT_TOTAL_MISMATCH]', {
        clientTotalRub,
        serverTotalRub: totalRub,
        paidCount,
        modulePriceRub,
      });
    }

    const inputJson = {
      scanId,
      handedness,
      dob,
      age,
      selected,
      selectedList,
      clientPricing: {
        totalRub: clientTotalRub,
        priceRub: clientPriceRub,
      },
      serverPricing: {
        modulePriceRub,
        paidCount,
        totalRub,
      },
      leftUrl: scan.leftImageUrl ?? null,
      rightUrl: scan.rightImageUrl ?? null,
      submittedAt: new Date().toISOString(),
    };

    const existing = await prisma.report.findFirst({
      where: {
        userId: user.id,
        type: 'PALM',
        palmScanId: scanId,
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
        scanId,
        reportId: existing.id,
        selectedList,
        totalRub,
        paidCount,
        alreadyPaid: true,
      });
    }

    const pricingJson = {
      kind: 'PALM',
      modulePriceRub,
      paidCount,
      totalRub,
      selected,
      selectedList,
    };

    if (existing) {
      const prev =
        existing.pricingJson && typeof existing.pricingJson === 'object'
          ? (existing.pricingJson as any)
          : {};

      const updated = await prisma.report.update({
        where: { id: existing.id },
        data: {
          input: inputJson,
          priceRub: modulePriceRub,
          totalRub,
          pricingJson: {
            ...prev,
            ...pricingJson,
          },
          errorCode: null,
          errorText: null,
        },
        select: { id: true },
      });

      return NextResponse.json({
        ok: true,
        scanId,
        reportId: updated.id,
        selectedList,
        totalRub,
        paidCount,
      });
    }

    const created = await prisma.report.create({
      data: {
        userId: user.id,
        type: 'PALM',
        status: 'DRAFT',
        palmScanId: scanId,
        input: inputJson,
        priceRub: modulePriceRub,
        totalRub,
        pricingJson,
      },
      select: { id: true },
    });

    return NextResponse.json({
      ok: true,
      scanId,
      reportId: created.id,
      selectedList,
      totalRub,
      paidCount,
    });
  } catch (e: any) {
    console.error('[PALM_SUBMIT_ERROR]', e);
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
