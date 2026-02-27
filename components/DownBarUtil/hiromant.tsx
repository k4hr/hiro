/* path: components/DownBarUtil/hiromant.tsx */
'use client';

import { useMemo, useState } from 'react';

function haptic(type: 'light' | 'medium' = 'light') {
  try {
    (window as any)?.Telegram?.WebApp?.HapticFeedback?.impactOccurred?.(type);
  } catch {}
}

export default function HiromantBlock() {
  const [open, setOpen] = useState(false);

  const handleToggle = () => {
    haptic('light');
    setOpen((v) => !v);
  };

  const firstParagraph = useMemo(
    () => (
      <>
        «Хиромант» — это режим, где вы загружаете <b>две фотографии</b>: левую и правую ладонь, а приложение собирает для
        вас <b>структурированный отчёт</b> по классической хиромантии.
      </>
    ),
    []
  );

  return (
    <>
      <section className="miniinfo">
        {/* Блок 1 — вводный + раскрытие */}
        <div className="miniinfo-block">
          <h2 className="miniinfo-title">Хиромант в «АРКАНУМ»</h2>

          <p className="miniinfo-text">{firstParagraph}</p>

          <div className="miniinfo-actions">
            <button type="button" className="miniinfo-btn" onClick={handleToggle}>
              {open ? 'Скрыть подробности' : 'Подробнее'}
            </button>
          </div>

          {/* ✅ тут больше НЕТ текста “Мы специально…” */}
          <div className={`miniinfo-more ${open ? 'is-open' : ''}`} aria-hidden={!open}>
            <div className="divider" />
          </div>
        </div>

        {/* Блок 2 — как проходит скан (скрываем, пока не нажали "Подробнее") */}
        <div className={`miniinfo-block ${open ? '' : 'is-hidden'}`}>
          <h2 className="miniinfo-title">Как проходит скан ладоней</h2>
          <p className="miniinfo-text">
            Сначала вы загружаете <b>левую ладонь</b>, затем <b>правую</b>. Логика простая: левая чаще показывает
            «задатки/базу», правая — «как это проявляется сейчас». Мы сравниваем их, чтобы отчёт был похож на историю
            изменений, а не на набор общих фраз.
          </p>
          <p className="miniinfo-text">
            Затем «Хиромант» отмечает основные линии: <b>жизни</b>, <b>головы</b>, <b>сердца</b>, <b>судьбы</b> (и
            дополнительные — если они читаются уверенно). Для каждой линии учитываются длина, глубина, форма, ветви,
            пересечения, разрывы и другие элементы, которые традиционно используют в хиромантии.
          </p>
        </div>

        {/* Блок 3 — что вы получите (скрываем, пока не нажали "Подробнее") */}
        <div className={`miniinfo-block ${open ? '' : 'is-hidden'}`}>
          <h2 className="miniinfo-title">Что вы получите в отчёте</h2>
          <p className="miniinfo-text">Готовый отчёт строится блоками, чтобы его можно было быстро прочитать и сохранить:</p>

          <ul className="miniinfo-list">
            <li>
              <b>3 главные фразы</b> — короткое резюме (“печать” отчёта).
            </li>
            <li>
              <b>Личность и мышление</b> — как вы принимаете решения и на чём держится фокус.
            </li>
            <li>
              <b>Отношения</b> — эмоциональный стиль, границы, что важно в близости.
            </li>
            <li>
              <b>Путь и карьера</b> — направление, повороты, влияние обстоятельств.
            </li>
            <li>
              <b>Ресурс и стресс</b> — где запас прочности и где тонкие места.
            </li>
            <li>
              <b>Ключевые периоды</b> — без точных дат, если уверенность низкая.
            </li>
            <li>
              <b>3 рекомендации</b> — практично и без “тумана”.
            </li>
          </ul>

          <p className="miniinfo-text">
            В конце мы показываем <b>уровень уверенности</b> и пометку качества фото. Если что-то не видно — мы это не
            «додумываем».
          </p>
        </div>
      </section>

      <style jsx>{`
        .miniinfo {
          margin-top: 28px;
          display: flex;
          flex-direction: column;
          gap: 24px;
          font-family: Montserrat, Manrope, system-ui, -apple-system, 'Segoe UI', sans-serif;
        }

        .miniinfo-block {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 22px;
          padding: 18px 16px 20px;
          border: 1px solid rgba(233, 236, 255, 0.12);
          box-shadow: var(--shadow);
          backdrop-filter: blur(16px) saturate(140%);
          -webkit-backdrop-filter: blur(16px) saturate(140%);
        }

        .miniinfo-title {
          margin: 0 0 10px;
          font-size: 18px;
          line-height: 1.25;
          font-weight: 900;
          color: var(--text);
          position: relative;
          letter-spacing: -0.01em;
        }

        .miniinfo-title::after {
          content: '';
          display: block;
          width: 64px;
          height: 3px;
          border-radius: 999px;
          background: linear-gradient(90deg, rgba(139, 92, 246, 0.85), rgba(210, 179, 91, 0.65));
          margin-top: 6px;
        }

        .miniinfo-text {
          margin: 8px 0;
          font-size: 14px;
          line-height: 1.55;
          color: rgba(233, 236, 255, 0.72);
        }

        .miniinfo-actions {
          margin-top: 12px;
        }

        .miniinfo-btn {
          width: 100%;
          padding: 9px 14px;
          border-radius: 999px;
          border: 1px solid rgba(233, 236, 255, 0.16);
          background: rgba(255, 255, 255, 0.03);
          color: var(--text);
          font-size: 13px;
          font-weight: 850;
          text-align: center;
          cursor: pointer;
          -webkit-tap-highlight-color: transparent;
          box-shadow: 0 14px 38px rgba(0, 0, 0, 0.45);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
        }

        .miniinfo-btn:active {
          transform: scale(0.98);
          opacity: 0.92;
        }

        .divider {
          height: 1px;
          background: rgba(233, 236, 255, 0.12);
          margin: 14px 0 6px;
        }

        .miniinfo-more {
          max-height: 0;
          overflow: hidden;
          opacity: 0;
          transition: max-height 260ms ease, opacity 220ms ease;
        }
        .miniinfo-more.is-open {
          max-height: 60px; /* только под divider */
          opacity: 1;
        }

        .is-hidden {
          display: none;
        }

        .miniinfo-list {
          margin: 10px 0 0;
          padding: 0 0 0 18px;
          color: rgba(233, 236, 255, 0.72);
          font-size: 14px;
          line-height: 1.55;
        }

        .miniinfo-list li {
          margin: 6px 0;
        }
      `}</style>
    </>
  );
}
