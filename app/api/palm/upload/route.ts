/* path: app/api/palm/upload/route.ts */
import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { prisma } from '@/lib/prisma';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

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

function safeExt(mime: string) {
  if (mime === 'image/jpeg') return 'jpg';
  if (mime === 'image/png') return 'png';
  if (mime === 'image/webp') return 'webp';
  if (mime === 'image/heic') return 'heic';
  if (mime === 'image/heif') return 'heif';
  return 'bin';
}

function isImageMime(mime: string) {
  return (
    mime === 'image/jpeg' ||
    mime === 'image/png' ||
    mime === 'image/webp' ||
    mime === 'image/heic' ||
    mime === 'image/heif'
  );
}

function rand() {
  return crypto.randomBytes(6).toString('hex');
}

function makeS3() {
  const accountId = envClean('R2_ACCOUNT_ID');
  const accessKeyId = envClean('R2_ACCESS_KEY_ID');
  const secretAccessKey = envClean('R2_SECRET_ACCESS_KEY');

  if (!accountId || !accessKeyId || !secretAccessKey) {
    throw new Error('NO_R2_ENV: Set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY');
  }

  return new S3Client({
    region: 'auto',
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
    forcePathStyle: true,
    requestChecksumCalculation: 'WHEN_REQUIRED',
    responseChecksumValidation: 'WHEN_REQUIRED',
  } as any);
}

function publicUrlForKey(key: string) {
  const base = envClean('R2_PUBLIC_BASE_URL');
  if (!base) return null;
  return `${base.replace(/\/$/, '')}/${key}`;
}

function pickS3Error(e: any) {
  return {
    name: e?.name,
    message: e?.message,
    code: e?.Code || e?.code,
    statusCode: e?.$metadata?.httpStatusCode,
    requestId: e?.$metadata?.requestId,
    cfId: e?.$metadata?.cfId,
  };
}

export async function POST(req: Request) {
  try {
    const botToken = envClean('TELEGRAM_BOT_TOKEN');
    if (!botToken) return NextResponse.json({ ok: false, error: 'NO_BOT_TOKEN' }, { status: 500 });

    const r2Bucket = envClean('R2_BUCKET');
    if (!r2Bucket) return NextResponse.json({ ok: false, error: 'NO_R2_BUCKET' }, { status: 500 });

    const form = await req.formData();
    const initData = String(form.get('initData') || '').trim();
    const scanId = String(form.get('scanId') || '').trim();
    const side = String(form.get('side') || '').trim(); // left | right
    const file = form.get('photo');

    if (!initData) return NextResponse.json({ ok: false, error: 'NO_INIT_DATA' }, { status: 401 });
    if (!scanId) return NextResponse.json({ ok: false, error: 'NO_SCAN_ID' }, { status: 400 });
    if (side !== 'left' && side !== 'right') return NextResponse.json({ ok: false, error: 'BAD_SIDE' }, { status: 400 });
    if (!(file instanceof File)) return NextResponse.json({ ok: false, error: 'FILE_REQUIRED' }, { status: 400 });

    const v = verifyTelegramWebAppInitData(initData, botToken);
    if (!v.ok) return NextResponse.json({ ok: false, error: v.error }, { status: 401 });

    const telegramId = v.user.id;

    const user = await prisma.user.findUnique({
      where: { telegramId },
      select: { id: true },
    });
    if (!user) return NextResponse.json({ ok: false, error: 'NO_USER' }, { status: 404 });

    const scan = await prisma.palmScan.findUnique({
      where: { id: scanId },
      select: { id: true, userId: true },
    });
    if (!scan) return NextResponse.json({ ok: false, error: 'NO_SCAN' }, { status: 404 });
    if (scan.userId !== user.id) return NextResponse.json({ ok: false, error: 'FORBIDDEN' }, { status: 403 });

    const mime = String(file.type || '').trim();
    if (!isImageMime(mime)) {
      return NextResponse.json({ ok: false, error: 'BAD_MIME', mime }, { status: 400 });
    }

    const maxPhoto = 25 * 1024 * 1024;
    if (file.size > maxPhoto) {
      return NextResponse.json({ ok: false, error: 'FILE_TOO_LARGE', maxBytes: maxPhoto, gotBytes: file.size }, { status: 400 });
    }

    const s3 = makeS3();
    const key = `palmscans/${scanId}/${side}-${Date.now()}-${rand()}.${safeExt(mime)}`;
    const body = Buffer.from(await file.arrayBuffer());

    try {
      await s3.send(
        new PutObjectCommand({
          Bucket: r2Bucket,
          Key: key,
          Body: body,
          ContentType: mime,
          ContentLength: body.length,
          CacheControl: 'public, max-age=31536000, immutable',
        })
      );
    } catch (e) {
      const details = pickS3Error(e);
      console.error('R2 upload palm photo failed', { scanId, side, mime, size: file.size, key, details }, e);
      return NextResponse.json({ ok: false, error: 'R2_UPLOAD_FAILED', details }, { status: 502 });
    }

    const url = publicUrlForKey(key) || key;
    const meta = {
      key,
      url,
      mime,
      sizeBytes: file.size,
      uploadedAt: new Date().toISOString(),
      side,
    };

    if (side === 'left') {
      await prisma.palmScan.update({
        where: { id: scanId },
        data: { leftImageUrl: url, leftMeta: meta },
      });
    } else {
      await prisma.palmScan.update({
        where: { id: scanId },
        data: { rightImageUrl: url, rightMeta: meta },
      });
    }

    return NextResponse.json({ ok: true, scanId, side, url });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ ok: false, error: 'UPLOAD_FAILED', hint: String(e?.message || 'See server logs') }, { status: 500 });
  }
}
