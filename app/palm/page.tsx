/* path: app/palm/page.tsx */
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

type Handedness = 'RIGHT' | 'LEFT' | 'AMBI';

type UploadState = {
  fileName?: string;
  uploading: boolean;
  url?: string;
  error?: string;
};

type OptionKey =
  | 'HEART'
  | 'HEAD'
  | 'LIFE'
  | 'FATE'
  | 'SUN'
  | 'MERCURY'
  | 'MOUNTS'
  | 'HANDS_DIFF';

const PRICE_RUB = 19;

/** ✅ положи файл в /public/palm-example.png */
const PALM_EXAMPLE_PHOTO_SRC = '/palm-example.png';

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

type CreateOk = { ok: true; scanId: string };
type CreateErr = { ok: false; error: string; hint?: string };
type CreateResp = CreateOk | CreateErr;

async function createPalmScan(initData: string, handedness: Handedness, dob: string): Promise<CreateResp> {
  try {
    const res = await fetch('/api/palm/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ initData, handedness, dob }),
    });
    const j = (await res.json().catch(() => null)) as any;
    if (!res.ok || !j || j.ok !== true || typeof j.scanId !== 'string') {
      return {
        ok: false,
        error: j?.error ? String(j.error) : `CREATE_FAILED(${res.status})`,
        hint: j?.hint ? String(j.hint) : undefined,
      };
    }
    return { ok: true, scanId: String(j.scanId) };
  } catch (e: any) {
    return { ok: false, error: 'CREATE_FAILED', hint: String(e?.message || 'network') };
  }
}

async function uploadPalmPhoto(
  initData: string,
  scanId: string,
  side: 'left' | 'right',
  file: File
): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  try {
    const fd = new FormData();
    fd.set('initData', initData);
    fd.set('scanId', scanId);
    fd.set('side', side);
    fd.set('photo', file);

    const res = await fetch('/api/palm/upload', { method: 'POST', body: fd });
    const j = (await res.json().catch(() => null)) as any;

    if (!res.ok || !j || j.ok !== true || typeof j.url !== 'string') {
      const msg = j?.error ? String(j.error) : `Ошибка загрузки (${res.status})`;
      return { ok: false, error: msg };
    }
    return { ok: true, url: String(j.url) };
  } catch (e: any) {
    return { ok: false, error: e?.message ? String(e.message) : 'Сеть/сервер недоступны.' };
  }
}

