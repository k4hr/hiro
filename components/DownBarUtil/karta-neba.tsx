/* path: components/DownBarUtil/karta-neba.tsx */
'use client';

import { useMemo, useState } from 'react';

function haptic(type: 'light' | 'medium' = 'light') {
  try {
    (window as any)?.Telegram?.WebApp?.HapticFeedback?.impactOccurred?.(type);
  } catch {}
}

export default function KartaNebaBlock() {
  const [open, setOpen] = useState(false);

  const handleToggle = () => {
    haptic('light');
    setOpen((v) => !v);
  };

  const firstParagraph = useMemo(
    () => (
      <>
        «Карта неба» — это <b>глубокий астрологический разбор</b>, который показывает не просто ваш знак зодиака, а{' '}
        <b>внутреннюю архитектуру личности</b>: как вы любите, как принимаете решения, где у вас деньги, в чём ваш
        карьерный вектор, какие сценарии повторяются в отношениях и в какие периоды жизнь особенно разворачивает вас.
      </>
    ),
    []
  );

  const intro = useMemo(
    () => (
      <>
        Здесь собраны <b>два сильных формата разбора</b>. Первый — ваша личная натальная карта: личность, любовь,
        деньги, карьера, тайминг и формула карты. Второй — <b>астрологическая совместимость двух людей</b>: притяжение,
        секс, деньги, конфликты, семья и правила пары. Это не поверхностное “вы подходите друг другу”, а разбор того,
        <b>как именно работает ваша связь, где она усиливает, а где ломает</b>.
      </>
    ),
    []
  );

  return (
    <>
      <section className="miniinfo">
        <div className="miniinfo-block">
          <h2 className="miniinfo-title">Карта неба в «АРКАНУМ»</h2>

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

        <div className={`miniinfo-block ${open ? '' : 'is-hidden'}`}>
          <h2 className="miniinfo-title">Почему этот разбор так захватывает</h2>
          <p className="miniinfo-text">{intro}</p>
          <p className="miniinfo-text">
            Хорошая карта неба цепляет не потому, что там “магия”, а потому что она попадает в болевые и сильные точки
            слишком точно. Вы начинаете видеть не просто красивые описания, а <b>собственные паттерны</b>: как вы
            входите в любовь, почему одни отношения вас поднимают, а другие выжигают, где вас уносит в контроль, где
            ваша реальная сила и какой сценарий судьба крутит вам по кругу.
          </p>
        </div>

        <div className={`miniinfo-block ${open ? '' : 'is-hidden'}`}>
          <h2 className="miniinfo-title">Какие форматы разбора доступны</h2>

          <ul className="miniinfo-list">
            <li>
              <b>Личная натальная карта:</b> личность, любовь, деньги, карьера, тайминг года и формула вашей карты.
            </li>
            <li>
              <b>Астрологическая совместимость:</b> разбор двух людей по любви, страсти, деньгам, конфликтам, быту и
              формуле пары.
            </li>
            <li>
              <b>Чем точнее данные рождения, тем глубже разбор:</b> дата, место и время дают более объёмную картину.
            </li>
          </ul>
        </div>

        <div className={`miniinfo-block ${open ? '' : 'is-hidden'}`}>
          <h2 className="miniinfo-title">Личная натальная карта</h2>

          <p className="miniinfo-text">
            Это разбор, после которого становится понятнее, <b>как вы устроены изнутри</b>: что вами движет, что вас
            ранит, где вы хотите любви, где хотите контроля, как вы идёте в деньги и почему одна и та же тема снова
            всплывает в жизни под разными лицами.
          </p>

          <div className="miniinfo-lines">
            <div className="lineCard">
              <div className="lineTitle">1) Портрет личности</div>
              <div className="lineMeta">Ваш внутренний каркас</div>
              <ul className="miniinfo-list">
                <li>главный тип характера и темперамента</li>
                <li>как вы реагируете на стресс и давление</li>
                <li>что лежит в основе ваших решений</li>
                <li>где ваша самооценка, уязвимость и внутренняя опора</li>
              </ul>
            </div>

            <div className="lineCard">
              <div className="lineTitle">2) Любовь и отношения</div>
              <div className="lineMeta">Как вы любите и привязываетесь</div>
              <ul className="miniinfo-list">
                <li>какой тип близости вам нужен на самом деле</li>
                <li>как вы входите в отношения и как проявляете чувства</li>
                <li>что делает вас мягче, а что включает жёсткость и закрытость</li>
                <li>какие триггеры чаще всего ломают контакт</li>
              </ul>
            </div>

            <div className="lineCard">
              <div className="lineTitle">3) Деньги, богатство, успех</div>
              <div className="lineMeta">Ваш денежный сценарий</div>
              <ul className="miniinfo-list">
                <li>как вы притягиваете деньги и через что их монетизируете</li>
                <li>где у вас ценность, ресурс и потенциал роста</li>
                <li>какие денежные ловушки могут тормозить вас</li>
                <li>как власть, контроль и страхи вмешиваются в финансовый путь</li>
              </ul>
            </div>

            <div className="lineCard">
              <div className="lineTitle">4) Карьера и предназначение</div>
              <div className="lineMeta">Куда вас ведёт карта</div>
              <ul className="miniinfo-list">
                <li>в каком формате работы вы раскрываетесь сильнее</li>
                <li>где у вас статус, рост и шанс на признание</li>
                <li>какие роли вам подходят, а какие сливают энергию</li>
                <li>что в вашей карте просит не просто работу, а путь</li>
              </ul>
            </div>

            <div className="lineCard">
              <div className="lineTitle">5) Тайминг: год + 12 месяцев</div>
              <div className="lineMeta">Когда действовать, а когда не рвать</div>
              <ul className="miniinfo-list">
                <li>какая энергия идёт на текущий период</li>
                <li>на что делать ставку в ближайший год</li>
                <li>какие месяцы сильнее для денег, отношений, работы и роста</li>
                <li>где важно ускоряться, а где не ломиться в закрытую дверь</li>
              </ul>
            </div>

            <div className="lineCard">
              <div className="lineTitle">6) Формула карты</div>
              <div className="lineMeta">Суть вашей натальной карты</div>
              <ul className="miniinfo-list">
                <li>какая фраза лучше всего описывает вашу карту</li>
                <li>в чём ваша сильная сторона</li>
                <li>в чём главный внутренний узел</li>
                <li>какие 7 правил помогают вам жить свою силу, а не спорить с ней</li>
              </ul>
            </div>
          </div>
        </div>

        <div className={`miniinfo-block ${open ? '' : 'is-hidden'}`}>
          <h2 className="miniinfo-title">Что именно карта показывает про вас</h2>

          <p className="miniinfo-text">
            Внутри разбора карта читается не по одному “солнечному знаку”, а как <b>система жизненных тем</b>. Поэтому
            вы видите не плоское описание, а объём:
          </p>

          <ul className="miniinfo-list">
            <li>
              <b>личность и внутренний мотор</b> — кто вы, когда вас не давят внешние ожидания;
            </li>
            <li>
              <b>эмоции и привязанность</b> — как вы переживаете, любите и закрываетесь;
            </li>
            <li>
              <b>страсть, ревность, контроль, власть</b> — что включается в близости и конфликтах;
            </li>
            <li>
              <b>деньги и ресурсы</b> — как вы строите ценность, доход и отношения с материальным;
            </li>
            <li>
              <b>карьера и статус</b> — где ваша сила видна миру и где у вас шанс на рост;
            </li>
            <li>
              <b>время и циклы</b> — когда жизнь требует действия, а когда внутренней сборки.
            </li>
          </ul>
        </div>

        <div className={`miniinfo-block ${open ? '' : 'is-hidden'}`}>
          <h2 className="miniinfo-title">Астрологическая совместимость двух людей</h2>

          <p className="miniinfo-text">
            Этот формат особенно залипательный, потому что он показывает <b>не иллюзию пары, а её реальную механику</b>
            . Почему между вами тянет. Почему одни темы лечат, а другие взрывают. Где вы друг друга усиливаете, а где
            можете ранить в самые чувствительные точки — даже любя.
          </p>

          <div className="miniinfo-lines">
            <div className="lineCard">
              <div className="lineTitle">1) Любовь и близость</div>
              <div className="lineMeta">Сердце вашей связи</div>
              <ul className="miniinfo-list">
                <li>как между вами рождается тепло и эмоциональная безопасность</li>
                <li>что делает отношения живыми, а не формальными</li>
                <li>в чём ваша сила как пары в любви и заботе</li>
                <li>почему рядом может быть очень хорошо — или слишком больно</li>
              </ul>
            </div>

            <div className="lineCard">
              <div className="lineTitle">2) Секс и страсть</div>
              <div className="lineMeta">Притяжение, огонь, ревность</div>
              <ul className="miniinfo-list">
                <li>что между вами разжигает желание</li>
                <li>где начинается игра власти, контроля и слияния</li>
                <li>какие границы особенно важны в этой связи</li>
                <li>что может усилить близость, а что превратить её в поле битвы</li>
              </ul>
            </div>

            <div className="lineCard">
              <div className="lineTitle">3) Деньги и ресурсы</div>
              <div className="lineMeta">Материальная сторона союза</div>
              <ul className="miniinfo-list">
                <li>как вы вместе обращаетесь с деньгами и безопасностью</li>
                <li>где союз усиливает доход, а где рождает напряжение</li>
                <li>как распределяется ценность, вклад и контроль</li>
                <li>в чём риск конфликтов из-за ресурсов и ожиданий</li>
              </ul>
            </div>

            <div className="lineCard">
              <div className="lineTitle">4) Конфликты и примирение</div>
              <div className="lineMeta">Как вы ссоритесь и как восстанавливаетесь</div>
              <ul className="miniinfo-list">
                <li>кто в паре давит, кто закрывается, кто обостряет</li>
                <li>какие сценарии чаще всего заводят конфликт по кругу</li>
                <li>что разрушает контакт быстрее всего</li>
                <li>какие правила реально помогают помириться, а не замести под ковёр</li>
              </ul>
            </div>

            <div className="lineCard">
              <div className="lineTitle">5) Быт и семья</div>
              <div className="lineMeta">Как живёт пара в реальности</div>
              <ul className="miniinfo-list">
                <li>как у вас распределяется нагрузка и ответственность</li>
                <li>кто создаёт дом, кто движение, кто напряжение</li>
                <li>где союз устойчив в длинную, а где может уставать друг от друга</li>
                <li>какие бытовые правила помогают не разнести отношения в щепки</li>
              </ul>
            </div>

            <div className="lineCard">
              <div className="lineTitle">6) Формула пары</div>
              <div className="lineMeta">Суть вашей связи</div>
              <ul className="miniinfo-list">
                <li>про что эта пара на самом деле</li>
                <li>в чём её сила и в чём её слабое место</li>
                <li>какие 7 правил особенно важны именно для вас</li>
                <li>что может превратить этот союз в зрелую связь, а не в качели</li>
              </ul>
            </div>
          </div>
        </div>

        <div className={`miniinfo-block ${open ? '' : 'is-hidden'}`}>
          <h2 className="miniinfo-title">Почему важны место и время рождения</h2>

          <p className="miniinfo-text">
            Чем точнее исходные данные, тем объёмнее картина. Дата даёт базовый слой. Дата + место уже усиливают
            точность. А <b>дата + место + точное время</b> дают максимально глубокий разбор: оси жизни, темы дома,
            отношений, денег, статуса, семьи и скрытых внутренних сценариев.
          </p>

          <ul className="miniinfo-list">
            <li>
              <b>Только дата:</b> общий каркас личности и жизненных тем.
            </li>
            <li>
              <b>Дата + место:</b> картина становится глубже и точнее по жизненным сферам.
            </li>
            <li>
              <b>Дата + место + время:</b> самый насыщенный формат, где раскрывается максимум деталей карты.
            </li>
          </ul>
        </div>

        <div className={`miniinfo-block ${open ? '' : 'is-hidden'}`}>
          <h2 className="miniinfo-title">Как выглядит сам разбор</h2>

          <p className="miniinfo-text">
            Каждый пункт собирается не как мутное “послание звёзд”, а как <b>структурный и цепляющий отчёт</b>, который
            хочется дочитать до конца.
          </p>

          <ul className="miniinfo-list">
            <li>
              <b>Карта и структура:</b> какие жизненные темы у вас самые важные и где напряжение.
            </li>
            <li>
              <b>Что видно по человеку / по паре:</b> как это реально проявляется в поведении, любви, деньгах,
              амбициях, конфликтах.
            </li>
            <li>
              <b>Риск-зона:</b> где включается повторяющийся сценарий, слабое место или внутренний перекос.
            </li>
            <li>
              <b>Практика:</b> конкретные правила, которые можно применять в жизни сразу.
            </li>
          </ul>

          <p className="miniinfo-text">
            В конце вы получаете не набор красивых фраз, а <b>цельную картину карты</b>: кто вы, как вы любите, где ваши
            деньги, куда вас ведёт путь и что особенно важно не игнорировать.
          </p>
        </div>

        <div className={`miniinfo-block ${open ? '' : 'is-hidden'}`}>
          <h2 className="miniinfo-title">Что вы получаете</h2>
          <p className="miniinfo-text">
            <b>Большой, глубокий и реально затягивающий разбор</b>, к которому хочется возвращаться. Внутри — личность,
            эмоции, любовь, страсть, деньги, карьера, жизненные циклы, совместимость, риск-зоны и практические правила,
            которые помогают лучше понимать себя и свои отношения.
          </p>
          <p className="miniinfo-text">
            Это тот формат, после которого часто приходит мысль: <b>“почему это так чертовски похоже на мою жизнь?”</b>.
            А сразу за ней — вторая, ещё полезнее: <b>“ладно, теперь хотя бы ясно, что с этим делать”</b>.
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
          line-height: 1.58;
          color: rgba(233, 236, 255, 0.76);
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
          color: rgba(233, 236, 255, 0.76);
          font-size: 14px;
          line-height: 1.58;
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
          border: 1px solid rgba(233, 236, 255, 0.1);
          background: rgba(255, 255, 255, 0.03);
          box-shadow: 0 10px 26px rgba(0, 0, 0, 0.4);
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
          letter-spacing: 0.1em;
        }
      `}</style>
    </>
  );
}
