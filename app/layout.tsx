/* path: app/layout.tsx */
import './globals.css';
import type { Metadata, Viewport } from 'next';
import Script from 'next/script';

import TwaBootstrap from '../components/TwaBootstrap';
import GlobalSafeTop from '../components/GlobalSafeTop';
import TMAInit from '../components/TMAInit';
import TelegramNoSwipeInit from '../components/TelegramNoSwipeInit';
import SplashGate from '../components/Loading/SplashGate';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: '#F5F7FA',
};

export const metadata: Metadata = {
  title: 'ВРАЧИ.ТУТ',
  description: 'Онлайн-консультации с врачами в Telegram Mini App',
  other: {
    'color-scheme': 'light',
    'apple-mobile-web-app-status-bar-style': 'default',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru" data-theme="light">
      <head>
        <Script src="https://telegram.org/js/telegram-web-app.js" strategy="beforeInteractive" />

        <meta name="color-scheme" content="light" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />

        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;600;700;800&family=Montserrat:wght@700;800&display=swap"
          rel="stylesheet"
        />
      </head>

      <body style={{ background: '#F5F7FA', color: '#0B0C10' }}>
        <div className="lm-bg" />

        <TelegramNoSwipeInit />
        <GlobalSafeTop />
        <TMAInit />

        <div className="lm-page">
          {/* ✅ Splash 3 секунды всегда при старте */}
          <SplashGate
            bgMobileUrl="/splash/doctor-9x16.jpg"
            bgDesktopUrl="/splash/doctor-16x9.jpg"
            durationMs={3000}
            spinnerSize={70}
            spinnerXPercent={50}
            spinnerYPercent={72}
          >
            <TwaBootstrap>{children}</TwaBootstrap>
          </SplashGate>
        </div>
      </body>
    </html>
  );
}
