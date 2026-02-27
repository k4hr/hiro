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
    {
      title: 'Ладонь',
      subtitle: '2 фото → полный отчёт по линиям',
      emoji: '🖐',
      href: '/palm',
      accent: 'green',
    },
    {
      title: 'Код даты',
      subtitle: 'Дата рождения → интерпретация чисел',
      emoji: '🔢',
      href: '/date-code',
      accent: 'blue',
    },
    {
      title: 'Карта рождения',
      subtitle: 'Дата/время/город → глубже и “точнее”',
      emoji: '⭐',
      href: '/birth-chart',
      accent: 'violet',
    },
    {
      title: 'Синтез',
      subtitle: 'Склеить всё → общий “вердикт”',
      emoji: '🧬',
      href: '/synth',
      accent: 'amber',
    },
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
          <button key={a.href} type="button" className={`card card--${a.accent ?? 'green'}`} onClick={() => go(a.href)}>
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
          padding: 16px 16px calc(env(safe-area-inset-bottom, 0px) + 24px);
          background: radial-gradient(1200px 800px at 20% 10%, #f2f6ff 0%, #f7f7fb 42%, #ffffff 100%);
        }

        .top {
          display: flex;
          flex-direction: column;
          gap: 14px;
          margin-top: 4px;
        }

        .brand {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 12px;
          border-radius: 18px;
          background: rgba(255, 255, 255, 0.72);
          border: 1px solid rgba(10, 12, 20, 0.08);
          box-shadow: 0 12px 26px rgba(15, 23, 42, 0.06);
          backdrop-filter: blur(10px);
        }

        .logo {
          width: 44px;
          height: 44px;
          display: grid;
          place-items: center;
          border-radius: 14px;
          background: rgba(45, 126, 247, 0.12);
          border: 1px solid rgba(45, 126, 247, 0.18);
          font-size: 22px;
        }

        .brandTitle {
          font-size: 16px;
          font-weight: 800;
          color: #0b0c10;
          line-height: 1.1;
        }
        .brandSub {
          font-size: 12px;
          color: rgba(11, 12, 16, 0.55);
          margin-top: 2px;
        }

        .hint {
          padding: 12px 12px;
          border-radius: 18px;
          background: rgba(255, 255, 255, 0.62);
          border: 1px solid rgba(10, 12, 20, 0.08);
          box-shadow: 0 10px 22px rgba(15, 23, 42, 0.05);
          backdrop-filter: blur(10px);
        }
        .hintTitle {
          font-size: 13px;
          font-weight: 800;
          color: #0b0c10;
        }
        .hintSub {
          margin-top: 4px;
          font-size: 12px;
          color: rgba(11, 12, 16, 0.62);
          line-height: 1.35;
        }

        .grid {
          margin-top: 16px;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .card {
          width: 100%;
          border: none;
          padding: 14px 14px;
          border-radius: 20px;
          background: rgba(255, 255, 255, 0.72);
          border: 1px solid rgba(10, 12, 20, 0.08);
          box-shadow: 0 14px 30px rgba(15, 23, 42, 0.06);
          backdrop-filter: blur(10px);
          display: flex;
          align-items: center;
          justify-content: space-between;
          cursor: pointer;
          -webkit-tap-highlight-color: transparent;
          transition: transform 0.08s ease, box-shadow 0.08s ease, opacity 0.08s ease;
        }
        .card:active {
          transform: scale(0.99);
          opacity: 0.92;
          box-shadow: 0 10px 22px rgba(15, 23, 42, 0.07);
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
          border: 1px solid transparent;
        }

        .cardTitle {
          font-size: 15px;
          font-weight: 850;
          color: #0b0c10;
          line-height: 1.1;
        }
        .cardSub {
          margin-top: 3px;
          font-size: 12px;
          color: rgba(11, 12, 16, 0.58);
          line-height: 1.25;
        }

        .chev {
          font-size: 26px;
          line-height: 1;
          color: rgba(11, 12, 16, 0.28);
          padding-left: 10px;
        }

        .card--green .emoji {
          background: rgba(36, 199, 104, 0.12);
          border-color: rgba(36, 199, 104, 0.18);
        }
        .card--blue .emoji {
          background: rgba(45, 126, 247, 0.12);
          border-color: rgba(45, 126, 247, 0.18);
        }
        .card--violet .emoji {
          background: rgba(139, 92, 246, 0.12);
          border-color: rgba(139, 92, 246, 0.18);
        }
        .card--amber .emoji {
          background: rgba(245, 158, 11, 0.12);
          border-color: rgba(245, 158, 11, 0.18);
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
          border: 1px solid rgba(10, 12, 20, 0.08);
          background: rgba(255, 255, 255, 0.72);
          color: #0b0c10;
          font-size: 13px;
          font-weight: 750;
          cursor: pointer;
          -webkit-tap-highlight-color: transparent;
          box-shadow: 0 12px 26px rgba(15, 23, 42, 0.05);
          backdrop-filter: blur(10px);
        }
        .miniBtn:active {
          transform: scale(0.99);
          opacity: 0.92;
        }
        .miniBtn--outline {
          background: rgba(255, 255, 255, 0.55);
          border-color: rgba(45, 126, 247, 0.22);
        }

        .foot {
          margin-top: 16px;
        }
        .note {
          padding: 12px 12px;
          border-radius: 18px;
          background: rgba(255, 255, 255, 0.55);
          border: 1px solid rgba(10, 12, 20, 0.08);
          backdrop-filter: blur(10px);
        }
        .noteTitle {
          font-size: 12px;
          font-weight: 800;
          color: #0b0c10;
        }
        .noteSub {
          margin-top: 4px;
          font-size: 12px;
          color: rgba(11, 12, 16, 0.55);
          line-height: 1.35;
        }
      `}</style>
    </main>
  );
}
