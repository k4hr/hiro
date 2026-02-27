/* path: components/GlobalSafeTop.tsx */
'use client';

export default function GlobalSafeTop() {
  return (
    <style jsx global>{`
      :root {
        /* Фолбэк: iOS safe-area.
           TelegramNoSwipeInit при наличии tg переопределит --lm-safe-top точнее. */
        --lm-safe-top: env(safe-area-inset-top, 0px);
      }
    `}</style>
  );
}
