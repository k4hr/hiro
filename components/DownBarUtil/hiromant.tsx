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

  const intro = useMemo(
    () => (
      <>
        <b>Активная</b> и <b>пассивная</b> ладонь — это два слоя одной судьбы. Мы просим фото <b>обеих рук</b>, чтобы
        сравнить: что дано от рождения и что стало результатом выбора, привычек и пути.
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

          {/* ✅ короткое понятное описание ДО кнопки */}
          <p className="miniinfo-text">{firstParagraph}</p>

          <div className="miniinfo-actions">
            <button type="button" className="miniinfo-btn" onClick={handleToggle}>
              {open ? 'Скрыть подробности' : 'Подробнее'}
            </button>
          </div>

          <div className={`miniinfo-more ${open ? 'is-open' : ''}`} aria-hidden={!open}>
            <div className="divider" />
          </div>
        </div>

        {/* Далее — показываем ТОЛЬКО после "Подробнее" */}
        <div className={`miniinfo-block ${open ? '' : 'is-hidden'}`}>
          <h2 className="miniinfo-title">Активная и пассивная ладонь: как читать две руки</h2>
          <p className="miniinfo-text">{intro}</p>
        </div>

        {/* Блок 2 — какая рука активная */}
        <div className={`miniinfo-block ${open ? '' : 'is-hidden'}`}>
          <h2 className="miniinfo-title">Какая рука активная</h2>

          <ul className="miniinfo-list">
            <li>
              <b>Правша:</b> активная — правая, пассивная — левая.
            </li>
            <li>
              <b>Левша:</b> активная — левая, пассивная — правая.
            </li>
            <li>
              <b>Если обеими одинаково:</b> активной считаем ту, которой чаще пишешь/работаешь, а вторую читаем как
              “внутренний слой”.
            </li>
          </ul>
        </div>

        {/* Блок 3 — пассивная ладонь */}
        <div className={`miniinfo-block ${open ? '' : 'is-hidden'}`}>
          <h2 className="miniinfo-title">Пассивная ладонь — что дано</h2>

          <p className="miniinfo-text">Пассивная рука показывает врождённый сценарий:</p>

          <ul className="miniinfo-list">
            <li>базовый темперамент и характер “по умолчанию”</li>
            <li>природные таланты и слабые места</li>
            <li>внутренние потребности (что важно на уровне души)</li>
            <li>семейные/родовые установки</li>
            <li>потенциал: “кем ты можешь стать, если раскроешься”</li>
          </ul>

          <p className="miniinfo-text">
            Пассивная ладонь отвечает на вопрос: <b>«С чем ты пришёл в эту жизнь?»</b>
          </p>
        </div>

        {/* Блок 4 — активная ладонь */}
        <div className={`miniinfo-block ${open ? '' : 'is-hidden'}`}>
          <h2 className="miniinfo-title">Активная ладонь — что стало</h2>

          <p className="miniinfo-text">Активная рука показывает то, что ты сделал из себя:</p>

          <ul className="miniinfo-list">
            <li>текущий характер, привычки и стиль решений</li>
            <li>как ты реально проживаешь эмоции и отношения</li>
            <li>как сложился твой путь (карьера, выборы, повороты)</li>
            <li>как меняется энергия/ресурс под нагрузкой</li>
            <li>куда ты идёшь сейчас (вектор ближайших лет)</li>
          </ul>

          <p className="miniinfo-text">
            Активная ладонь отвечает на вопрос: <b>«Во что превратился потенциал и куда он ведёт?»</b>
          </p>
        </div>

        {/* Блок 5 — линии */}
        <div className={`miniinfo-block ${open ? '' : 'is-hidden'}`}>
          <h2 className="miniinfo-title">Какие линии мы смотрим и за что они отвечают</h2>

          <div className="miniinfo-lines">
            <div className="lineCard">
              <div className="lineTitle">1) Линия Сердца</div>
              <div className="lineMeta">Эмоции и любовь</div>
              <p className="miniinfo-text">
                <b>Где:</b> под пальцами, верхняя поперечная линия.
              </p>
              <ul className="miniinfo-list">
                <li>как ты любишь и к кому привязываешься</li>
                <li>эмоциональная устойчивость</li>
                <li>ревность/доверие, глубина чувств</li>
                <li>как проявляешь тепло: словами, действиями, телесно, заботой</li>
              </ul>
              <p className="miniinfo-text">
                <b>Пассивная:</b> врождённый эмоциональный тип. <br />
                <b>Активная:</b> как ты любишь сейчас (границы/мягкость/жёсткость).
              </p>
            </div>

            <div className="lineCard">
              <div className="lineTitle">2) Линия Головы</div>
              <div className="lineMeta">Мышление и решения</div>
              <p className="miniinfo-text">
                <b>Где:</b> середина ладони, идёт поперёк.
              </p>
              <ul className="miniinfo-list">
                <li>логика vs интуиция</li>
                <li>скорость принятия решений</li>
                <li>концентрация, память, обучаемость</li>
                <li>креативность и нестандартные ходы</li>
              </ul>
              <p className="miniinfo-text">
                <b>Пассивная:</b> природный ум (аналитик/визионер/интуит/практик). <br />
                <b>Активная:</b> как опыт “перепрошил” мышление.
              </p>
            </div>

            <div className="lineCard">
              <div className="lineTitle">3) Линия Жизни</div>
              <div className="lineMeta">Ресурс, энергия, ритм</div>
              <p className="miniinfo-text">
                <b>Где:</b> дугой вокруг основания большого пальца.
              </p>
              <ul className="miniinfo-list">
                <li>запас энергии и выносливости</li>
                <li>темп жизни: рывками или ровным марафоном</li>
                <li>чувствительность к стрессу и восстановление</li>
                <li>периоды перемен (по веткам/разрывам/островкам)</li>
              </ul>
              <p className="miniinfo-text">
                <i>Важно:</i> линия жизни не про “сколько проживёшь”, а про качество ресурса и ритм.
                <br />
                <b>Пассивная:</b> врождённая “батарейка”. <br />
                <b>Активная:</b> как ты расходуешь и восстанавливаешься сейчас.
              </p>
            </div>

            <div className="lineCard">
              <div className="lineTitle">4) Линия Судьбы</div>
              <div className="lineMeta">Путь, карьера, обстоятельства</div>
              <p className="miniinfo-text">
                <b>Где:</b> вертикальная линия к среднему пальцу (может быть слабой или отсутствовать).
              </p>
              <ul className="miniinfo-list">
                <li>ощущение предназначения и “пути”</li>
                <li>карьера и жизненный вектор</li>
                <li>влияние обстоятельств и людей</li>
                <li>переломы и смены курса (разрывы/перекрестия)</li>
              </ul>
              <p className="miniinfo-text">
                <b>Пассивная:</b> сценарий пути “как сложилось бы само”. <br />
                <b>Активная:</b> как ты реально строишь путь (сам/события ведут).
              </p>
            </div>

            <div className="lineCard">
              <div className="lineTitle">5) Линия Солнца</div>
              <div className="lineMeta">Талант, признание, удовольствие</div>
              <p className="miniinfo-text">
                <b>Где:</b> вертикально к безымянному пальцу.
              </p>
              <ul className="miniinfo-list">
                <li>самовыражение, вкус, стиль, харизма</li>
                <li>признание и “светимость” человека</li>
                <li>удовлетворённость своим делом</li>
              </ul>
              <p className="miniinfo-text">
                <b>Пассивная:</b> врождённая одарённость/харизма. <br />
                <b>Активная:</b> насколько ты это реализовал сейчас.
              </p>
            </div>

            <div className="lineCard">
              <div className="lineTitle">6) Линия Меркурия</div>
              <div className="lineMeta">Коммуникации, деловая жилка</div>
              <p className="miniinfo-text">
                <b>Где:</b> вертикально к мизинцу (не у всех выражена).
              </p>
              <ul className="miniinfo-list">
                <li>переговоры, продажи, коммуникации</li>
                <li>предпринимательский склад</li>
                <li>практичность и “чутьё на людей”</li>
              </ul>
              <p className="miniinfo-text">
                <b>Пассивная:</b> природный дар общения/деловитости. <br />
                <b>Активная:</b> как ты пользуешься этим в жизни и работе.
              </p>
            </div>
          </div>
        </div>

        {/* Блок 6 — горы */}
        <div className={`miniinfo-block ${open ? '' : 'is-hidden'}`}>
          <h2 className="miniinfo-title">Дополнительно: “горы” (подушечки ладони)</h2>

          <p className="miniinfo-text">Подушечки под пальцами показывают силу архетипов:</p>

          <ul className="miniinfo-list">
            <li>
              <b>Венера</b> — любовь к жизни, чувственность, тепло
            </li>
            <li>
              <b>Юпитер</b> — амбиции, лидерство
            </li>
            <li>
              <b>Сатурн</b> — ответственность, глубина
            </li>
            <li>
              <b>Аполлон</b> — творчество, вкус, признание
            </li>
            <li>
              <b>Меркурий</b> — умение договариваться
            </li>
            <li>
              <b>Луна</b> — интуиция, воображение, перемены
            </li>
            <li>
              <b>Марс</b> — воля, смелость, стойкость
            </li>
          </ul>

          <p className="miniinfo-text">
            <b>Пассивная:</b> врождённая сила архетипа. <br />
            <b>Активная:</b> как он проявляется и “прокачан” сейчас.
          </p>
        </div>

        {/* Блок 7 — разница между руками */}
        <div className={`miniinfo-block ${open ? '' : 'is-hidden'}`}>
          <h2 className="miniinfo-title">Как трактуют разницу между руками</h2>

          <ul className="miniinfo-list">
            <li>
              Если активная ладонь <b>сильнее</b> и “богаче” линиями — человек переписал судьбу, растёт, строит свой путь.
            </li>
            <li>
              Если ладони <b>почти одинаковые</b> — жизнь идёт близко к врождённой программе, курс ровный.
            </li>
            <li>
              Если активная ладонь <b>беднее/слабее</b> — потенциал есть, но он зажат, не реализован, человек “живёт не
              свою мощность”.
            </li>
          </ul>
        </div>

        {/* ✅ В КОНЦЕ — что вы получаете */}
        <div className={`miniinfo-block ${open ? '' : 'is-hidden'}`}>
          <h2 className="miniinfo-title">Что вы получаете</h2>
          <p className="miniinfo-text">
            <b>Расширенный и развернутый отчёт</b> по всем ключевым линиям и знакам на обеих ладонях — с понятными
            выводами и акцентами: эмоции и отношения, мышление и решения, ресурс и стресс, путь и повороты, таланты и
            сильные стороны.
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
          max-height: 60px;
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

        .miniinfo-lines {
          display: flex;
          flex-direction: column;
          gap: 12px;
          margin-top: 10px;
        }

        .lineCard {
          border-radius: 18px;
          padding: 14px 14px 12px;
          border: 1px solid rgba(233, 236, 255, 0.10);
          background: rgba(255, 255, 255, 0.03);
          box-shadow: 0 10px 26px rgba(0, 0, 0, 0.40);
          backdrop-filter: blur(14px);
          -webkit-backdrop-filter: blur(14px);
        }

        .lineTitle {
          font-weight: 900;
          color: var(--text);
          font-size: 15px;
          letter-spacing: -0.01em;
        }

        .lineMeta {
          margin-top: 2px;
          font-size: 12px;
          color: rgba(233, 236, 255, 0.62);
          text-transform: uppercase;
          letter-spacing: 0.10em;
        }
      `}</style>
    </>
  );
}
