/* path: app/api/palm/create/route.ts */
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
  // ожидаем dd.mm.yyyy
  if (!/^\d{2}\.\d{2}\.\d{4}$/.test(dob)) return null;
  const [dd, mm, yyyy] = dob.split('.');
  const y = Number(yyyy);
  const m = Number(mm);
  const d = Number(dd);
  if (!y || !m || !d) return null;
  if (y < 1900 || y > 2100) return null;
  if (m < 1 || m > 12) return null;
  if (d < 1 || d > 31) return null;

  // безопасно: UTC полночь
  const iso = `${yyyy}-${mm}-${dd}T00:00:00.000Z`;
  const dt = new Date(iso);
  if (!Number.isFinite(dt.getTime())) return null;
  return dt;
}

export async function POST(req: Request) {
  try {
    const botToken = envClean('TELEGRAM_BOT_TOKEN');
    if (!botToken) return NextResponse.json({ ok: false, error: 'NO_BOT_TOKEN' }, { status: 500 });

    const body = (await req.json().catch(() => null)) as any;
    const initData = String(body?.initData || '').trim();
    const handedness = String(body?.handedness || '').trim(); // RIGHT | LEFT | AMBI
    const dob = String(body?.dob || '').trim(); // dd.mm.yyyy

    if (!initData) return NextResponse.json({ ok: false, error: 'NO_INIT_DATA' }, { status: 401 });
    if (!handedness) return NextResponse.json({ ok: false, error: 'NO_HANDEDNESS' }, { status: 400 });
    if (!['RIGHT', 'LEFT', 'AMBI'].includes(handedness)) {
      return NextResponse.json({ ok: false, error: 'BAD_HANDEDNESS' }, { status: 400 });
    }

    const dobDate = parseDobToUtcDate(dob);
    if (!dobDate) return NextResponse.json({ ok: false, error: 'BAD_DOB' }, { status: 400 });

    const v = verifyTelegramWebAppInitData(initData, botToken);
    if (!v.ok) return NextResponse.json({ ok: false, error: v.error }, { status: 401 });

    const telegramId = v.user.id;

    const user = await prisma.user.upsert({
      where: { telegramId },
      update: {
        username: v.user.username,
        firstName: v.user.first_name,
        lastName: v.user.last_name,
      },
      create: {
        telegramId,
        username: v.user.username,
        firstName: v.user.first_name,
        lastName: v.user.last_name,
        locale: 'ru',
      },
      select: { id: true, telegramId: true },
    });

    await prisma.profile.upsert({
      where: { userId: user.id },
      update: { dob: dobDate, handedness },
      create: { userId: user.id, dob: dobDate, handedness },
      select: { id: true },
    });

    const scan = await prisma.palmScan.create({
      data: {
        userId: user.id,
        status: 'DRAFT',
      },
      select: { id: true },
    });

    return NextResponse.json({ ok: true, scanId: scan.id });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ ok: false, error: 'CREATE_FAILED', hint: String(e?.message || 'See server logs') }, { status: 500 });
  }
}
