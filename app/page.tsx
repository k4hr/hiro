/* path: app/page.tsx */
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DownBar from '../components/DownBar';

function haptic(type: 'light' | 'medium' = 'light') {
  try {
    (window as any)?.Telegram?.WebApp?.HapticFeedback?.impactOccurred?.(type);
  } catch {}
}

type Action = {
  title: string;
  subtitle: string;
  href: string;
};

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    try {
      (window as any)?.Telegram?.WebApp?.ready?.();
      (window as any)?.Telegram?.WebApp?.expand?.();
    } catch {}
  }, []);

  // ✅ убрали "Вердикт" полностью
  const actions: Action[] = [
    { title: 'Хиромант', subtitle: '2 фото → разбор линий и периодов', href: '/palm' },
    { title: 'Код судьбы', subtitle: 'Дата → ключевые числа и 12 месяцев', href: '/date-code' },
    { title: 'Карта неба', subtitle: 'Дата/время/город → звёздный портрет', href: '/birth-chart' },
  ];

  const go = (href: string) => {
    haptic('medium');
    router.push(href);
  };

  return (
    <main className="home">
      <header className="hero" aria-label="Заголовок">
        <div className="title">АРКАНУМ</div>
        <div className="subtitle">код судьбы</div>
      </header>

      <section className="grid" aria-label="Меню">
        {actions.map((a) => (
          <button key={a.href} type="button" className="cardx" onClick={() => go(a.href)}>
            <div className="cardText">
              <div className="cardTitle">{a.title}</div>
              <div className="cardSub">{a.subtitle}</div>
            </div>
          </button>
        ))}
      </section>

      <section className="bottom" aria-label="Отчёты">
        <button type="button" className="reportsBtn" onClick={() => go('/reports')}>
          Мои отчёты
        </button>
      </section>

      {/* ✅ DownBar в конце страницы */}
      <DownBar />

      <style jsx>{`
        .home {
          min-height: 100dvh;
          padding: 0 0 calc(env(safe-area-inset-bottom, 0px) + 12px);
        }

        .hero {
          margin-top: 6px;
          margin-bottom: 14px;
          padding: 18px 14px 16px;
          border-radius: 22px;
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(233, 236, 255, 0.12);
          box-shadow: var(--shadow);
          backdrop-filter: blur(16px) saturate(140%);
          -webkit-backdrop-filter: blur(16px) saturate(140%);
          text-align: center;
          position: relative;
          overflow: hidden;
        }

        .hero::before {
          content: '';
          position: absolute;
          inset: -2px;
          background: radial-gradient(760px 260px at 50% -10%, rgba(139, 92, 246, 0.26) 0%, rgba(139, 92, 246, 0) 62%),
            radial-gradient(760px 260px at 10% 120%, rgba(45, 126, 247, 0.14) 0%, rgba(45, 126, 247, 0) 58%),
            radial-gradient(900px 420px at 90% 130%, rgba(245, 158, 11, 0.08) 0%, rgba(245, 158, 11, 0) 60%);
          pointer-events: none;
        }

        .title {
          position: relative;
          font-family: Montserrat, Manrope, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, 'Helvetica Neue',
            Arial;
          font-weight: 900;
          letter-spacing: 0.22em;
          text-transform: uppercase;
          font-size: 30px;
          line-height: 1.05;
          margin: 0 0 6px;

          color: transparent;
          background: linear-gradient(
            115deg,
            #fff3cf 0%,
            #d2b35b 18%,
            #f6e7b0 36%,
            #b8892a 54%,
            #fff3cf 72%,
            #d2b35b 100%
          );
          background-size: 220% 100%;
          -webkit-background-clip: text;
          background-clip: text;

          text-shadow: 0 1px 0 rgba(255, 255, 255, 0.06), 0 18px 44px rgba(0, 0, 0, 0.65);

          animation: shimmer 3.2s ease-in-out infinite;
          will-change: background-position;
        }

        @keyframes shimmer {
          0% {
            background-position: 0% 50%;
          }
          50% {
            background-position: 100% 50%;
          }
          100% {
            background-position: 0% 50%;
          }
        }

        .subtitle {
          position: relative;
          font-size: 12px;
          color: rgba(233, 236, 255, 0.64);
          letter-spacing: 0.14em;
          text-transform: uppercase;
        }

        .grid {
          margin-top: 12px;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .cardx {
          width: 100%;
          border: 1px solid var(--card-border);
          padding: 16px 16px;
          border-radius: 20px;
          background: var(--card-bg);
          box-shadow: var(--shadow);
          backdrop-filter: blur(14px) saturate(140%);
          -webkit-backdrop-filter: blur(14px) saturate(140%);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          -webkit-tap-highlight-color: transparent;
          transition: transform 0.08s ease, opacity 0.08s ease, border-color 0.12s ease, background 0.12s ease;
          color: inherit;
          text-align: center;
          position: relative;
          overflow: hidden;
        }

        .cardx::before {
          content: '';
          position: absolute;
          inset: 0;
          pointer-events: none;
          border-radius: 20px;
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.08);
        }

        .cardx:hover {
          border-color: rgba(139, 92, 246, 0.4);
          background: rgba(255, 255, 255, 0.07);
        }

        .cardx:active {
          transform: scale(0.99);
          opacity: 0.92;
        }

        .cardText {
          width: 100%;
        }

        .cardTitle {
          font-size: 16px;
          font-weight: 900;
          color: var(--text);
          line-height: 1.1;
          letter-spacing: -0.01em;
        }

        .cardSub {
          margin-top: 5px;
          font-size: 12px;
          color: rgba(233, 236, 255, 0.62);
          line-height: 1.25;
        }

        .bottom {
          margin-top: 14px;
        }

        .reportsBtn {
          width: 100%;
          padding: 14px 14px;
          border-radius: 18px;
          border: 1px solid rgba(210, 179, 91, 0.35);
          background: rgba(255, 255, 255, 0.04);
          color: var(--text);
          font-size: 14px;
          font-weight: 900;
          letter-spacing: 0.02em;
          cursor: pointer;
          -webkit-tap-highlight-color: transparent;
          box-shadow: 0 18px 48px rgba(0, 0, 0, 0.55), 0 0 0 1px rgba(139, 92, 246, 0.1);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          position: relative;
          overflow: hidden;
        }

        .reportsBtn::before {
          content: '';
          position: absolute;
          inset: -2px;
          background: radial-gradient(700px 220px at 30% 0%, rgba(139, 92, 246, 0.2) 0%, rgba(139, 92, 246, 0) 60%),
            radial-gradient(700px 220px at 70% 120%, rgba(210, 179, 91, 0.12) 0%, rgba(210, 179, 91, 0) 62%);
          pointer-events: none;
        }

        .reportsBtn:active {
          transform: scale(0.99);
          opacity: 0.92;
        }
      `}</style>
    </main>
  );
}
