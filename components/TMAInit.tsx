'use client';

import { useEffect } from 'react';

export default function TMAInit() {
  useEffect(() => {
    const tg = (window as any)?.Telegram?.WebApp;
    try {
      // Сообщаем Telegram, что всё отрендерилось, и просим фуллскрин
      tg?.ready?.();
      tg?.expand?.();

      // ФИКС СВЕТЛОЙ ТЕМЫ: светлый хедер/фон под наш UI
      tg?.setHeaderColor?.('#F5F7FA');     // вместо 'secondary_bg_color'
      tg?.setBackgroundColor?.('#F5F7FA'); // фиксированный светлый цвет
    } catch {
      // молчим, если не в TWA
    }
  }, []);

  return null;
}
