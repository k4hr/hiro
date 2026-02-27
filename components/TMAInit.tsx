/* path: components/TMAInit.tsx */
'use client';

import { useEffect } from 'react';

function safe(fn: () => void) {
  try {
    fn();
  } catch {}
}

export default function TMAInit() {
  useEffect(() => {
    const tg = (window as any)?.Telegram?.WebApp;

    safe(() => {
      // Сообщаем Telegram, что всё отрендерилось, и просим фуллскрин
      tg?.ready?.();
      tg?.expand?.();

      // ✅ ТЁМНАЯ МИСТИЧЕСКАЯ ТЕМА
      tg?.setHeaderColor?.('#070814');
      tg?.setBackgroundColor?.('#070814');

      // иногда полезно на всякий случай зафиксировать стиль страницы
      document.documentElement.dataset.theme = 'dark';
      document.documentElement.style.colorScheme = 'dark';
      document.body.style.background = '#070814';
      document.body.style.color = '#E9ECFF';

      // косметика: если есть, скрываем лишние жесты
      tg?.disableVerticalSwipes?.();
    });
  }, []);

  return null;
}
