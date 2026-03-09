/* path: components/TelegramNoSwipeInit.tsx */
'use client';

import { useEffect } from 'react';

export default function TelegramNoSwipeInit() {
  useEffect(() => {
    const tg = (window as any)?.Telegram?.WebApp;
    if (!tg) return;

    const isIOS =
      tg.platform === 'ios' ||
      /iPhone|iPad|iPod/i.test(navigator.userAgent);

    // На iOS в Telegram сверху есть реальный оверлей ("Закрыть", "..."),
    // поэтому маленькой прибавки недостаточно.
    // Держим минимальный безопасный отступ, чтобы верхний блок не налезал.
    const IOS_MIN_SAFE_TOP = 56;
    const NON_IOS_EXTRA_TOP = 0;

    const setPxVar = (name: string, value: number) => {
      const v = Number.isFinite(value) ? value : 0;
      document.documentElement.style.setProperty(
        name,
        `${Math.max(0, Math.round(v))}px`
      );
    };

    const applyAll = () => {
      // 1) Высота вьюпорта Telegram
      const h = Number(tg.viewportHeight) || window.innerHeight;
      document.documentElement.style.setProperty('--tg-viewport-height', `${h}px`);

      // 2) Верхний safe area
      const rawTop =
        Number(tg.contentSafeAreaInset?.top) ||
        Number(tg.safeAreaInset?.top) ||
        Number(tg.safeArea?.top) ||
        0;

      // Для iOS берём либо safe inset от Telegram, либо наш минимальный запас
      const top = isIOS
        ? Math.max(rawTop, IOS_MIN_SAFE_TOP)
        : Math.max(0, rawTop + NON_IOS_EXTRA_TOP);

      setPxVar('--lm-safe-top', top);
    };

    try {
      tg.disableVerticalSwipes?.();
    } catch {}

    try {
      tg.expand?.();
    } catch {}

    try {
      tg.ready?.();
    } catch {}

    applyAll();

    const onViewportChanged = () => applyAll();

    try {
      tg.onEvent?.('viewportChanged', onViewportChanged);
    } catch {}

    window.addEventListener('resize', applyAll);

    return () => {
      try {
        tg.offEvent?.('viewportChanged', onViewportChanged);
      } catch {}

      window.removeEventListener('resize', applyAll);
    };
  }, []);

  return null;
}
