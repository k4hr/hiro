/* path: app/page.tsx */
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

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

  const actions: Action[] = [
    { title: 'Ладонь', subtitle: '2 фото → полный отчёт по линиям', href: '/palm' },
    { title: 'Код даты', subtitle: 'Дата рождения → интерпретация чисел', href: '/date-code' },
    { title: 'Карта рождения', subtitle: 'Дата/время/город → глубже и “точнее”', href: '/birth-chart' },
    { title: 'Синтез', subtitle: 'Склеить всё → общий “вердикт”', href: '/synth' },
  ];

  const go = (href: string) => {
    haptic('medium');
    router.push(href);
  };

  return (
    <main className="home">
      <header className="hero" aria-label="Заголовок">
        <div className="title">АРКАНУМ</div>
        <div className="subtitle">Арканум · код судьбы</div>
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

      <section className="secondary" aria-label="Дополнительно">
        <button type="button" className="miniBtn" onClick={() => go('/reports')}>
          Мои отчёты
        </button>
        <button type="button" className="miniBtn miniBtn--outline" onClick={() => go('/premium')}>
          Премиум
        </button>
      </section>

      <style jsx>{`
        .home {
          min-height: 100dvh;
          padding: 0 0 calc(env(safe-area-inset-bottom, 0px) + 12px);
        }

        .hero {
          margin-top: 6px;
          margin-bottom: 14px;
          padding: 14px 14px;
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
          background: radial-gradient(700px 240px at 50% 0%, rgba(139, 92, 246, 0.22) 0%, rgba(139, 92, 246, 0) 60%),
            radial-gradient(700px 240px at 20% 120%, rgba(45, 126, 247, 0.16) 0%, rgba(45, 126, 247, 0) 58%);
          pointer-events: none;
        }

        .title {
          position: relative;
          font-family: Montserrat, Manrope, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, 'Helvetica Neue', Arial;
          font-weight: 900;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          font-size: 32px;
          line-height: 1.05;
          margin: 2px 0 6px;
          color: transparent;
          background: linear-gradient(180deg, #f6e7b0 0%, #d2b35b 34%, #b8892a 58%, #fff0b8 100%);
          -webkit-background-clip: text;
          background-clip: text;
          text-shadow: 0 1px 0 rgba(255, 255, 255, 0.08), 0 18px 44px rgba(0, 0, 0, 0.6);
        }

        .subtitle {
          position: relative;
          font-size: 12px;
          color: rgba(233, 236, 255, 0.66);
          letter-spacing: 0.06em;
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
          justify-content: flex-start;
          cursor: pointer;
          -webkit-tap-highlight-color: transparent;
          transition: transform 0.08s ease, opacity 0.08s ease, border-color 0.12s ease;
          color: inherit;
          text-align: left;
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

        .secondary {
          margin-top: 14px;
          display: flex;
          gap: 10px;
        }

        .miniBtn {
          flex: 1;
          padding: 12px 10px;
          border-radius: 16px;
          border: 1px solid var(--card-border);
          background: var(--card-bg);
          color: var(--text);
          font-size: 13px;
          font-weight: 850;
          cursor: pointer;
          -webkit-tap-highlight-color: transparent;
          box-shadow: var(--shadow);
          backdrop-filter: blur(14px);
          -webkit-backdrop-filter: blur(14px);
        }
        .miniBtn:active {
          transform: scale(0.99);
          opacity: 0.92;
        }
        .miniBtn--outline {
          background: rgba(255, 255, 255, 0.04);
          border-color: rgba(139, 92, 246, 0.30);
        }
      `}</style>
    </main>
  );
}
