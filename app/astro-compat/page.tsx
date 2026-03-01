/* path: app/astro-compat/page.tsx */
'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

function tg(): any | null {
  try {
    return (window as any)?.Telegram?.WebApp || null;
  } catch {
    return null;
  }
}

function haptic(type: 'light' | 'medium' = 'light') {
  try {
    tg()?.HapticFeedback?.impactOccurred?.(type);
  } catch {}
}

/* cookie helpers */
function getCookie(name: string): string {
  try {
    const rows = document.cookie ? document.cookie.split('; ') : [];
    for (const row of rows) {
      const [k, ...rest] = row.split('=');
      if (decodeURIComponent(k) === name) return decodeURIComponent(rest.join('='));
    }
  } catch {}
  return '';
}

function getInitDataNow(): string {
  try {
    const fromTg = String(tg()?.initData || '').trim();
    if (fromTg) return fromTg;
  } catch {}
  return String(getCookie('tg_init_data') || '').trim();
}

const PRICE_RUB = 39;
const SUMMARY_PRICE_RUB = 49;

type OptionKey =
  | 'ACOMPAT_LOVE'
  | 'ACOMPAT_SEX'
  | 'ACOMPAT_MONEY'
  | 'ACOMPAT_CONFLICT'
  | 'ACOMPAT_FAMILY'
  | 'ACOMPAT_FORMULA';

