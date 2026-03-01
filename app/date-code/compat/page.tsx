/* path: app/date-code/compat/page.tsx */
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

const PRICE_RUB = 29;
const SUMMARY_PRICE_RUB = 29;

type OptionKey =
  | 'COMPAT_RESONANCE'
  | 'COMPAT_GOOD'
  | 'COMPAT_BAD'
  | 'COMPAT_TALKS'
  | 'COMPAT_MONEY_HOME'
  | 'COMPAT_FORMULA';

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

function cleanName(v: string) {
  return v.replace(/\s+/g, ' ').trim().slice(0, 64);
}

function storageKeyCompat(dob1: string, name1: string, dob2: string, name2: string) {
  return `date_code_compat_${dob1}_${name1}_${dob2}_${name2}`.slice(0, 140);
}

export default function DateCodeCompatPage() {
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
  const [yyyy1, setYyyy1] = useState('');
  const [name1, setName1] = useState('');

  // PARTNER
  const [dd2, setDd2] = useState('');
  const [mm2, setMm2] = useState('');
  const [yyyy2, setYyyy2] = useState('');
  const [name2, setName2] = useState('');

  const mm1Ref = useRef<HTMLInputElement | null>(null);
  const yyyy1Ref = useRef<HTMLInputElement | null>(null);

  const mm2Ref = useRef<HTMLInputElement | null>(null);
  const yyyy2Ref = useRef<HTMLInputElement | null>(null);

  const dob1Ok = useMemo(() => isDobPartsOk(dd1.trim(), mm1.trim(), yyyy1.trim()), [dd1, mm1, yyyy1]);
  const dob1Str = useMemo(() => (dob1Ok ? formatDob(dd1.trim(), mm1.trim(), yyyy1.trim()) : ''), [dob1Ok, dd1, mm1, yyyy1]);
  const age1 = useMemo(() => (dob1Ok ? calcAge(dd1.trim(), mm1.trim(), yyyy1.trim()) : null), [dob1Ok, dd1, mm1, yyyy1]);

  const dob2Ok = useMemo(() => isDobPartsOk(dd2.trim(), mm2.trim(), yyyy2.trim()), [dd2, mm2, yyyy2]);
  const dob2Str = useMemo(() => (dob2Ok ? formatDob(dd2.trim(), mm2.trim(), yyyy2.trim()) : ''), [dob2Ok, dd2, mm2, yyyy2]);
  const age2 = useMemo(() => (dob2Ok ? calcAge(dd2.trim(), mm2.trim(), yyyy2.trim()) : null), [dob2Ok, dd2, mm2, yyyy2]);

  const name1Clean = useMemo(() => cleanName(name1), [name1]);
  const name2Clean = useMemo(() => cleanName(name2), [name2]);

  const name1Ok = useMemo(() => name1Clean.length >= 2, [name1Clean]);
  const name2Ok = useMemo(() => name2Clean.length >= 2, [name2Clean]);

  const baseOk = dob1Ok && dob2Ok && name1Ok && name2Ok;

  const options = useMemo(
    () =>
      [
        { key: 'COMPAT_RESONANCE' as const, title: 'Резонанс “моё имя ↔ его путь” и “его имя ↔ мой путь”', sub: 'два направления влияния и как это ощущается', price: PRICE_RUB, fixed: false },
        { key: 'COMPAT_GOOD' as const, title: 'Сильные зоны пары', sub: 'где легко: поддержка, рост, стабильность', price: PRICE_RUB, fixed: false },
        { key: 'COMPAT_BAD' as const, title: 'Слабые зоны пары', sub: 'где ломает: триггеры, обиды, разный темп', price: PRICE_RUB, fixed: false },
        { key: 'COMPAT_TALKS' as const, title: 'Как договариваться (ключ к миру)', sub: 'правила коммуникации под вашу связку', price: PRICE_RUB, fixed: false },
        { key: 'COMPAT_MONEY_HOME' as const, title: 'Деньги и быт (правила пары)', sub: 'роли, траты, ответственность, чтобы не ругаться', price: PRICE_RUB, fixed: false },
        { key: 'COMPAT_FORMULA' as const, title: 'Итог: формула пары (фраза + 7 правил)', sub: 'итог всегда включён и стоит 29 ₽', price: SUMMARY_PRICE_RUB, fixed: true },
      ] as const,
    []
  );

  const [selected, setSelected] = useState<Record<OptionKey, boolean>>({
    COMPAT_RESONANCE: true,
    COMPAT_GOOD: true,
    COMPAT_BAD: true,
    COMPAT_TALKS: true,
    COMPAT_MONEY_HOME: true,
    COMPAT_FORMULA: true, // фикс
  });

  const toggleOption = (k: OptionKey) => {
    if (k === 'COMPAT_FORMULA') return;
    haptic('light');
    setSelected((prev) => ({ ...prev, [k]: !prev[k] }));
  };

  const paidCount = useMemo(() => {
    const keys: OptionKey[] = ['COMPAT_RESONANCE', 'COMPAT_GOOD', 'COMPAT_BAD', 'COMPAT_TALKS', 'COMPAT_MONEY_HOME'];
    return keys.filter((k) => selected[k] === true).length;
  }, [selected]);

  const totalRub = useMemo(() => paidCount * PRICE_RUB + SUMMARY_PRICE_RUB, [paidCount]);

  const submitDisabled = !baseOk;

  const onDay1Change = (v: string) => {
    const clean = v.replace(/\D/g, '').slice(0, 2);
    setDd1(clean);
    if (clean.length === 2) mm1Ref.current?.focus();
  };
  const onMonth1Change = (v: string) => {
    const clean = v.replace(/\D/g, '').slice(0, 2);
    setMm1(clean);
    if (clean.length === 2) yyyy1Ref.current?.focus();
  };
  const onYear1Change = (v: string) => setYyyy1(v.replace(/\D/g, '').slice(0, 4));

  const onDay2Change = (v: string) => {
    const clean = v.replace(/\D/g, '').slice(0, 2);
    setDd2(clean);
    if (clean.length === 2) mm2Ref.current?.focus();
  };
  const onMonth2Change = (v: string) => {
    const clean = v.replace(/\D/g, '').slice(0, 2);
    setMm2(clean);
    if (clean.length === 2) yyyy2Ref.current?.focus();
  };
  const onYear2Change = (v: string) => setYyyy2(v.replace(/\D/g, '').slice(0, 4));

  const onSubmit = async () => {
    haptic('medium');
    if (!baseOk) return;

    const payload = {
      mode: 'COMPAT' as const,
      dob1: dob1Str,
      name1: name1Clean,
      age1,
      dob2: dob2Str,
      name2: name2Clean,
      age2,
      selected: { ...selected, COMPAT_FORMULA: true },
      totalRub,
      priceRub: PRICE_RUB,
      summaryPriceRub: SUMMARY_PRICE_RUB,
      createdAt: new Date().toISOString(),
    };

    const sk = storageKeyCompat(payload.dob1, payload.name1, payload.dob2, payload.name2);
    try {
      sessionStorage.setItem(sk, JSON.stringify(payload));
    } catch {}

    try {
      const initData = getInitDataNow();
      if (initData) {
        await fetch('/api/compat/submit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            initData,
            dob1: payload.dob1,
            name1: payload.name1,
            age1: payload.age1,
            dob2: payload.dob2,
            name2: payload.name2,
            age2: payload.age2,
            selected: payload.selected,
            totalRub: payload.totalRub,
            priceRub: payload.priceRub,
            summaryPriceRub: payload.summaryPriceRub,
          }),
        });
      }
    } catch {}

    router.push(
      `/date-code/compat/report?dob1=${encodeURIComponent(payload.dob1)}&name1=${encodeURIComponent(payload.name1)}&dob2=${encodeURIComponent(
        payload.dob2
      )}&name2=${encodeURIComponent(payload.name2)}`
    );
  };

  const goBack = () => {
    haptic('light');
    router.push('/date-code');
  };

  return (
    <main className="p">
      <header className="hero" aria-label="Заголовок">
        <div className="title">КОД СУДЬБЫ</div>
        <div className="subtitle">совместимость</div>
      </header>

      <section className="card" aria-label="Ваши данные">
        <div className="label center">Ваши данные</div>
        <div className="desc center">Введите ваше имя и дату рождения</div>

        <div className="dob">
          <div className="dobField">
            <div className="dobLabel">День</div>
            <input value={dd1} onChange={(e) => onDay1Change(e.target.value)} inputMode="numeric" placeholder="ДД" />
          </div>
          <div className="dobField">
            <div className="dobLabel">Месяц</div>
            <input ref={mm1Ref} value={mm1} onChange={(e) => onMonth1Change(e.target.value)} inputMode="numeric" placeholder="ММ" />
          </div>
          <div className="dobField">
            <div className="dobLabel">Год</div>
            <input ref={yyyy1Ref} value={yyyy1} onChange={(e) => onYear1Change(e.target.value)} inputMode="numeric" placeholder="ГГГГ" />
          </div>
        </div>

        {dd1 || mm1 || yyyy1 ? (dob1Ok ? <div className="hint center">Ок: {dob1Str}</div> : <div className="warn center">Проверь дату.</div>) : null}
        {dob1Ok && age1 !== null ? (
          <div className="hint center">
            Вам — <b>{age1}</b> лет
          </div>
        ) : null}

        <div className="nameBox">
          <input value={name1} onChange={(e) => setName1(e.target.value)} placeholder="Ваше имя" inputMode="text" autoComplete="off" spellCheck={false} />
        </div>

        {name1 ? (name1Ok ? <div className="hint center">Ок: {name1Clean}</div> : <div className="warn center">Имя слишком короткое.</div>) : null}
      </section>

      <section className="card" aria-label="Данные партнёра">
        <div className="label center">Данные партнёра</div>
        <div className="desc center">Введите имя и дату рождения партнёра</div>

        <div className="dob">
          <div className="dobField">
            <div className="dobLabel">День</div>
            <input value={dd2} onChange={(e) => onDay2Change(e.target.value)} inputMode="numeric" placeholder="ДД" />
          </div>
          <div className="dobField">
            <div className="dobLabel">Месяц</div>
            <input ref={mm2Ref} value={mm2} onChange={(e) => onMonth2Change(e.target.value)} inputMode="numeric" placeholder="ММ" />
          </div>
          <div className="dobField">
            <div className="dobLabel">Год</div>
            <input ref={yyyy2Ref} value={yyyy2} onChange={(e) => onYear2Change(e.target.value)} inputMode="numeric" placeholder="ГГГГ" />
          </div>
        </div>

        {dd2 || mm2 || yyyy2 ? (dob2Ok ? <div className="hint center">Ок: {dob2Str}</div> : <div className="warn center">Проверь дату.</div>) : null}
        {dob2Ok && age2 !== null ? (
          <div className="hint center">
            Партнёру — <b>{age2}</b> лет
          </div>
        ) : null}

        <div className="nameBox">
          <input value={name2} onChange={(e) => setName2(e.target.value)} placeholder="Имя партнёра" inputMode="text" autoComplete="off" spellCheck={false} />
        </div>

        {name2 ? (name2Ok ? <div className="hint center">Ок: {name2Clean}</div> : <div className="warn center">Имя слишком короткое.</div>) : null}
      </section>

      {baseOk ? (
        <section className="card" aria-label="Выбор пунктов">
          <div className="label">Что разобрать</div>
          <div className="desc">Пункты по 29 ₽. Итог всегда включён и стоит 29 ₽.</div>

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
        <section className="card" aria-label="Подсказка">
          <div className="label">Дальше</div>
          <div className="hint">Введите обе даты и оба имени — появится выбор пунктов.</div>
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

        .nameBox {
          border-radius: 16px;
          border: 1px solid rgba(233, 236, 255, 0.14);
          background: rgba(255, 255, 255, 0.03);
          padding: 12px 12px;
        }

        .nameBox input {
          width: 100%;
          border: 0;
          outline: none;
          background: transparent;
          color: var(--text);
          font-size: 16px;
          font-weight: 900;
          letter-spacing: 0.01em;
          text-align: center;
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
