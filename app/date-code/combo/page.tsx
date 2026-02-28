/* path: app/date-code/combo/page.tsx */
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

const PRICE_RUB = 19;
const SUMMARY_PRICE_RUB = 29;

type OptionKey =
  | 'COMBO_RESONANCE'
  | 'COMBO_STRENGTHS'
  | 'COMBO_WEAKNESSES'
  | 'COMBO_MONEY'
  | 'COMBO_CAREER'
  | 'COMBO_COMM'
  | 'COMBO_ENERGY'
  | 'COMBO_LESSON'
  | 'SUMMARY';

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

export default function DateCodeComboPage() {
  const router = useRouter();

  useEffect(() => {
    try {
      tg()?.ready?.();
      tg()?.expand?.();
    } catch {}
  }, []);

  const [dd, setDd] = useState('');
  const [mm, setMm] = useState('');
  const [yyyy, setYyyy] = useState('');
  const [name, setName] = useState('');

  const mmRef = useRef<HTMLInputElement | null>(null);
  const yyyyRef = useRef<HTMLInputElement | null>(null);

  const dobOk = useMemo(() => isDobPartsOk(dd.trim(), mm.trim(), yyyy.trim()), [dd, mm, yyyy]);
  const dobStr = useMemo(() => (dobOk ? formatDob(dd.trim(), mm.trim(), yyyy.trim()) : ''), [dobOk, dd, mm, yyyy]);
  const age = useMemo(() => (dobOk ? calcAge(dd.trim(), mm.trim(), yyyy.trim()) : null), [dobOk, dd, mm, yyyy]);

  const nameClean = useMemo(() => cleanName(name), [name]);
  const nameOk = useMemo(() => nameClean.length >= 2, [nameClean]);

  const options = useMemo(
    () =>
      [
        { key: 'COMBO_RESONANCE' as const, title: 'Резонанс имени и жизненного пути', sub: 'насколько имя “попадает” в путь и как влияет', price: PRICE_RUB, fixed: false },
        { key: 'COMBO_STRENGTHS' as const, title: 'Сильные стороны комбо', sub: 'что усилено именно вашей связкой', price: PRICE_RUB, fixed: false },
        { key: 'COMBO_WEAKNESSES' as const, title: 'Слабые места комбо', sub: 'что может ломать стабильность и результат', price: PRICE_RUB, fixed: false },

        { key: 'COMBO_MONEY' as const, title: 'Деньги и стратегия заработка', sub: 'лучшая модель денег + что режет доход', price: PRICE_RUB, fixed: false },
        { key: 'COMBO_CAREER' as const, title: 'Карьера и формат работы', sub: 'где вы сильнее всего: соло/команда/управление', price: PRICE_RUB, fixed: false },
        { key: 'COMBO_COMM' as const, title: 'Коммуникация и влияние', sub: 'как убеждать и какие ошибки общения мешают', price: PRICE_RUB, fixed: false },
        { key: 'COMBO_ENERGY' as const, title: 'Энергия и режим', sub: 'что даёт ресурс, что выжигает, идеальный ритм', price: PRICE_RUB, fixed: false },
        { key: 'COMBO_LESSON' as const, title: 'Главный урок комбо', sub: 'повторяющаяся тема роста + как закрывать действием', price: PRICE_RUB, fixed: false },

        { key: 'SUMMARY' as const, title: 'Итог + общие советы', sub: 'сводка + 7 стратегических правил', price: SUMMARY_PRICE_RUB, fixed: true },
      ] as const,
    []
  );

  const [selected, setSelected] = useState<Record<OptionKey, boolean>>({
    COMBO_RESONANCE: true,
    COMBO_STRENGTHS: true,
    COMBO_WEAKNESSES: true,
    COMBO_MONEY: true,
    COMBO_CAREER: true,
    COMBO_COMM: true,
    COMBO_ENERGY: true,
    COMBO_LESSON: true,
    SUMMARY: true,
  });

  const toggleOption = (k: OptionKey) => {
    if (k === 'SUMMARY') return;
    haptic('light');
    setSelected((prev) => ({ ...prev, [k]: !prev[k] }));
  };

  const paid19Count = useMemo(() => {
    const keys: OptionKey[] = [
      'COMBO_RESONANCE',
      'COMBO_STRENGTHS',
      'COMBO_WEAKNESSES',
      'COMBO_MONEY',
      'COMBO_CAREER',
      'COMBO_COMM',
      'COMBO_ENERGY',
      'COMBO_LESSON',
    ];
    return keys.filter((k) => selected[k] === true).length;
  }, [selected]);

  const totalRub = useMemo(() => paid19Count * PRICE_RUB + SUMMARY_PRICE_RUB, [paid19Count]);

  const submitDisabled = !dobOk || !nameOk;

  const onDayChange = (v: string) => {
    const clean = v.replace(/\D/g, '').slice(0, 2);
    setDd(clean);
    if (clean.length === 2) mmRef.current?.focus();
  };

  const onMonthChange = (v: string) => {
    const clean = v.replace(/\D/g, '').slice(0, 2);
    setMm(clean);
    if (clean.length === 2) yyyyRef.current?.focus();
  };

  const onYearChange = (v: string) => {
    const clean = v.replace(/\D/g, '').slice(0, 4);
    setYyyy(clean);
  };

  const onSubmit = async () => {
    haptic('medium');
    if (!dobOk || !nameOk) return;

    const payload = {
      mode: 'COMBO' as const,
      dob: dobStr,
      age,
      name: nameClean,
      selected: { ...selected, SUMMARY: true },
      totalRub,
      priceRub: PRICE_RUB,
      summaryPriceRub: SUMMARY_PRICE_RUB,
      createdAt: new Date().toISOString(),
    };

    const storageKey = `date_code_combo_${dobStr}_${nameClean}`.slice(0, 140);
    try {
      sessionStorage.setItem(storageKey, JSON.stringify(payload));
    } catch {}

    // ✅ ВАЖНО: отдельный submit для COMBO → /api/combo/submit (не /api/num/submit)
    try {
      const initData = getInitDataNow();
      if (initData) {
        await fetch('/api/combo/submit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            initData,
            dob: payload.dob,
            name: payload.name,
            age: payload.age,
            selected: payload.selected,
            totalRub: payload.totalRub,
            priceRub: payload.priceRub,
            summaryPriceRub: payload.summaryPriceRub,
          }),
        });
      }
    } catch {}

    router.push(`/date-code/combo/report?dob=${encodeURIComponent(dobStr)}&name=${encodeURIComponent(nameClean)}`);
  };

  const goBack = () => {
    haptic('light');
    router.push('/date-code');
  };

  return (
    <main className="p">
      <header className="hero" aria-label="Заголовок">
        <div className="title">КОД СУДЬБЫ</div>
        <div className="subtitle">дата + имя</div>
      </header>

      <section className="card" aria-label="Ввод данных">
        <div className="label center">Дата рождения</div>
        <div className="desc center">День · месяц · год</div>

        <div className="dob">
          <div className="dobField">
            <div className="dobLabel">День</div>
            <input value={dd} onChange={(e) => onDayChange(e.target.value)} inputMode="numeric" placeholder="ДД" />
          </div>

          <div className="dobField">
            <div className="dobLabel">Месяц</div>
            <input ref={mmRef} value={mm} onChange={(e) => onMonthChange(e.target.value)} inputMode="numeric" placeholder="ММ" />
          </div>

          <div className="dobField">
            <div className="dobLabel">Год</div>
            <input ref={yyyyRef} value={yyyy} onChange={(e) => onYearChange(e.target.value)} inputMode="numeric" placeholder="ГГГГ" />
          </div>
        </div>

        {dd || mm || yyyy ? (dobOk ? <div className="hint center">Ок: {dobStr}</div> : <div className="warn center">Проверь дату.</div>) : null}
        {dobOk && age !== null ? (
          <div className="hint center">
            Вам — <b>{age}</b> лет
          </div>
        ) : null}

        <div className="sep" />

        <div className="label center">Имя</div>
        <div className="desc center">Введите имя (без фамилии — достаточно)</div>

        <div className="nameBox">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Например: Александр"
            inputMode="text"
            autoComplete="off"
            spellCheck={false}
          />
        </div>

        {name ? (nameOk ? <div className="hint center">Ок: {nameClean}</div> : <div className="warn center">Имя слишком короткое.</div>) : null}
      </section>

      {dobOk && nameOk ? (
        <section className="card" aria-label="Выбор пунктов">
          <div className="label">Что включить в разбор</div>
          <div className="desc">Пункты по 19 ₽. Итог всегда включён и стоит 29 ₽.</div>

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
                    {isFixed ? (
                      <span className="fixed">✓ {o.price} ₽</span>
                    ) : on ? (
                      <span className="tick">✓</span>
                    ) : (
                      <span className="plus">+{o.price} ₽</span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          <div className="total">
            <div className="totalL">
              <div className="totalT">Итого</div>
              <div className="totalS">
                Пункты: <b>{paid19Count}</b> × {PRICE_RUB} ₽ + Итог {SUMMARY_PRICE_RUB} ₽
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
          <div className="hint">Введите дату и имя — появится выбор пунктов.</div>
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

        .sep {
          margin-top: 6px;
          padding-top: 10px;
          border-top: 1px solid rgba(233, 236, 255, 0.1);
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
