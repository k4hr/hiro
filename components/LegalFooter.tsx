/* path: components/LegalFooter.tsx */
'use client';

import Link from 'next/link';

type LegalFooterProps = {
  /** Явно включить показ футера. Без force компонент вернёт null. */
  force?: boolean;
};

/**
 * LegalFooter
 * По умолчанию НИЧЕГО не рендерит.
 * Появляется только там, где ты явно пишешь <LegalFooter force />.
 */
export default function LegalFooter({ force }: LegalFooterProps = {}) {
  if (!force) return null;

  return (
    <p
      style={{
        marginTop: 24,
        marginBottom: 0,
        fontSize: 12,
        lineHeight: 1.4,
        color: 'rgba(15, 23, 42, 0.55)', // мягкий серый
        textAlign: 'center',
      }}
    >
      Оформляя подписку, вы принимаете условия{' '}
      <Link
        href="/info/offer"
        style={{ color: 'inherit', textDecoration: 'underline' }}
      >
        публичной оферты
      </Link>
      .
    </p>
  );
}