export default function PalmPage() {
  const router = useRouter();

  useEffect(() => {
    try {
      tg()?.ready?.();
      tg()?.expand?.();
    } catch {}
  }, []);

  const [handedness, setHandedness] = useState<Handedness | null>(null);

  const [dd, setDd] = useState('');
  const [mm, setMm] = useState('');
  const [yyyy, setYyyy] = useState('');

  const mmRef = useRef<HTMLInputElement | null>(null);
  const yyyyRef = useRef<HTMLInputElement | null>(null);

  const dobOk = useMemo(() => isDobPartsOk(dd.trim(), mm.trim(), yyyy.trim()), [dd, mm, yyyy]);
  const dobStr = useMemo(() => (dobOk ? formatDob(dd.trim(), mm.trim(), yyyy.trim()) : ''), [dobOk, dd, mm, yyyy]);
  const age = useMemo(() => (dobOk ? calcAge(dd.trim(), mm.trim(), yyyy.trim()) : null), [dobOk, dd, mm, yyyy]);

  const canShowDob = handedness !== null;
  const canShowUploads = canShowDob && dobOk;

  const [scanId, setScanId] = useState<string>('');
  const [scanErr, setScanErr] = useState<string>('');

  const [left, setLeft] = useState<UploadState>({ uploading: false });
  const [right, setRight] = useState<UploadState>({ uploading: false });

  const bothUploaded = Boolean(left.url) && Boolean(right.url);

  const [exampleOpen, setExampleOpen] = useState(false);

  const options = useMemo(
    () =>
      [
        { key: 'HEART' as const, title: 'Линия Сердца', sub: 'эмоции, любовь, привязанности' },
        { key: 'HEAD' as const, title: 'Линия Головы', sub: 'мышление, решения, фокус' },
        { key: 'LIFE' as const, title: 'Линия Жизни', sub: 'ресурс, энергия, ритм' },
        { key: 'FATE' as const, title: 'Линия Судьбы', sub: 'путь, карьера, обстоятельства' },
        { key: 'SUN' as const, title: 'Линия Солнца', sub: 'талант, признание, удовольствие' },
        { key: 'MERCURY' as const, title: 'Линия Меркурия', sub: 'коммуникации, деловая жилка' },
        { key: 'MOUNTS' as const, title: 'Горы ладони', sub: 'архетипы и “сила зон”' },
        { key: 'HANDS_DIFF' as const, title: 'Разница между руками', sub: 'что дано vs что стало' },
      ] as const,
    []
  );

  const [selected, setSelected] = useState<Record<OptionKey, boolean>>({
    HEART: true,
    HEAD: true,
    LIFE: true,
    FATE: true,
    SUN: false,
    MERCURY: false,
    MOUNTS: false,
    HANDS_DIFF: true,
  });

  const selectedCount = useMemo(() => Object.values(selected).filter(Boolean).length, [selected]);
  const totalRub = useMemo(() => selectedCount * PRICE_RUB, [selectedCount]);

  const toggleOption = (k: OptionKey) => {
    haptic('light');
    setSelected((prev) => ({ ...prev, [k]: !prev[k] }));
  };

  const setHand = (v: Handedness) => {
    haptic('medium');
    setHandedness(v);
    setScanId('');
    setScanErr('');
    setLeft({ uploading: false });
    setRight({ uploading: false });
  };

  const activeHandText = useMemo(() => {
    if (handedness === 'RIGHT') return 'Активная ладонь: правая · Пассивная: левая';
    if (handedness === 'LEFT') return 'Активная ладонь: левая · Пассивная: правая';
    if (handedness === 'AMBI') return 'Активная ладонь: та, которой чаще пишешь/работаешь';
    return '';
  }, [handedness]);

  useEffect(() => {
    const run = async () => {
      if (!handedness || !dobOk) return;
      if (scanId) return;

      const initData = getInitDataNow();
      if (!initData) {
        setScanErr('NO_INIT_DATA');
        return;
      }

      setScanErr('');
      const r = await createPalmScan(initData, handedness, dobStr);
      if (!r.ok) {
        setScanErr(r.hint ? `${r.error}: ${r.hint}` : r.error);
        return;
      }
      setScanId(r.scanId);
    };
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [handedness, dobOk, dobStr]);

  const onPickFile = async (file: File | null, side: 'left' | 'right') => {
    if (!file) return;

    const initData = getInitDataNow();
    if (!initData) {
      setScanErr('NO_INIT_DATA');
      return;
    }
    if (!scanId) {
      setScanErr('NO_SCAN_ID');
      return;
    }

    haptic('light');

    const set = side === 'left' ? setLeft : setRight;
    set({ uploading: true, fileName: file.name });

    const r = await uploadPalmPhoto(initData, scanId, side, file);
    if (!r.ok) {
      set({ uploading: false, fileName: file.name, error: r.error });
      return;
    }

    set({ uploading: false, fileName: file.name, url: r.url });
  };

  const submitDisabled = !handedness || !dobOk || !bothUploaded || selectedCount === 0 || !scanId;

  const onSubmit = async () => {
    haptic('medium');

    const initData = getInitDataNow();
    if (!initData) {
      setScanErr('NO_INIT_DATA');
      return;
    }
    if (!scanId) {
      setScanErr('NO_SCAN_ID');
      return;
    }
    if (!handedness) {
      setScanErr('NO_HANDEDNESS');
      return;
    }
    if (!dobOk) {
      setScanErr('BAD_DOB');
      return;
    }
    if (!left.url || !right.url) {
      setScanErr('NO_PHOTOS');
      return;
    }

    const payload = {
      scanId,
      handedness,
      dob: dobStr,
      age,
      leftUrl: left.url,
      rightUrl: right.url,
      selected,
      totalRub,
    };

    try {
      sessionStorage.setItem(`palm_submit_${scanId}`, JSON.stringify(payload));
    } catch {}

    // ✅ Сохраняем выбранные пункты в БД (через Report(DRAFT).input)
    try {
      await fetch('/api/palm/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          initData,
          scanId,
          handedness: payload.handedness,
          dob: payload.dob,
          age: payload.age,
          selected: payload.selected,
          totalRub: payload.totalRub,
          priceRub: PRICE_RUB,
        }),
      });
    } catch {
      // даже если упало — UX не ломаем, пускаем дальше (v1)
    }

    // “как будто сразу оплачено” → сразу на страницу разбора
    router.push(`/palm/report?scanId=${encodeURIComponent(scanId)}`);
  };

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

  const openExample = () => {
    haptic('light');
    setExampleOpen(true);
  };

  const closeExample = () => {
    haptic('light');
    setExampleOpen(false);
  };

  return (
    <main className="p">
      <header className="hero" aria-label="Заголовок">
        <div className="title">ХИРОМАНТ</div>
        <div className="subtitle">две ладони · один отчёт</div>
      </header>

      {scanErr ? (
        <section className="card" aria-label="Ошибка">
          <div className="label">Ошибка</div>
          <div className="warn">{scanErr}</div>
        </section>
      ) : null}

      <section className="card" aria-label="Выбор ведущей руки">
        <div className="label center">Кто вы?</div>
        <div className="desc center">Выберите — чтобы мы правильно определили активную ладонь.</div>

        <div className="handStack">
          <button type="button" className={`pill ${handedness === 'RIGHT' ? 'pill--on' : ''}`} onClick={() => setHand('RIGHT')}>
            Правша
          </button>
          <button type="button" className={`pill ${handedness === 'LEFT' ? 'pill--on' : ''}`} onClick={() => setHand('LEFT')}>
            Левша
          </button>
          <button type="button" className={`pill ${handedness === 'AMBI' ? 'pill--on' : ''}`} onClick={() => setHand('AMBI')}>
            Амбидекстер
          </button>
        </div>

        {handedness ? <div className="hint center">{activeHandText}</div> : null}
      </section>

      {canShowDob ? (
        <section className="card" aria-label="Дата рождения">
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
          {dobOk && handedness && !scanId ? <div className="hint center">Создаём черновик…</div> : null}
          {dobOk && age !== null ? (
            <div className="hint center">
              Вам — <b>{age}</b> лет
            </div>
          ) : null}
        </section>
      ) : null}

      {canShowUploads ? (
        <section className="card" aria-label="Загрузка фото ладоней">
          <div className="label">Фото ладоней</div>

          <div className="desc">
            Загрузите обе ладони. Чётко, ладонь целиком, без сильной тени.{' '}
            <button type="button" className="exampleLink" onClick={openExample}>
              Пример
            </button>
          </div>

          <div className="stack">
            <div className="u">
              <div className="uTitle">Загрузите левую ладонь</div>
              <label className={`pick ${left.uploading ? 'is-loading' : ''} ${!scanId ? 'is-disabled' : ''}`}>
                <input type="file" accept="image/*" disabled={!scanId} onChange={(e) => onPickFile(e.target.files?.[0] ?? null, 'left')} />
                {left.url ? 'Загружено ✓' : left.uploading ? 'Загружаю…' : !scanId ? 'Подготовка…' : 'Выбрать фото'}
              </label>
              <div className="meta">
                {left.fileName ? <div className="metaLine">{left.fileName}</div> : <div className="metaLine muted">Файл не выбран</div>}
                {left.error ? <div className="metaLine warn">{left.error}</div> : null}
              </div>
            </div>

            <div className="u">
              <div className="uTitle">Загрузите правую ладонь</div>
              <label className={`pick ${right.uploading ? 'is-loading' : ''} ${!scanId ? 'is-disabled' : ''}`}>
                <input type="file" accept="image/*" disabled={!scanId} onChange={(e) => onPickFile(e.target.files?.[0] ?? null, 'right')} />
                {right.url ? 'Загружено ✓' : right.uploading ? 'Загружаю…' : !scanId ? 'Подготовка…' : 'Выбрать фото'}
              </label>
              <div className="meta">
                {right.fileName ? <div className="metaLine">{right.fileName}</div> : <div className="metaLine muted">Файл не выбран</div>}
                {right.error ? <div className="metaLine warn">{right.error}</div> : null}
              </div>
            </div>
          </div>

          {!bothUploaded ? <div className="hint">После загрузки двух фото появится выбор, что именно разбирать.</div> : null}
        </section>
      ) : null}

      {bothUploaded ? (
        <section className="card" aria-label="Выбор блоков разбора">
          <div className="label">Что будем рассматривать</div>
          <div className="desc">Нажмите на пункт — появится ✓ и +{PRICE_RUB} ₽</div>

          <div className="stack">
            {options.map((o) => {
              const on = selected[o.key];
              return (
                <button key={o.key} type="button" className={`opt ${on ? 'opt--on' : ''}`} onClick={() => toggleOption(o.key)}>
                  <div className="optText">
                    <div className="optT">{o.title}</div>
                    <div className="optS">{o.sub}</div>
                  </div>
                  <div className="optR">{on ? <span className="tick">✓</span> : <span className="plus">+{PRICE_RUB} ₽</span>}</div>
                </button>
              );
            })}
          </div>

          <div className="total">
            <div className="totalL">
              <div className="totalT">Итого</div>
              <div className="totalS">
                Выбрано: <b>{selectedCount}</b> · {PRICE_RUB} ₽ за пункт
              </div>
            </div>
            <div className="totalR">{totalRub} ₽</div>
          </div>

          <button type="button" className={`send ${submitDisabled ? 'send--off' : ''}`} disabled={submitDisabled} onClick={onSubmit}>
            Продолжить
          </button>
        </section>
      ) : null}

      {exampleOpen ? (
        <div className="modal" role="dialog" aria-modal="true" aria-label="Пример фото ладони" onClick={closeExample}>
          <div className="modalCard" onClick={(e) => e.stopPropagation()}>
            <div className="modalTop">
              <div className="modalTitle">Пример фото ладони</div>
              <button type="button" className="modalClose" onClick={closeExample} aria-label="Закрыть">
                ✕
              </button>
            </div>

            <div className="modalBody">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img className="modalImg" src={PALM_EXAMPLE_PHOTO_SRC} alt="Пример фото ладони" />
              <div className="modalHint">Совет: дневной свет, без вспышки/бликов, ладонь целиком в кадре.</div>
            </div>
          </div>
        </div>
      ) : null}

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
          font-size: 30px;
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

        .handStack {
          margin-top: 6px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 10px;
        }

        /* ✅ железобетонное центрирование текста */
        .pill {
          width: 100%;
          max-width: 280px;
          padding: 12px 12px;
          border-radius: 999px;
          border: 1px solid rgba(233, 236, 255, 0.14);
          background: rgba(255, 255, 255, 0.03);
          color: rgba(233, 236, 255, 0.92);
          font-size: 14px;
          font-weight: 950;
          cursor: pointer;
          -webkit-tap-highlight-color: transparent;

          display: flex;
          align-items: center;
          justify-content: center;
          text-align: center;
        }

        .pill--on {
          border-color: rgba(210, 179, 91, 0.4);
          box-shadow: 0 14px 38px rgba(0, 0, 0, 0.45);
        }

        .pill:active {
          transform: scale(0.98);
          opacity: 0.92;
        }

        .stack {
          display: flex;
          flex-direction: column;
          gap: 10px;
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

        .exampleLink {
          border: 0;
          background: transparent;
          padding: 0;
          margin: 0;
          color: rgba(210, 179, 91, 0.95);
          font-weight: 900;
          text-decoration: underline;
          cursor: pointer;
          -webkit-tap-highlight-color: transparent;
        }

        .u {
          border-radius: 18px;
          padding: 12px;
          border: 1px solid rgba(233, 236, 255, 0.1);
          background: rgba(255, 255, 255, 0.03);
          box-shadow: 0 10px 26px rgba(0, 0, 0, 0.4);
        }

        .uTitle {
          font-weight: 950;
          color: rgba(233, 236, 255, 0.92);
          font-size: 14px;
          letter-spacing: -0.01em;
        }

        .pick {
          margin-top: 10px;
          display: inline-flex;
          width: 100%;
          justify-content: center;
          align-items: center;
          padding: 10px 12px;
          border-radius: 999px;
          border: 1px solid rgba(210, 179, 91, 0.3);
          background: rgba(255, 255, 255, 0.04);
          color: var(--text);
          font-weight: 950;
          font-size: 13px;
          cursor: pointer;
          -webkit-tap-highlight-color: transparent;
          overflow: hidden;
        }

        .pick input {
          display: none;
        }

        .pick.is-loading {
          opacity: 0.85;
        }
        .pick.is-disabled {
          opacity: 0.55;
          cursor: not-allowed;
        }

        .pick:active {
          transform: scale(0.98);
          opacity: 0.92;
        }

        .meta {
          margin-top: 10px;
          font-size: 12px;
          font-weight: 800;
          color: rgba(233, 236, 255, 0.62);
          word-break: break-word;
        }

        .metaLine + .metaLine {
          margin-top: 4px;
        }
        .muted {
          opacity: 0.7;
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

        .opt:active {
          transform: scale(0.99);
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
          width: 78px;
          text-align: right;
          font-weight: 950;
          flex: 0 0 78px;
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

        @media (max-width: 360px) {
          .dob {
            grid-template-columns: 1fr 1fr;
          }
          .dobField:last-child {
            grid-column: 1 / -1;
          }
        }

        /* ===== MODAL ===== */
        .modal {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.55);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 16px;
          z-index: 9999;
        }

        .modalCard {
          width: 100%;
          max-width: 520px;
          border-radius: 20px;
          border: 1px solid rgba(233, 236, 255, 0.12);
          background: rgba(12, 16, 32, 0.92);
          backdrop-filter: blur(16px) saturate(140%);
          -webkit-backdrop-filter: blur(16px) saturate(140%);
          box-shadow: 0 24px 80px rgba(0, 0, 0, 0.55);
          overflow: hidden;
        }

        .modalTop {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 12px 12px 10px;
          border-bottom: 1px solid rgba(233, 236, 255, 0.1);
        }

        .modalTitle {
          font-size: 14px;
          font-weight: 950;
          color: rgba(233, 236, 255, 0.92);
        }

        .modalClose {
          width: 34px;
          height: 34px;
          border-radius: 999px;
          border: 1px solid rgba(233, 236, 255, 0.14);
          background: rgba(255, 255, 255, 0.04);
          color: rgba(233, 236, 255, 0.9);
          font-weight: 950;
          cursor: pointer;
          -webkit-tap-highlight-color: transparent;
          display: flex;
          align-items: center;
          justify-content: center;
          text-align: center;
        }

        .modalBody {
          padding: 12px;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .modalImg {
          width: 100%;
          height: auto;
          border-radius: 16px;
          border: 1px solid rgba(233, 236, 255, 0.1);
          background: rgba(255, 255, 255, 0.02);
          display: block;
        }

        .modalHint {
          font-size: 12px;
          font-weight: 800;
          color: rgba(233, 236, 255, 0.62);
          line-height: 1.35;
        }
      `}</style>
    </main>
  );
}
