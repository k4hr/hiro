/* path: components/DownBarUtil/kod-sudby.tsx */
'use client';

import { useMemo, useState } from 'react';

function haptic(type: 'light' | 'medium' = 'light') {
  try {
    (window as any)?.Telegram?.WebApp?.HapticFeedback?.impactOccurred?.(type);
  } catch {}
}

export default function KodSudbyBlock() {
  const [open, setOpen] = useState(false);

  const handleToggle = () => {
    haptic('light');
    setOpen((v) => !v);
  };

  const firstParagraph = useMemo(
    () => (
      <>
        «Код судьбы» — это <b>глубокий нумерологический разбор</b>, который показывает не просто “какое у вас число”, а{' '}
        <b>как вы устроены на самом деле</b>: в чём ваша сила, где повторяется один и тот же сценарий, что мешает
        расти, как вы идёте в деньги, отношения и свой настоящий путь.
      </>
    ),
    []
  );

  const intro = useMemo(
    () => (
      <>
        Здесь собраны <b>три формата разбора</b>, и каждый попадает в свой слой жизни. Один раскрывает вашу основу по
        дате рождения. Второй показывает, <b>как имя усиливает или ломает ваш путь</b>. Третий разбирает совместимость
        двух людей — не на уровне “подходите / не подходите”, а на уровне <b>динамики пары, слабых мест, конфликтов,
        быта, денег и правил, без которых союз начинает трещать</b>.
      </>
    ),
    []
  );

  return (
    <>
      <section className="miniinfo">
        <div className="miniinfo-block">
          <h2 className="miniinfo-title">Код судьбы в «АРКАНУМ»</h2>

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
          <h2 className="miniinfo-title">Почему этот разбор так цепляет</h2>
          <p className="miniinfo-text">{intro}</p>
          <p className="miniinfo-text">
            Это не абстрактный поток красивых слов. Вы получаете <b>структурный отчёт</b>, где видно: откуда взялся
            вывод, как он проявляется в жизни, где ваша риск-зона и <b>что с этим делать на практике</b>. Именно
            поэтому такие разборы читают взахлёб — потому что в них люди слишком часто узнают себя. Местами даже
            неприятно точно. Такая вот маленькая числовая магия без тумана.
          </p>
        </div>

        <div className={`miniinfo-block ${open ? '' : 'is-hidden'}`}>
          <h2 className="miniinfo-title">Какие форматы разбора доступны</h2>

          <ul className="miniinfo-list">
            <li>
              <b>Личный код по дате рождения:</b> база вашей личности, характера, жизненных уроков и ближайших циклов.
            </li>
            <li>
              <b>Дата + имя:</b> усиленный комбо-разбор, который показывает, насколько ваше имя совпадает с вашим
              путём, усиливает вас или создаёт внутреннее напряжение.
            </li>
            <li>
              <b>Совместимость двух людей:</b> глубокий разбор пары по именам и датам рождения — про притяжение,
              конфликты, общение, деньги, быт и правила, на которых всё держится.
            </li>
          </ul>
        </div>

        <div className={`miniinfo-block ${open ? '' : 'is-hidden'}`}>
          <h2 className="miniinfo-title">Личный разбор по дате рождения</h2>

          <p className="miniinfo-text">
            Это тот самый разбор, после которого становится понятнее, <b>почему вы реагируете именно так</b>, почему
            вас тянет в одни сценарии и отталкивает от других, где ваш реальный потенциал и какие жизненные темы будут
            возвращаться снова и снова, пока вы их не проживёте осознанно.
          </p>

          <div className="miniinfo-lines">
            <div className="lineCard">
              <div className="lineTitle">1) Число жизненного пути</div>
              <div className="lineMeta">Главный вектор судьбы</div>
              <ul className="miniinfo-list">
                <li>какой у вас внутренний двигатель и стиль движения по жизни</li>
                <li>как вы принимаете решения и в чём ваша естественная опора</li>
                <li>куда вас по-настоящему тянет, даже если разум спорит</li>
                <li>в каком направлении вы раскрываетесь сильнее всего</li>
              </ul>
            </div>

            <div className="lineCard">
              <div className="lineTitle">2) Число дня рождения</div>
              <div className="lineMeta">Ваш личный почерк</div>
              <ul className="miniinfo-list">
                <li>как вы проявляетесь в мире и какое впечатление создаёте</li>
                <li>какая черта в вас заметна сразу</li>
                <li>в чём ваша природная сила без всяких усилий</li>
                <li>какой тип реакции включается у вас первым</li>
              </ul>
            </div>

            <div className="lineCard">
              <div className="lineTitle">3) Сильные и пустые цифры в дате</div>
              <div className="lineMeta">Ваши ресурсы и дефициты</div>
              <ul className="miniinfo-list">
                <li>какие качества в вас даны с запасом</li>
                <li>какие зоны требуют прокачки, иначе они будут тормозить всё остальное</li>
                <li>где вы действуете уверенно, а где начинаете буксовать</li>
                <li>какие повторяющиеся паттерны встроены в вашу дату</li>
              </ul>
            </div>

            <div className="lineCard">
              <div className="lineTitle">4) Периоды и вызовы</div>
              <div className="lineMeta">Этапы, которые меняют вас</div>
              <ul className="miniinfo-list">
                <li>какие уроки жизнь ставит перед вами на разных этапах</li>
                <li>где судьба подталкивает к росту, а где ломает старое</li>
                <li>какие задачи вам важно пройти, а не обойти стороной</li>
                <li>какой сценарий будет возвращаться, пока вы его не осознаете</li>
              </ul>
            </div>

            <div className="lineCard">
              <div className="lineTitle">5) Личный год + 12 месяцев</div>
              <div className="lineMeta">Ближайший цикл судьбы</div>
              <ul className="miniinfo-list">
                <li>какая энергия идёт на текущий период жизни</li>
                <li>когда время входить в новое, а когда лучше закреплять результат</li>
                <li>в какие месяцы нужен рывок, а где важнее не спешить</li>
                <li>как использовать ближайший цикл себе в плюс, а не в хаос</li>
              </ul>
            </div>
          </div>
        </div>

        <div className={`miniinfo-block ${open ? '' : 'is-hidden'}`}>
          <h2 className="miniinfo-title">Комбо-разбор: дата рождения + имя</h2>

          <p className="miniinfo-text">
            Это уже не просто разбор личности. Это слой глубже. Здесь считается не только ваш жизненный путь, но и{' '}
            <b>число имени</b> — и дальше видно, насколько имя с вашей судьбой <b>в союзе</b> или, наоборот,
            подкидывает внутренние качели. Иногда именно здесь становится понятно, почему человек сильный, но как будто
            постоянно идёт с внутренним тормозом.
          </p>

          <div className="miniinfo-lines">
            <div className="lineCard">
              <div className="lineTitle">1) Резонанс имени и жизненного пути</div>
              <div className="lineMeta">Совпадение или внутренний конфликт</div>
              <ul className="miniinfo-list">
                <li>поддерживает ли имя ваш настоящий путь или спорит с ним</li>
                <li>насколько легко вам быть собой без внутреннего шума</li>
                <li>что в вас усиливается от природы, а что идёт через напряжение</li>
                <li>где ваша энергия собирается в силу, а где расслаивается</li>
              </ul>
            </div>

            <div className="lineCard">
              <div className="lineTitle">2) Сильные стороны комбо</div>
              <div className="lineMeta">Ваши точки реальной мощи</div>
              <ul className="miniinfo-list">
                <li>какие качества в вас складываются особенно мощно</li>
                <li>где вы естественно сильны и заметны</li>
                <li>в чём ваш стиль влияния, харизмы и устойчивости</li>
                <li>какие роли и форматы вам реально идут</li>
              </ul>
            </div>

            <div className="lineCard">
              <div className="lineTitle">3) Слабые места комбо</div>
              <div className="lineMeta">Где вы сами режете себе путь</div>
              <ul className="miniinfo-list">
                <li>какой внутренний перекос чаще всего мешает вам расти</li>
                <li>какие сценарии сливают ресурс и тормозят результаты</li>
                <li>где сила превращается в перегиб</li>
                <li>какая ошибка повторяется, даже когда вы уже всё поняли головой</li>
              </ul>
            </div>

            <div className="lineCard">
              <div className="lineTitle">4) Деньги и стратегия заработка</div>
              <div className="lineMeta">Как к вам приходят деньги</div>
              <ul className="miniinfo-list">
                <li>через что вам проще и выгоднее зарабатывать</li>
                <li>что включает денежный поток именно у вас</li>
                <li>какие решения мешают расти в доходе</li>
                <li>какой денежный стиль вам ближе: система, скорость, люди, влияние, креатив или структура</li>
              </ul>
            </div>

            <div className="lineCard">
              <div className="lineTitle">5) Карьера и формат работы</div>
              <div className="lineMeta">Где вы раскрываетесь по-настоящему</div>
              <ul className="miniinfo-list">
                <li>вам ближе свобода, лидерство, система или свой маршрут</li>
                <li>где вы сильнее: в одиночной роли, в партнёрстве или в управлении</li>
                <li>какой формат работы даёт рост, а не выгорание</li>
                <li>в чём ваш потенциал на дистанции, а не только на вдохновении</li>
              </ul>
            </div>

            <div className="lineCard">
              <div className="lineTitle">6) Коммуникация и влияние</div>
              <div className="lineMeta">Как вы действуете на людей</div>
              <ul className="miniinfo-list">
                <li>как вы убеждаете, звучите и ведёте за собой</li>
                <li>где у вас природная харизма</li>
                <li>почему одним с вами легко, а другим тревожно</li>
                <li>что даёт вам силу в общении, переговорах и влиянии</li>
              </ul>
            </div>

            <div className="lineCard">
              <div className="lineTitle">7) Энергия и режим</div>
              <div className="lineMeta">Как не сжечь себя на своей же силе</div>
              <ul className="miniinfo-list">
                <li>в каком ритме вы реально продуктивны</li>
                <li>что даёт вам заряд, а что быстро выедает ресурс</li>
                <li>как вам держать темп без внутреннего перегрева</li>
                <li>где вам нужен контроль, а где лучше работает свобода</li>
              </ul>
            </div>

            <div className="lineCard">
              <div className="lineTitle">8) Главный урок комбо</div>
              <div className="lineMeta">Ключевая задача личности</div>
              <ul className="miniinfo-list">
                <li>какую тему вам важно пройти в этой жизни</li>
                <li>что именно в вас просит зрелости и внутренней сборки</li>
                <li>какой шаг даёт вам качественный рост</li>
                <li>куда вас по-настоящему толкает судьба, даже если вы сопротивляетесь</li>
              </ul>
            </div>
          </div>
        </div>

        <div className={`miniinfo-block ${open ? '' : 'is-hidden'}`}>
          <h2 className="miniinfo-title">Совместимость двух людей</h2>

          <p className="miniinfo-text">
            Это один из самых залипательных форматов. Потому что он показывает не просто “подходите вы или нет”, а{' '}
            <b>что происходит между вами на самом деле</b>: почему тянет, где идёт напряжение, кто что в союзе
            усиливает, из-за чего вспыхивают конфликты и на каких правилах эта связь может либо вырасти, либо
            развалиться к чёртовой математической бабушке.
          </p>

          <div className="miniinfo-lines">
            <div className="lineCard">
              <div className="lineTitle">1) Резонанс пары</div>
              <div className="lineMeta">Как ваши коды сцепляются между собой</div>
              <ul className="miniinfo-list">
                <li>как один человек влияет на другого</li>
                <li>есть ли между вами дополнение, усиление или столкновение темпа</li>
                <li>кто ведёт, кто держит, кто раскачивает баланс</li>
                <li>какая энергия рождается в союзе как в системе</li>
              </ul>
            </div>

            <div className="lineCard">
              <div className="lineTitle">2) Сильные зоны пары</div>
              <div className="lineMeta">На чём союз держится крепко</div>
              <ul className="miniinfo-list">
                <li>в чём ваша реальная сила как пары</li>
                <li>что помогает проходить трудные периоды</li>
                <li>где между вами есть ресурс, поддержка и рост</li>
                <li>что делает этот союз живым, настоящим и рабочим</li>
              </ul>
            </div>

            <div className="lineCard">
              <div className="lineTitle">3) Слабые зоны пары</div>
              <div className="lineMeta">Где чаще всего рвётся контакт</div>
              <ul className="miniinfo-list">
                <li>какие темы создают обиды и напряжение</li>
                <li>где вы не слышите друг друга, даже когда вроде говорите</li>
                <li>какой конфликт может повторяться по кругу</li>
                <li>что особенно опасно замалчивать</li>
              </ul>
            </div>

            <div className="lineCard">
              <div className="lineTitle">4) Как договариваться</div>
              <div className="lineMeta">Ключ к миру внутри пары</div>
              <ul className="miniinfo-list">
                <li>как именно вам обсуждать сложное, чтобы не взорваться</li>
                <li>кому нужен мягкий подход, а кому — прямой разговор</li>
                <li>что снижает напряжение до конфликта, а не после него</li>
                <li>какие правила общения реально спасают союз</li>
              </ul>
            </div>

            <div className="lineCard">
              <div className="lineTitle">5) Деньги и быт</div>
              <div className="lineMeta">Где начинается реальная жизнь пары</div>
              <ul className="miniinfo-list">
                <li>как вам лучше распределять роли и ответственность</li>
                <li>кто тянет структуру, а кто даёт движение и импульс</li>
                <li>где возможны конфликты из-за денег, бытовых решений и контроля</li>
                <li>какие правила делают ваш союз устойчивее в реальности, а не только в чувствах</li>
              </ul>
            </div>

            <div className="lineCard">
              <div className="lineTitle">6) Формула пары</div>
              <div className="lineMeta">Суть вашего союза</div>
              <ul className="miniinfo-list">
                <li>про что эта связь на самом деле</li>
                <li>за счёт чего она может расти и углубляться</li>
                <li>какие 7 правил особенно важны именно для вашей пары</li>
                <li>что поможет сохранить близость и не стереть друг друга в пыль красивыми чувствами</li>
              </ul>
            </div>
          </div>
        </div>

        <div className={`miniinfo-block ${open ? '' : 'is-hidden'}`}>
          <h2 className="miniinfo-title">Как выглядит сам разбор</h2>

          <p className="miniinfo-text">
            Каждый пункт собирается так, чтобы вы не просто читали “интересный текст”, а понимали <b>логику разбора</b>{' '}
            и узнавали себя в деталях.
          </p>

          <ul className="miniinfo-list">
            <li>
              <b>Расчёт / Что видно:</b> коротко и понятно, откуда вообще взялся этот вывод.
            </li>
            <li>
              <b>Значение:</b> что это реально говорит о вашем характере, решениях, деньгах, отношениях, работе и
              поведении.
            </li>
            <li>
              <b>Риск-зона:</b> где именно у вас слабое место, повторяющийся сценарий или точка внутреннего слива.
            </li>
            <li>
              <b>Практика:</b> конкретные советы и правила, которые можно применить не “когда-нибудь”, а сразу.
            </li>
          </ul>

          <p className="miniinfo-text">
            В конце вы получаете не обрывки, а <b>цельную картину</b>: кто вы, куда вас ведёт ваш код, что вам мешает,
            на что опираться и где начинается ваш настоящий рост.
          </p>
        </div>

        <div className={`miniinfo-block ${open ? '' : 'is-hidden'}`}>
          <h2 className="miniinfo-title">Что вы получаете</h2>
          <p className="miniinfo-text">
            <b>Большой, точный и цепляющий разбор</b>, который хочется дочитать до конца и потом ещё вернуться к нему
            снова. Внутри — личные числа, сильные стороны, скрытые перекосы, жизненные этапы, деньги, работа, энергия,
            отношения, совместимость и конкретные правила, которые можно взять себе в жизнь.
          </p>
          <p className="miniinfo-text">
            Это тот формат, который не хочется пролистнуть. Потому что в хорошем разборе есть эффект: <b>“чёрт, это
            слишком похоже на меня”</b>. А после него появляется второй эффект: <b>“теперь хотя бы понятно, что с этим
            делать”</b>.
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