function daysInMonth(year: number, month: number) {
  const isLeap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const maxByMonth = [31, isLeap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return maxByMonth[month - 1] ?? 31;
}

function isDobPartsOk(dd: string, mm: string, yyyy: string) {
  if (!dd || !mm || !yyyy) return false;
  if (!/^\d{1,2}$/.test(dd)) return false;
  if (!/^\d{1,2}$/.test(mm)) return false;
  if (!/^\d{4}$/.test(yyyy)) return false;

  const d = Number(dd);
  const m = Number(mm);
  const y = Number(yyyy);
  if (!d || !m || !y) return false;
  if (y < 1900 || y > 2100) return false;
  if (m < 1 || m > 12) return false;

  const dim = daysInMonth(y, m);
  if (d < 1 || d > dim) return false;
  return true;
}

function formatDob(dd: string, mm: string, yyyy: string) {
  const d = dd.padStart(2, '0');
  const m = mm.padStart(2, '0');
  return `${d}.${m}.${yyyy}`;
}

function calcAge(dd: string, mm: string, yyyy: string) {
  const d = Number(dd);
  const m = Number(mm);
  const y = Number(yyyy);
  if (!d || !m || !y) return null;

  const now = new Date();
  const birth = new Date(y, m - 1, d);
  if (Number.isNaN(birth.getTime())) return null;

  let age = now.getFullYear() - y;
  const thisYearsBirthday = new Date(now.getFullYear(), m - 1, d);
  if (now < thisYearsBirthday) age -= 1;

  if (age < 0 || age > 130) return null;
  return age;
}

function cleanText(v: string, max = 80) {
  return v.replace(/\s+/g, ' ').trim().slice(0, max);
}

function isTimeOk(hh: string, mm: string) {
  if (!hh && !mm) return true;
  if (!/^\d{1,2}$/.test(hh) || !/^\d{1,2}$/.test(mm)) return false;
  const H = Number(hh);
  const M = Number(mm);
  if (Number.isNaN(H) || Number.isNaN(M)) return false;
  if (H < 0 || H > 23) return false;
  if (M < 0 || M > 59) return false;
  return true;
}

function formatTime(hh: string, mm: string) {
  return `${hh.padStart(2, '0')}:${mm.padStart(2, '0')}`;
}

function accuracyLevelFor(hasDob: boolean, place: string, timeStr: string) {
  if (!hasDob) return 0;
  const hasPlace = place.trim().length >= 3;
  const hasTime = Boolean(timeStr);
  if (hasPlace && hasTime) return 3;
  if (hasPlace) return 2;
  return 1;
}

function accuracyTextFor(level: number) {
  if (level <= 0) return 'Точность: —';
  if (level === 3) return 'Точность: полная (дата + место + время)';
  if (level === 2) return 'Точность: уточнённая (дата + место)';
  return 'Точность: базовая (только дата)';
}

function storageKeyAstroCompat(a: { dob: string; place: string; time: string }, b: { dob: string; place: string; time: string }) {
  return `astro_compat_${a.dob}_${a.place}_${a.time}_${b.dob}_${b.place}_${b.time}`.slice(0, 140);
}

export default function AstroCompatPage() {
  const router = useRouter();

  useEffect(() => {
    try {
      tg()?.ready?.();
      tg()?.expand?.();
    } catch {}
  }, []);

  // YOU
  const [dd1, setDd1] = useState('');
  const [mm1, setMm1] = useState('');
  const [yy1, setYy1] = useState('');
  const mm1Ref = useRef<HTMLInputElement | null>(null);
  const yy1Ref = useRef<HTMLInputElement | null>(null);

  const dobOk1 = useMemo(() => isDobPartsOk(dd1.trim(), mm1.trim(), yy1.trim()), [dd1, mm1, yy1]);
  const dobStr1 = useMemo(() => (dobOk1 ? formatDob(dd1.trim(), mm1.trim(), yy1.trim()) : ''), [dobOk1, dd1, mm1, yy1]);
  const age1 = useMemo(() => (dobOk1 ? calcAge(dd1.trim(), mm1.trim(), yy1.trim()) : null), [dobOk1, dd1, mm1, yy1]);

  const [place1, setPlace1] = useState('');
  const place1Clean = useMemo(() => cleanText(place1, 96), [place1]);

  const [hh1, setHh1] = useState('');
  const [min1, setMin1] = useState('');
  const timeOk1 = useMemo(() => isTimeOk(hh1.trim(), min1.trim()), [hh1, min1]);
  const hasTime1 = useMemo(() => hh1.trim().length > 0 || min1.trim().length > 0, [hh1, min1]);
  const timeStr1 = useMemo(() => (hasTime1 && timeOk1 ? formatTime(hh1.trim(), min1.trim()) : ''), [hasTime1, timeOk1, hh1, min1]);

  const acc1 = useMemo(() => accuracyLevelFor(dobOk1, place1Clean, timeStr1), [dobOk1, place1Clean, timeStr1]);
  const accText1 = useMemo(() => accuracyTextFor(acc1), [acc1]);

  // PARTNER
  const [dd2, setDd2] = useState('');
  const [mm2, setMm2] = useState('');
  const [yy2, setYy2] = useState('');
  const mm2Ref = useRef<HTMLInputElement | null>(null);
  const yy2Ref = useRef<HTMLInputElement | null>(null);

  const dobOk2 = useMemo(() => isDobPartsOk(dd2.trim(), mm2.trim(), yy2.trim()), [dd2, mm2, yy2]);
  const dobStr2 = useMemo(() => (dobOk2 ? formatDob(dd2.trim(), mm2.trim(), yy2.trim()) : ''), [dobOk2, dd2, mm2, yy2]);
  const age2 = useMemo(() => (dobOk2 ? calcAge(dd2.trim(), mm2.trim(), yy2.trim()) : null), [dobOk2, dd2, mm2, yy2]);

  const [place2, setPlace2] = useState('');
  const place2Clean = useMemo(() => cleanText(place2, 96), [place2]);

  const [hh2, setHh2] = useState('');
  const [min2, setMin2] = useState('');
  const timeOk2 = useMemo(() => isTimeOk(hh2.trim(), min2.trim()), [hh2, min2]);
  const hasTime2 = useMemo(() => hh2.trim().length > 0 || min2.trim().length > 0, [hh2, min2]);
  const timeStr2 = useMemo(() => (hasTime2 && timeOk2 ? formatTime(hh2.trim(), min2.trim()) : ''), [hasTime2, timeOk2, hh2, min2]);

  const acc2 = useMemo(() => accuracyLevelFor(dobOk2, place2Clean, timeStr2), [dobOk2, place2Clean, timeStr2]);
  const accText2 = useMemo(() => accuracyTextFor(acc2), [acc2]);

  const baseOk = dobOk1 && dobOk2 && timeOk1 && timeOk2;

  const options = useMemo(
    () =>
      [
        { key: 'ACOMPAT_LOVE' as const, title: 'Любовь и близость', sub: 'Романтика, привязанность, как “держится” связь', price: PRICE_RUB, fixed: false },
        { key: 'ACOMPAT_SEX' as const, title: 'Секс и страсть', sub: 'Влечение, ревность, границы, сила/контроль', price: PRICE_RUB, fixed: false },
        { key: 'ACOMPAT_MONEY' as const, title: 'Деньги и ресурсы', sub: 'Траты, стратегия, риски, “кто главный”', price: PRICE_RUB, fixed: false },
        { key: 'ACOMPAT_CONFLICT' as const, title: 'Конфликты и примирение', sub: 'Как вы ссоритесь и миритесь', price: PRICE_RUB, fixed: false },
        { key: 'ACOMPAT_FAMILY' as const, title: 'Быт и семья', sub: 'Дом, ответственность', price: PRICE_RUB, fixed: false },
        { key: 'ACOMPAT_FORMULA' as const, title: 'Итог', sub: 'Формула пары', price: SUMMARY_PRICE_RUB, fixed: true },
      ] as const,
    []
  );

  const [selected, setSelected] = useState<Record<OptionKey, boolean>>({
    ACOMPAT_LOVE: true,
    ACOMPAT_SEX: true,
    ACOMPAT_MONEY: true,
    ACOMPAT_CONFLICT: true,
    ACOMPAT_FAMILY: true,
    ACOMPAT_FORMULA: true,
  });

  const toggleOption = (k: OptionKey) => {
    if (k === 'ACOMPAT_FORMULA') return;
    haptic('light');
    setSelected((prev) => ({ ...prev, [k]: !prev[k] }));
  };

  const paidCount = useMemo(() => {
    const keys: OptionKey[] = ['ACOMPAT_LOVE', 'ACOMPAT_SEX', 'ACOMPAT_MONEY', 'ACOMPAT_CONFLICT', 'ACOMPAT_FAMILY'];
    return keys.filter((k) => selected[k] === true).length;
  }, [selected]);

  const totalRub = useMemo(() => paidCount * PRICE_RUB + SUMMARY_PRICE_RUB, [paidCount]);

  const submitDisabled = !baseOk;

  // focus + numeric
  const onDay1 = (v: string) => {
    const clean = v.replace(/\D/g, '').slice(0, 2);
    setDd1(clean);
    if (clean.length === 2) mm1Ref.current?.focus();
  };
  const onMonth1 = (v: string) => {
    const clean = v.replace(/\D/g, '').slice(0, 2);
    setMm1(clean);
    if (clean.length === 2) yy1Ref.current?.focus();
  };
  const onYear1 = (v: string) => setYy1(v.replace(/\D/g, '').slice(0, 4));

  const onDay2 = (v: string) => {
    const clean = v.replace(/\D/g, '').slice(0, 2);
    setDd2(clean);
    if (clean.length === 2) mm2Ref.current?.focus();
  };
  const onMonth2 = (v: string) => {
    const clean = v.replace(/\D/g, '').slice(0, 2);
    setMm2(clean);
    if (clean.length === 2) yy2Ref.current?.focus();
  };
  const onYear2 = (v: string) => setYy2(v.replace(/\D/g, '').slice(0, 4));

  const onSubmit = async () => {
    haptic('medium');
    if (submitDisabled) return;

    const payload = {
      mode: 'ASTRO_COMPAT' as const,
      a: {
        dob: dobStr1,
        age: age1,
        birthPlace: place1Clean.trim().length >= 3 ? place1Clean : '',
        birthTime: timeStr1 || '',
        accuracyLevel: acc1,
      },
      b: {
        dob: dobStr2,
        age: age2,
        birthPlace: place2Clean.trim().length >= 3 ? place2Clean : '',
        birthTime: timeStr2 || '',
        accuracyLevel: acc2,
      },
      selected: { ...selected, ACOMPAT_FORMULA: true },
      totalRub,
      priceRub: PRICE_RUB,
      summaryPriceRub: SUMMARY_PRICE_RUB,
      createdAt: new Date().toISOString(),
    };

    const sk = storageKeyAstroCompat(
      { dob: payload.a.dob, place: payload.a.birthPlace, time: payload.a.birthTime },
      { dob: payload.b.dob, place: payload.b.birthPlace, time: payload.b.birthTime }
    );

    try {
      sessionStorage.setItem(sk, JSON.stringify(payload));
    } catch {}

    try {
      const initData = getInitDataNow();
      if (initData) {
        await fetch('/api/astro-compat/submit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            initData,
            a: payload.a,
            b: payload.b,
            selected: payload.selected,
            totalRub: payload.totalRub,
            priceRub: payload.priceRub,
            summaryPriceRub: payload.summaryPriceRub,
          }),
        });
      }
    } catch {}

    router.push(
      `/astro-compat/report?dob1=${encodeURIComponent(payload.a.dob)}&place1=${encodeURIComponent(payload.a.birthPlace)}&time1=${encodeURIComponent(
        payload.a.birthTime
      )}&dob2=${encodeURIComponent(payload.b.dob)}&place2=${encodeURIComponent(payload.b.birthPlace)}&time2=${encodeURIComponent(payload.b.birthTime)}`
    );
  };

  const goBack = () => {
    haptic('light');
    router.push('/birth-chart');
  };

  return (
    <main className="p">
      <header className="hero" aria-label="Заголовок">
        <div className="title">АРКАНУМ</div>
        <div className="subtitle">астро-совместимость</div>
      </header>

      <section className="card">
        <div className="label center">Вы</div>
        <div className="desc center">Дата обязательна. Место и время — усиливают точность.</div>

        <div className="dob">
          <div className="dobField">
            <div className="dobLabel">День</div>
            <input value={dd1} onChange={(e) => onDay1(e.target.value)} inputMode="numeric" placeholder="ДД" />
          </div>
          <div className="dobField">
            <div className="dobLabel">Месяц</div>
            <input ref={mm1Ref} value={mm1} onChange={(e) => onMonth1(e.target.value)} inputMode="numeric" placeholder="ММ" />
          </div>
          <div className="dobField">
            <div className="dobLabel">Год</div>
            <input ref={yy1Ref} value={yy1} onChange={(e) => onYear1(e.target.value)} inputMode="numeric" placeholder="ГГГГ" />
          </div>
        </div>

        {dd1 || mm1 || yy1 ? (dobOk1 ? <div className="hint center">Ок: {dobStr1}</div> : <div className="warn center">Проверь дату.</div>) : null}
        {dobOk1 && age1 !== null ? (
          <div className="hint center">
            Вам — <b>{age1}</b> лет
          </div>
        ) : null}

        <div className="row1">
          <div className="box">
            <div className="miniLabel">Место рождения (опционально)</div>
            <input value={place1} onChange={(e) => setPlace1(e.target.value)} placeholder="Город, страна" inputMode="text" autoComplete="off" spellCheck={false} />
            {place1 ? <div className={`miniHint ${place1Clean.trim().length >= 3 ? 'miniHint--ok' : ''}`}>{place1Clean.trim().length >= 3 ? 'Место принято' : 'Введите чуть точнее'}</div> : null}
          </div>
        </div>

        <div className="row1">
          <div className="box">
            <div className="miniLabel">Время рождения (опционально)</div>
            <div className="time">
              <input value={hh1} onChange={(e) => setHh1(e.target.value.replace(/\D/g, '').slice(0, 2))} inputMode="numeric" placeholder="ЧЧ" />
              <div className="colon">:</div>
              <input value={min1} onChange={(e) => setMin1(e.target.value.replace(/\D/g, '').slice(0, 2))} inputMode="numeric" placeholder="ММ" />
            </div>
            {hasTime1 ? <div className={`miniHint ${timeOk1 ? 'miniHint--ok' : ''}`}>{timeOk1 ? `Ок: ${timeStr1}` : 'Проверь время'}</div> : <div className="miniHint">Можно пропустить</div>}
          </div>
        </div>

        <div className="accuracy">
          <div className="accTop">
            <div className="accText">{accText1}</div>
            <div className="accLevel">Уровень {acc1 || 0}/3</div>
          </div>
          <div className="accBar" aria-label="Индикатор точности">
            <span className={`seg ${acc1 >= 1 ? 'on' : ''}`} />
            <span className={`seg ${acc1 >= 2 ? 'on' : ''}`} />
            <span className={`seg ${acc1 >= 3 ? 'on' : ''}`} />
          </div>
          <div className="accLegend">
            <div className={`accL ${acc1 === 1 ? 'accL--on' : ''}`}>Базовая</div>
            <div className={`accL ${acc1 === 2 ? 'accL--on' : ''}`}>Уточнённая</div>
            <div className={`accL ${acc1 === 3 ? 'accL--on' : ''}`}>Полная</div>
          </div>
        </div>
      </section>

      <section className="card">
        <div className="label center">Партнёр</div>
        <div className="desc center">Дата обязательна. Место и время — усиливают точность.</div>

        <div className="dob">
          <div className="dobField">
            <div className="dobLabel">День</div>
            <input value={dd2} onChange={(e) => onDay2(e.target.value)} inputMode="numeric" placeholder="ДД" />
          </div>
          <div className="dobField">
            <div className="dobLabel">Месяц</div>
            <input ref={mm2Ref} value={mm2} onChange={(e) => onMonth2(e.target.value)} inputMode="numeric" placeholder="ММ" />
          </div>
          <div className="dobField">
            <div className="dobLabel">Год</div>
            <input ref={yy2Ref} value={yy2} onChange={(e) => onYear2(e.target.value)} inputMode="numeric" placeholder="ГГГГ" />
          </div>
        </div>

        {dd2 || mm2 || yy2 ? (dobOk2 ? <div className="hint center">Ок: {dobStr2}</div> : <div className="warn center">Проверь дату.</div>) : null}
        {dobOk2 && age2 !== null ? (
          <div className="hint center">
            Партнёру — <b>{age2}</b> лет
          </div>
        ) : null}

        <div className="row1">
          <div className="box">
            <div className="miniLabel">Место рождения (опционально)</div>
            <input value={place2} onChange={(e) => setPlace2(e.target.value)} placeholder="Город, страна" inputMode="text" autoComplete="off" spellCheck={false} />
            {place2 ? <div className={`miniHint ${place2Clean.trim().length >= 3 ? 'miniHint--ok' : ''}`}>{place2Clean.trim().length >= 3 ? 'Место принято' : 'Введите чуть точнее'}</div> : null}
          </div>
        </div>

        <div className="row1">
          <div className="box">
            <div className="miniLabel">Время рождения (опционально)</div>
            <div className="time">
              <input value={hh2} onChange={(e) => setHh2(e.target.value.replace(/\D/g, '').slice(0, 2))} inputMode="numeric" placeholder="ЧЧ" />
              <div className="colon">:</div>
              <input value={min2} onChange={(e) => setMin2(e.target.value.replace(/\D/g, '').slice(0, 2))} inputMode="numeric" placeholder="ММ" />
            </div>
            {hasTime2 ? <div className={`miniHint ${timeOk2 ? 'miniHint--ok' : ''}`}>{timeOk2 ? `Ок: ${timeStr2}` : 'Проверь время'}</div> : <div className="miniHint">Можно пропустить</div>}
          </div>
        </div>

        <div className="accuracy">
          <div className="accTop">
            <div className="accText">{accText2}</div>
            <div className="accLevel">Уровень {acc2 || 0}/3</div>
          </div>
          <div className="accBar" aria-label="Индикатор точности">
            <span className={`seg ${acc2 >= 1 ? 'on' : ''}`} />
            <span className={`seg ${acc2 >= 2 ? 'on' : ''}`} />
            <span className={`seg ${acc2 >= 3 ? 'on' : ''}`} />
          </div>
          <div className="accLegend">
            <div className={`accL ${acc2 === 1 ? 'accL--on' : ''}`}>Базовая</div>
            <div className={`accL ${acc2 === 2 ? 'accL--on' : ''}`}>Уточнённая</div>
            <div className={`accL ${acc2 === 3 ? 'accL--on' : ''}`}>Полная</div>
          </div>
        </div>
      </section>

      {baseOk ? (
        <section className="card">
          <div className="label">Что разобрать</div>
          <div className="desc">Выберите необходимые пункты.</div>

          <div className="stack">
            {options.map((o) => {
              const on = selected[o.key];
              const isFixed = o.fixed === true;
              return (
                <button
                  key={o.key}
                  type="button"
                  className={`opt ${on ? 'opt--on' : ''} ${isFixed ? 'opt--fixed' : ''}`}
                  onClick={() => toggleOption(o.key)}
                  disabled={isFixed}
                >
                  <div className="optText">
                    <div className="optT">{o.title}</div>
                    <div className="optS">{o.sub}</div>
                  </div>
                  <div className="optR">
                    {isFixed ? <span className="fixed">✓ {o.price} ₽</span> : on ? <span className="tick">✓</span> : <span className="plus">+{o.price} ₽</span>}
                  </div>
                </button>
              );
            })}
          </div>

          <div className="total">
            <div className="totalL">
              <div className="totalT">Итого</div>
              <div className="totalS">
                Пункты: <b>{paidCount}</b> × {PRICE_RUB} ₽ + Итог {SUMMARY_PRICE_RUB} ₽
              </div>
            </div>
            <div className="totalR">{totalRub} ₽</div>
          </div>

          <button type="button" className={`send ${submitDisabled ? 'send--off' : ''}`} disabled={submitDisabled} onClick={onSubmit}>
            Продолжить
          </button>

          <button type="button" className="back" onClick={goBack}>
            Назад
          </button>
        </section>
      ) : (
        <section className="card">
          <div className="label">Дальше</div>
          <div className="hint">Заполните даты. Место и время — по желанию.</div>
          <button type="button" className="back" onClick={goBack}>
            Назад
          </button>
        </section>
      )}

      <style jsx>{`
        .p {
          min-height: 100dvh;
          padding: 0 0 calc(env(safe-area-inset-bottom, 0px) + 18px);
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
        }
        .p > * {
          width: 100%;
          max-width: 520px;
        }

        .hero {
          margin-top: 6px;
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
          font-family: Montserrat, Manrope, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, 'Helvetica Neue', Arial;
          font-weight: 900;
          letter-spacing: 0.22em;
          text-transform: uppercase;
          font-size: 28px;
          line-height: 1.05;
          margin: 0 0 6px;
          color: transparent;
          background: linear-gradient(115deg, #fff3cf 0%, #d2b35b 18%, #f6e7b0 36%, #b8892a 54%, #fff3cf 72%, #d2b35b 100%);
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

        .card {
          border-radius: 22px;
          padding: 14px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(233, 236, 255, 0.12);
          box-shadow: var(--shadow);
          backdrop-filter: blur(16px) saturate(140%);
          -webkit-backdrop-filter: blur(16px) saturate(140%);
          display: flex;
          flex-direction: column;
          gap: 10px;
          overflow: hidden;
        }

        .label {
          font-size: 16px;
          font-weight: 950;
          color: var(--text);
          letter-spacing: -0.01em;
        }

        .desc {
          font-size: 13px;
          font-weight: 700;
          color: rgba(233, 236, 255, 0.68);
          line-height: 1.35;
        }

        .center {
          text-align: center;
        }

        .dob {
          display: grid;
          grid-template-columns: 1fr 1fr 1.35fr;
          gap: 10px;
        }

        .dobField {
          border-radius: 16px;
          border: 1px solid rgba(233, 236, 255, 0.14);
          background: rgba(255, 255, 255, 0.03);
          padding: 10px 10px 12px;
        }

        .dobLabel {
          font-size: 11px;
          color: rgba(233, 236, 255, 0.62);
          letter-spacing: 0.08em;
          text-transform: uppercase;
          margin-bottom: 6px;
          text-align: center;
        }

        .dobField input {
          width: 100%;
          border: 0;
          outline: none;
          background: transparent;
          color: var(--text);
          font-size: 18px;
          font-weight: 950;
          letter-spacing: 0.04em;
          text-align: center;
        }

        .row1 {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .box {
          border-radius: 16px;
          border: 1px solid rgba(233, 236, 255, 0.14);
          background: rgba(255, 255, 255, 0.03);
          padding: 10px 10px 12px;
        }

        .miniLabel {
          font-size: 11px;
          color: rgba(233, 236, 255, 0.62);
          letter-spacing: 0.08em;
          text-transform: uppercase;
          margin-bottom: 6px;
          text-align: center;
        }

        .box input {
          width: 100%;
          border: 0;
          outline: none;
          background: transparent;
          color: var(--text);
          font-size: 14px;
          font-weight: 900;
          letter-spacing: 0.01em;
          text-align: center;
        }

        .time {
          display: grid;
          grid-template-columns: 1fr 22px 1fr;
          align-items: center;
          gap: 6px;
        }

        .time input {
          width: 100%;
          border: 0;
          outline: none;
          background: transparent;
          color: var(--text);
          font-size: 16px;
          font-weight: 950;
          letter-spacing: 0.04em;
          text-align: center;
        }

        .colon {
          text-align: center;
          color: rgba(233, 236, 255, 0.62);
          font-weight: 900;
        }

        .miniHint {
          margin-top: 8px;
          font-size: 12px;
          font-weight: 800;
          color: rgba(233, 236, 255, 0.58);
          text-align: center;
        }

        .miniHint--ok {
          color: rgba(210, 179, 91, 0.92);
        }

        .hint {
          margin-top: 4px;
          font-size: 12px;
          font-weight: 800;
          color: rgba(233, 236, 255, 0.62);
          padding-top: 10px;
          border-top: 1px solid rgba(233, 236, 255, 0.1);
          overflow-wrap: anywhere;
        }

        .warn {
          font-size: 12px;
          font-weight: 850;
          color: rgba(255, 180, 180, 0.95);
          overflow-wrap: anywhere;
          padding-top: 10px;
          border-top: 1px solid rgba(233, 236, 255, 0.1);
          text-align: center;
        }

        .accuracy {
          margin-top: 2px;
          border-top: 1px solid rgba(233, 236, 255, 0.1);
          padding-top: 12px;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .accTop {
          display: flex;
          align-items: baseline;
          justify-content: space-between;
          gap: 10px;
        }

        .accText {
          font-size: 12px;
          font-weight: 900;
          color: rgba(233, 236, 255, 0.82);
        }

        .accLevel {
          font-size: 12px;
          font-weight: 900;
          color: rgba(233, 236, 255, 0.55);
        }

        .accBar {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          gap: 8px;
        }

        .seg {
          height: 10px;
          border-radius: 999px;
          border: 1px solid rgba(233, 236, 255, 0.14);
          background: rgba(255, 255, 255, 0.03);
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.06);
        }

        .seg.on {
          border-color: rgba(210, 179, 91, 0.35);
          background: rgba(210, 179, 91, 0.16);
          box-shadow: 0 10px 26px rgba(0, 0, 0, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.08);
        }

        .accLegend {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          gap: 8px;
          font-size: 11px;
          font-weight: 850;
          color: rgba(233, 236, 255, 0.55);
          text-align: center;
        }

        .accL--on {
          color: rgba(210, 179, 91, 0.92);
        }

        .stack {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .opt {
          width: 100%;
          border-radius: 18px;
          padding: 14px 12px;
          border: 1px solid rgba(233, 236, 255, 0.12);
          background: rgba(255, 255, 255, 0.03);
          box-shadow: 0 10px 26px rgba(0, 0, 0, 0.38);
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          cursor: pointer;
          -webkit-tap-highlight-color: transparent;
          text-align: left;
          overflow: hidden;
        }

        .opt--on {
          border-color: rgba(210, 179, 91, 0.4);
          background: rgba(255, 255, 255, 0.04);
        }

        .opt--fixed {
          cursor: default;
          opacity: 0.92;
        }

        .opt:active {
          transform: scale(0.99);
          opacity: 0.92;
        }

        .opt:disabled:active {
          transform: none;
          opacity: 0.92;
        }

        .optText {
          min-width: 0;
          flex: 1;
        }

        .optT {
          font-weight: 950;
          color: rgba(233, 236, 255, 0.92);
          font-size: 14px;
        }

        .optS {
          margin-top: 3px;
          font-size: 12px;
          color: rgba(233, 236, 255, 0.62);
          line-height: 1.25;
        }

        .optR {
          width: 96px;
          text-align: right;
          font-weight: 950;
          flex: 0 0 96px;
        }

        .tick {
          color: rgba(210, 179, 91, 0.95);
          font-size: 18px;
        }

        .plus {
          color: rgba(233, 236, 255, 0.7);
          font-size: 12px;
          white-space: nowrap;
        }

        .fixed {
          color: rgba(210, 179, 91, 0.95);
          font-size: 12px;
          white-space: nowrap;
        }

        .total {
          margin-top: 2px;
          padding-top: 12px;
          border-top: 1px solid rgba(233, 236, 255, 0.1);
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
        }

        .totalT {
          font-weight: 950;
          color: rgba(233, 236, 255, 0.92);
          font-size: 14px;
        }

        .totalS {
          margin-top: 3px;
          font-size: 12px;
          font-weight: 800;
          color: rgba(233, 236, 255, 0.62);
        }

        .totalR {
          font-weight: 950;
          color: rgba(210, 179, 91, 0.95);
          font-size: 16px;
          letter-spacing: 0.02em;
          white-space: nowrap;
        }

        .send {
          margin-top: 2px;
          border: 1px solid rgba(210, 179, 91, 0.35);
          border-radius: 999px;
          padding: 12px 14px;
          font-size: 14px;
          font-weight: 950;
          color: var(--text);
          cursor: pointer;
          background: rgba(255, 255, 255, 0.04);
          box-shadow: 0 14px 38px rgba(0, 0, 0, 0.45);
          -webkit-tap-highlight-color: transparent;
        }

        .send:active {
          transform: scale(0.98);
          opacity: 0.92;
        }

        .send--off {
          opacity: 0.55;
          cursor: not-allowed;
          box-shadow: none;
        }

        .back {
          margin-top: 6px;
          border-radius: 999px;
          padding: 12px 14px;
          font-size: 14px;
          font-weight: 950;
          cursor: pointer;
          -webkit-tap-highlight-color: transparent;
          border: 1px solid rgba(233, 236, 255, 0.14);
          color: rgba(233, 236, 255, 0.92);
          background: rgba(255, 255, 255, 0.03);
        }

        .back:active {
          transform: scale(0.99);
          opacity: 0.92;
        }

        @media (max-width: 360px) {
          .dob {
            grid-template-columns: 1fr 1fr;
          }
          .dobField:last-child {
            grid-column: 1 / -1;
          }
        }
      `}</style>
    </main>
  );
}
