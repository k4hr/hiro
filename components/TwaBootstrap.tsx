'use client';

import { useEffect } from 'react';
import type { ReactNode } from 'react';

function getTelegramInitDataString(): string {
  try {
    const wa: any = (window as any)?.Telegram?.WebApp;
    if (wa?.initData && typeof wa.initData === 'string') return wa.initData;

    const hash = window.location.hash?.startsWith('#')
      ? window.location.hash.slice(1)
      : window.location.hash || '';
    if (!hash) return '';
    const params = new URLSearchParams(hash);
    return params.get('tgWebAppData') || '';
  } catch { return ''; }
}

export default function TwaBootstrap({ children }: { children: ReactNode }) {
  useEffect(() => {
    const wa: any = (window as any)?.Telegram?.WebApp;

    // ready/expand уже делаем в TMAInit — здесь не дублируем

    // 1) собрать и сохранить initData
    let init = getTelegramInitDataString();
    try {
      if (!init) init = localStorage.getItem('tg_init_data') || '';
      if (init) {
        localStorage.setItem('tg_init_data', init);
        // Фикс: кука безопасная для WebView
        document.cookie = `tg_init_data=${encodeURIComponent(init)}; Path=/; Max-Age=86400; SameSite=None; Secure`;
      }
    } catch {}

    // 2) пропатчить fetch для всех /api/*
    if (!(window as any).__fetchPatchedForTG) {
      const origFetch = window.fetch.bind(window);
      (window as any).__fetchPatchedForTG = true;

      window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
        try {
          const url =
            typeof input === 'string'
              ? input
              : input instanceof URL
                ? input.href
                : (input as Request).url;

          const sameOrigin = url.startsWith('/') || url.startsWith(location.origin);
          const isApi = url.includes('/api/');
          if (sameOrigin && isApi) {
            const headers = new Headers(
              init?.headers || (input instanceof Request ? input.headers : undefined)
            );

            let i = getTelegramInitDataString() || localStorage.getItem('tg_init_data') || '';
            if (i && !headers.has('x-init-data')) headers.set('x-init-data', i);

            init = { ...init, headers };
            if (input instanceof Request) input = new Request(input, init);
          }
        } catch {}
        return origFetch(input as any, init);
      };
    }
  }, []);

  return <>{children}</>;
}
