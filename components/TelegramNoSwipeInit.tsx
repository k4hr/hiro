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

    // Небольшая поправка под телеграм-оверлей ("Закрыть/…") на iOS
    const EXTRA_TOP = isIOS ? 12 : 0;

    const setPxVar = (name: string, value: number) => {
      const v = Number.isFinite(value) ? value : 0;
      document.documentElement.style.setProperty(name, `${Math.max(0, Math.round(v))}px`);
    };

    const applyAll = () => {
      // 1) Высота вьюпорта Telegram
      const h = Number(tg.viewportHeight) || window.innerHeight;
      document.documentElement.style.setProperty('--tg-viewport-height', `${h}px`);

      // 2) Safe-top: для контента важнее contentSafeAreaInset
      const rawTop =
        Number(tg.contentSafeAreaInset?.top) ||
        Number(tg.safeAreaInset?.top) ||
        Number(tg.safeArea?.top) ||
        0;

      // Если Telegram не даёт inset — всё равно на iOS добавим минимум под оверлей
      const top = Math.max(0, rawTop) + EXTRA_TOP;

      // Всегда выставляем переменную, чтобы было стабильно именно в Telegram WebView
      setPxVar('--lm-safe-top', top);
    };

    try { tg.disableVerticalSwipes?.(); } catch {}
    try { tg.expand?.(); } catch {}
    try { tg.ready?.(); } catch {}

    applyAll();

    const onViewportChanged = () => applyAll();

    try { tg.onEvent?.('viewportChanged', onViewportChanged); } catch {}
    window.addEventListener('resize', applyAll);

    return () => {
      try { tg.offEvent?.('viewportChanged', onViewportChanged); } catch {}
      window.removeEventListener('resize', applyAll);
    };
  }, []);

  return null;
}
