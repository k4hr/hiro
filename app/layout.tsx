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
  // Тёмная тема, мистический вайб
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

        {/* Небольшая страховка, если Telegram на мгновение рисует белый фон */}
        <style>{`
          html, body { background: #070814; color: #E9ECFF; }
        `}</style>
      </head>

      <body style={{ background: '#070814', color: '#E9ECFF' }}>
        {/* Мистический фон: мягкие “ауры” + зерно */}
        <div className="myst-bg" />

        <TelegramNoSwipeInit />
        <GlobalSafeTop />
        <TMAInit />

        <div className="app-page">
          <TwaBootstrap>{children}</TwaBootstrap>
        </div>

        <style jsx>{`
          .app-page {
            min-height: 100dvh;
            position: relative;
            z-index: 1;
          }

          .myst-bg {
            position: fixed;
            inset: 0;
            z-index: 0;
            pointer-events: none;

            /* 3 слоя: ауры + виньетка + шум */
            background:
              radial-gradient(900px 700px at 18% 12%, rgba(139, 92, 246, 0.22) 0%, rgba(139, 92, 246, 0.00) 55%),
              radial-gradient(900px 700px at 82% 18%, rgba(45, 126, 247, 0.18) 0%, rgba(45, 126, 247, 0.00) 55%),
              radial-gradient(1000px 900px at 50% 92%, rgba(36, 199, 104, 0.10) 0%, rgba(36, 199, 104, 0.00) 60%),
              radial-gradient(1200px 900px at 50% 50%, rgba(255, 255, 255, 0.04) 0%, rgba(255, 255, 255, 0.00) 55%),
              radial-gradient(1400px 1100px at 50% 50%, rgba(0, 0, 0, 0.0) 0%, rgba(0, 0, 0, 0.55) 70%, rgba(0, 0, 0, 0.78) 100%),
              linear-gradient(180deg, #070814 0%, #070814 100%);
          }

          /* Лёгкое “зерно” поверх — мистичнее и дороже */
          .myst-bg:after {
            content: '';
            position: absolute;
            inset: 0;
            opacity: 0.09;
            background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='160' height='160' filter='url(%23n)' opacity='.55'/%3E%3C/svg%3E");
            background-size: 160px 160px;
            mix-blend-mode: overlay;
            pointer-events: none;
          }
        `}</style>
      </body>
    </html>
  );
}
