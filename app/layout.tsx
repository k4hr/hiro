/* path: app/layout.tsx */
import './globals.css';
import type { Metadata, Viewport } from 'next';
import Script from 'next/script';

import TwaBootstrap from '../components/TwaBootstrap';
import GlobalSafeTop from '../components/GlobalSafeTop';
import TMAInit from '../components/TMAInit';
import TelegramNoSwipeInit from '../components/TelegramNoSwipeInit';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: '#070814',
};

export const metadata: Metadata = {
  title: 'Ладонь + Код',
  description: 'Ладонь, код даты, карта рождения и синтез — мистические отчёты в Telegram Mini App',
  other: {
    'color-scheme': 'dark',
    'apple-mobile-web-app-status-bar-style': 'black-translucent',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru" data-theme="dark">
      <head>
        <Script src="https://telegram.org/js/telegram-web-app.js" strategy="beforeInteractive" />
        <meta name="color-scheme" content="dark" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />

        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;600;700;800&family=Montserrat:wght@700;800&display=swap"
          rel="stylesheet"
        />
      </head>

      <body>
        {/* фон должен быть через globals.css (.lm-bg) */}
        <div className="lm-bg" />

        <TelegramNoSwipeInit />
        <GlobalSafeTop />
        <TMAInit />

        {/* основной scroll container у тебя уже .lm-page в globals.css */}
        <div className="lm-page">
          <TwaBootstrap>{children}</TwaBootstrap>
        </div>
      </body>
    </html>
  );
}
