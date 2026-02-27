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
        <div className="sigil" aria-hidden="true">
          <span />
        </div>

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

      <style jsx>{`
        .home {
          min-height: 100dvh;
          padding: 0 0 calc(env(safe-area-inset-bottom, 0px) + 12px);
        }

        /* ===== HERO ===== */
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

        /* “Сигил” сверху — делает заголовок дороже без лишних слов */
        .sigil {
          position: relative;
          width: 48px;
          height: 48px;
          margin: 0 auto 10px;
          border-radius: 14px;
          border: 1px solid rgba(233, 236, 255, 0.12);
          background: rgba(255, 255, 255, 0.03);
          box-shadow: 0 18px 44px rgba(0, 0, 0, 0.55);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          overflow: hidden;
        }

        .sigil span {
          position: absolute;
          inset: 8px;
          border-radius: 999px;
          border: 1px solid rgba(210, 179, 91, 0.55);
          box-shadow: 0 0 0 1px rgba(139, 92, 246, 0.18), 0 0 26px rgba(210, 179, 91, 0.18);
        }
        .sigil::before,
        .sigil::after {
          content: '';
          position: absolute;
          left: 50%;
          top: 50%;
          width: 30px;
          height: 1px;
          background: rgba(210, 179, 91, 0.55);
          transform: translate(-50%, -50%);
          box-shadow: 0 0 22px rgba(210, 179, 91, 0.18);
        }
        .sigil::after {
          transform: translate(-50%, -50%) rotate(90deg);
        }

        .title {
          position: relative;
          font-family: Montserrat, Manrope, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, 'Helvetica Neue', Arial;
          font-weight: 900;
          letter-spacing: 0.22em;
          text-transform: uppercase;
          font-size: 30px;
          line-height: 1.05;
          margin: 0 0 6px;
          color: transparent;
          background: linear-gradient(180deg, #fff1c4 0%, #d2b35b 34%, #b8892a 58%, #fff3cf 100%);
          -webkit-background-clip: text;
          background-clip: text;
          text-shadow: 0 1px 0 rgba(255, 255, 255, 0.06), 0 18px 44px rgba(0, 0, 0, 0.65);
        }

        .subtitle {
          position: relative;
          font-size: 12px;
          color: rgba(233, 236, 255, 0.64);
          letter-spacing: 0.14em;
          text-transform: uppercase;
        }

        /* ===== MENU ===== */
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
          transition: transform 0.08s ease, opacity 0.08s ease, border-color 0.12s ease, background 0.12s ease;
          color: inherit;
          text-align: left;
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
          border-color: rgba(139, 92, 246, 0.40);
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

        /* ===== BOTTOM CTA ===== */
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
          box-shadow: 0 18px 48px rgba(0, 0, 0, 0.55), 0 0 0 1px rgba(139, 92, 246, 0.10);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          position: relative;
          overflow: hidden;
        }

        .reportsBtn::before {
          content: '';
          position: absolute;
          inset: -2px;
          background: radial-gradient(700px 220px at 30% 0%, rgba(139, 92, 246, 0.20) 0%, rgba(139, 92, 246, 0) 60%),
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
