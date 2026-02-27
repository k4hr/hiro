/* path: app/api/palm/submit/route.ts */
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

export async function POST(req: Request) {
  try {
    const botToken = envClean('TELEGRAM_BOT_TOKEN');
    if (!botToken) return NextResponse.json({ ok: false, error: 'NO_BOT_TOKEN' }, { status: 500 });

    const body = (await req.json().catch(() => null)) as any;
    if (!body) return NextResponse.json({ ok: false, error: 'BAD_JSON' }, { status: 400 });

    const initData = String(body.initData || '').trim();
    const scanId = String(body.scanId || '').trim();

    const handedness = String(body.handedness || '').trim() as Handedness;
    const dob = String(body.dob || '').trim();
    const age = body.age === null || body.age === undefined ? null : Number(body.age);

    const selected = body.selected as Record<string, any> | undefined;
    const selectedList = pickSelected(selected);

    const totalRub = Number(body.totalRub ?? 0);
    const priceRub = Number(body.priceRub ?? 0);

    if (!initData) return NextResponse.json({ ok: false, error: 'NO_INIT_DATA' }, { status: 401 });
    if (!scanId) return NextResponse.json({ ok: false, error: 'NO_SCAN_ID' }, { status: 400 });
    if (!['RIGHT', 'LEFT', 'AMBI'].includes(handedness)) return NextResponse.json({ ok: false, error: 'BAD_HANDEDNESS' }, { status: 400 });
    if (!dob) return NextResponse.json({ ok: false, error: 'NO_DOB' }, { status: 400 });
    if (!selectedList.length) return NextResponse.json({ ok: false, error: 'NO_SELECTED' }, { status: 400 });

    const v = verifyTelegramWebAppInitData(initData, botToken);
    if (!v.ok) return NextResponse.json({ ok: false, error: v.error }, { status: 401 });

    const telegramId = v.user.id;
    const user = await prisma.user.findUnique({ where: { telegramId }, select: { id: true } });
    if (!user) return NextResponse.json({ ok: false, error: 'NO_USER' }, { status: 404 });

    const scan = await prisma.palmScan.findUnique({
      where: { id: scanId },
      select: { id: true, userId: true, leftImageUrl: true, rightImageUrl: true },
    });
    if (!scan) return NextResponse.json({ ok: false, error: 'NO_SCAN' }, { status: 404 });
    if (scan.userId !== user.id) return NextResponse.json({ ok: false, error: 'FORBIDDEN' }, { status: 403 });

    const inputJson = {
      scanId,
      handedness,
      dob,
      age,
      selected: selected ?? null,
      selectedList,
      totalRub: Number.isFinite(totalRub) ? totalRub : null,
      priceRub: Number.isFinite(priceRub) ? priceRub : null,
      leftUrl: scan.leftImageUrl ?? null,
      rightUrl: scan.rightImageUrl ?? null,
      submittedAt: new Date().toISOString(),
    };

    // Ищем существующий DRAFT report по этому scanId (чтобы не плодить)
    const existing = await prisma.report.findFirst({
      where: { userId: user.id, type: 'PALM', palmScanId: scanId, status: 'DRAFT' },
      orderBy: { createdAt: 'desc' },
      select: { id: true },
    });

    const report = existing
      ? await prisma.report.update({
          where: { id: existing.id },
          data: { input: inputJson },
          select: { id: true },
        })
      : await prisma.report.create({
          data: {
            userId: user.id,
            type: 'PALM',
            status: 'DRAFT',
            palmScanId: scanId,
            input: inputJson,
          },
          select: { id: true },
        });

    return NextResponse.json({ ok: true, scanId, reportId: report.id, selectedList });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ ok: false, error: 'SUBMIT_FAILED', hint: String(e?.message || 'See server logs') }, { status: 500 });
  }
}
