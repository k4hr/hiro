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
  emoji: string;
  href: string;
  accent?: 'green' | 'blue' | 'violet' | 'amber';
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
    { title: 'Ладонь', subtitle: '2 фото → полный отчёт по линиям', emoji: '🖐', href: '/palm', accent: 'green' },
    { title: 'Код даты', subtitle: 'Дата рождения → интерпретация чисел', emoji: '🔢', href: '/date-code', accent: 'blue' },
    { title: 'Карта рождения', subtitle: 'Дата/время/город → глубже и “точнее”', emoji: '⭐', href: '/birth-chart', accent: 'violet' },
    { title: 'Синтез', subtitle: 'Склеить всё → общий “вердикт”', emoji: '🧬', href: '/synth', accent: 'amber' },
  ];

  const go = (href: string) => {
    haptic('medium');
    router.push(href);
  };

  return (
    <main className="home">
      <header className="top">
        <div className="brand">
          <div className="logo">🔮</div>
          <div className="brandText">
            <div className="brandTitle">Ладонь + Код</div>
            <div className="brandSub">мини-приложение в Telegram</div>
          </div>
        </div>

        <div className="hint">
          <div className="hintTitle">Без анкет и допросов</div>
          <div className="hintSub">Для ладони — только 2 фото. Если качество плохое, попросим переснять по примеру.</div>
        </div>
      </header>

      <section className="grid" aria-label="Меню">
        {actions.map((a) => (
          <button
            key={a.href}
            type="button"
            className={`cardx cardx--${a.accent ?? 'green'}`}
            onClick={() => go(a.href)}
          >
            <div className="cardHead">
              <div className="emoji">{a.emoji}</div>
              <div className="cardText">
                <div className="cardTitle">{a.title}</div>
                <div className="cardSub">{a.subtitle}</div>
              </div>
            </div>
            <div className="chev">›</div>
          </button>
        ))}
      </section>

      <section className="secondary" aria-label="Дополнительно">
        <button type="button" className="miniBtn" onClick={() => go('/reports')}>
          🗂 Мои отчёты
        </button>
        <button type="button" className="miniBtn miniBtn--outline" onClick={() => go('/premium')}>
          💎 Премиум
        </button>
      </section>

      <footer className="foot">
        <div className="note">
          <div className="noteTitle">Важно</div>
          <div className="noteSub">
            Это развлекательная интерпретация. Мы показываем “уверенность” и не притворяемся оракулом с дипломом из тумана.
          </div>
        </div>
      </footer>

      <style jsx>{`
        .home {
          min-height: 100dvh;
          padding: 0 0 calc(env(safe-area-inset-bottom, 0px) + 12px);
          /* фон НЕ задаём — его уже рисует .lm-bg в globals.css */
        }

        .top {
          display: flex;
          flex-direction: column;
          gap: 14px;
          margin-top: 2px;
        }

        .brand {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 12px;
          border-radius: 18px;
          background: var(--card-bg);
          border: 1px solid var(--card-border);
          box-shadow: var(--shadow);
          backdrop-filter: blur(14px) saturate(140%);
          -webkit-backdrop-filter: blur(14px) saturate(140%);
        }

        .logo {
          width: 44px;
          height: 44px;
          display: grid;
          place-items: center;
          border-radius: 14px;
          background: rgba(139, 92, 246, 0.14);
          border: 1px solid rgba(233, 236, 255, 0.12);
          box-shadow: 0 14px 30px rgba(0, 0, 0, 0.42);
          font-size: 22px;
        }

        .brandTitle {
          font-size: 16px;
          font-weight: 850;
          color: var(--text);
          line-height: 1.1;
        }
        .brandSub {
          font-size: 12px;
          color: var(--subtle);
          margin-top: 2px;
        }

        .hint {
          padding: 12px 12px;
          border-radius: 18px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid var(--card-border);
          box-shadow: var(--shadow);
          backdrop-filter: blur(14px);
          -webkit-backdrop-filter: blur(14px);
        }
        .hintTitle {
          font-size: 13px;
          font-weight: 850;
          color: var(--text);
        }
        .hintSub {
          margin-top: 4px;
          font-size: 12px;
          color: rgba(233, 236, 255, 0.68);
          line-height: 1.35;
        }

        .grid {
          margin-top: 16px;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .cardx {
          width: 100%;
          border: 1px solid var(--card-border);
          padding: 14px 14px;
          border-radius: 20px;
          background: var(--card-bg);
          box-shadow: var(--shadow);
          backdrop-filter: blur(14px) saturate(140%);
          -webkit-backdrop-filter: blur(14px) saturate(140%);
          display: flex;
          align-items: center;
          justify-content: space-between;
          cursor: pointer;
          -webkit-tap-highlight-color: transparent;
          transition: transform 0.08s ease, box-shadow 0.08s ease, opacity 0.08s ease, border-color 0.12s ease;
          color: inherit;
        }
        .cardx:active {
          transform: scale(0.99);
          opacity: 0.92;
        }

        .cardHead {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .emoji {
          width: 44px;
          height: 44px;
          display: grid;
          place-items: center;
          border-radius: 16px;
          font-size: 22px;
          border: 1px solid rgba(233, 236, 255, 0.12);
          box-shadow: 0 14px 30px rgba(0, 0, 0, 0.42);
        }

        .cardTitle {
          font-size: 15px;
          font-weight: 850;
          color: var(--text);
          line-height: 1.1;
        }
        .cardSub {
          margin-top: 3px;
          font-size: 12px;
          color: rgba(233, 236, 255, 0.62);
          line-height: 1.25;
        }

        .chev {
          font-size: 26px;
          line-height: 1;
          color: rgba(233, 236, 255, 0.32);
          padding-left: 10px;
        }

        /* акцентные “ауры” на иконках */
        .cardx--green .emoji {
          background: rgba(36, 199, 104, 0.12);
        }
        .cardx--blue .emoji {
          background: rgba(45, 126, 247, 0.14);
        }
        .cardx--violet .emoji {
          background: rgba(139, 92, 246, 0.16);
        }
        .cardx--amber .emoji {
          background: rgba(245, 158, 11, 0.14);
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
          font-weight: 800;
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

        .foot {
          margin-top: 16px;
        }
        .note {
          padding: 12px 12px;
          border-radius: 18px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid var(--card-border);
          box-shadow: var(--shadow);
          backdrop-filter: blur(14px);
          -webkit-backdrop-filter: blur(14px);
        }
        .noteTitle {
          font-size: 12px;
          font-weight: 850;
          color: var(--text);
        }
        .noteSub {
          margin-top: 4px;
          font-size: 12px;
          color: rgba(233, 236, 255, 0.60);
          line-height: 1.35;
        }
      `}</style>
    </main>
  );
}
