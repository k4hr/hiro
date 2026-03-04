/* path: lib/yookassa.ts */
import crypto from 'crypto';

function mustEnv(name: string): string {
  const v = String(process.env[name] ?? '').trim();
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}

export const ykShopId = mustEnv('YOOKASSA_SHOP_ID');
export const ykSecret = mustEnv('YOOKASSA_SECRET_KEY');
export const ykReturnUrl = mustEnv('YOOKASSA_RETURN_URL');

export function basicAuthHeader() {
  // ЮKassa: Basic base64(shopId:secretKey)
  const token = Buffer.from(`${ykShopId}:${ykSecret}`).toString('base64');
  return `Basic ${token}`;
}

export function makeIdempotenceKey(prefix = 'yk') {
  return `${prefix}_${crypto.randomUUID()}`;
}
