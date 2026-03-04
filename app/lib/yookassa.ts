/* path: lib/yookassa.ts */
import crypto from 'crypto';

function envClean(name: string) {
  return String(process.env[name] ?? '').replace(/[\r\n]/g, '').trim();
}

export type YookassaConfig = {
  shopId: string;
  secretKey: string;
  returnUrl: string;
};

export function getYookassaConfig(): YookassaConfig | null {
  const shopId = envClean('YOOKASSA_SHOP_ID');
  const secretKey = envClean('YOOKASSA_SECRET_KEY');
  const returnUrl = envClean('YOOKASSA_RETURN_URL');

  if (!shopId || !secretKey || !returnUrl) return null;
  return { shopId, secretKey, returnUrl };
}

export function basicAuthHeader(cfg: YookassaConfig) {
  const token = Buffer.from(`${cfg.shopId}:${cfg.secretKey}`).toString('base64');
  return `Basic ${token}`;
}

export function makeIdempotenceKey(prefix = 'yk') {
  return `${prefix}_${crypto.randomUUID()}`;
}
