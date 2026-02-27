/* path: app/palm/page.tsx */
'use client';

import { useEffect, useMemo, useState } from 'react';

function haptic(type: 'light' | 'medium' = 'light') {
  try {
    (window as any)?.Telegram?.WebApp?.HapticFeedback?.impactOccurred?.(type);
  } catch {}
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

function isDobLikeRu(s: string) {
  // dd.mm.yyyy (грубая валидация)
  if (!/^\d{2}\.\d{2}\.\d{4}$/.test(s)) return false;
  const [ddStr, mmStr, yyyyStr] = s.split('.');
  const dd = Number(ddStr);
  const mm = Number(mmStr);
  const yyyy = Number(yyyyStr);
  if (!dd || !mm || !yyyy) return false;
  if (yyyy < 1900 || yyyy > 2100) return false;
  if (mm < 1 || mm > 12) return false;

  const maxByMonth = [31, (yyyy % 4 === 0 && (yyyy % 100 !== 0 || yyyy % 400 === 0)) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  if (dd < 1 || dd > maxByMonth[mm - 1]) return false;
  return true;
}

async function uploadToR2(file: File, kind: 'left' | 'right'): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  // 🔧 Тут будет твой реальный API под Cloudflare R2.
  // Ожидаем, что он вернёт { ok: true, url }.
  // Пока — мягкая заглушка, чтобы UI работал.
  try {
    const fd = new FormData();
    fd.append('file', file);
    fd.append('kind', kind);

    const res = await fetch('/api/r2/upload', { method: 'POST', body: fd });
    const j = (await res.json().catch(() => null)) as any;

    if (!res.ok || !j || j.ok !== true || typeof j.url !== 'string') {
      const msg = j?.error ? String(j.error) : `Ошибка загрузки (${res.status})`;
      return { ok: false, error: msg };
    }
    return { ok: true, url: j.url };
  } catch (e: any) {
    return { ok: false, error: e?.message ? String(e.message) : 'Сеть/сервер недоступны.' };
  }
}

export default function PalmPage() {
  useEffect(() => {
    try {
      (window as any)?.Telegram?.WebApp?.ready?.();
      (window as any)?.Telegram?.WebApp?.expand?.();
    } catch {}
  }, []);

  const [handedness, setHandedness] = useState<Handedness | null>(null);
  const [dob, setDob] = useState('');
  const dobOk = useMemo(() => isDobLikeRu(dob.trim()), [dob]);

  const [left, setLeft] = useState<UploadState>({ uploading: false });
  const [right, setRight] = useState<UploadState>({ uploading: false });

  const canShowDob = handedness !== null;
  const canShowUploads = canShowDob && dobOk;
  const bothUploaded = Boolean(left.url) && Boolean(right.url);

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
  };

  const onPickFile = async (file: File | null, side: 'left' | 'right') => {
    if (!file) return;

    haptic('light');

    const set = side === 'left' ? setLeft : setRight;
    set({ uploading: true, fileName: file.name });

    const r = await uploadToR2(file, side);
    if (!r.ok) {
      set({ uploading: false, fileName: file.name, error: r.error });
      return;
    }

    set({ uploading: false, fileName: file.name, url: r.url });
  };

  const activeHandText = useMemo(() => {
    if (handedness === 'RIGHT') return 'Активная ладонь: правая · Пассивная: левая';
    if (handedness === 'LEFT') return 'Активная ладонь: левая · Пассивная: правая';
    if (handedness === 'AMBI') return 'Активная ладонь: та, которой чаще пишешь/работаешь';
    return '';
  }, [handedness]);

  const submitDisabled = !handedness || !dobOk || !bothUploaded || selectedCount === 0;

  const onSubmit = () => {
    haptic('medium');
    // TODO: собрать payload и отправить на /api/analyze-palm (когда сделаем)
    console.log('submit', {
      handedness,
      dob,
      leftUrl: left.url,
      rightUrl: right.url,
      selected,
      totalRub,
    });
  };

  return (
    <main className="page">
      <header className="hero" aria-label="Заголовок">
        <div className="title">ХИРОМАНТ</div>
        <div className="subtitle">две ладони · один отчёт</div>
      </header>

      {/* Шаг 1 — рука */}
      <section className="card" aria-label="Выбор ведущей руки">
        <div className="cardTitle">Кто вы?</div>
        <div className="cardSub">Выберите — чтобы мы правильно определили активную ладонь.</div>

        <div className="chips">
          <button type="button" className={`chip ${handedness === 'RIGHT' ? 'chip--on' : ''}`} onClick={() => setHand('RIGHT')}>
            Правша
          </button>
          <button type="button" className={`chip ${handedness === 'LEFT' ? 'chip--on' : ''}`} onClick={() => setHand('LEFT')}>
            Левша
          </button>
          <button type="button" className={`chip ${handedness === 'AMBI' ? 'chip--on' : ''}`} onClick={() => setHand('AMBI')}>
            Амбидекстер
          </button>
        </div>

        {handedness ? <div className="hint">{activeHandText}</div> : null}
      </section>

      {/* Шаг 2 — дата */}
      {canShowDob ? (
        <section className="card" aria-label="Дата рождения">
          <div className="cardTitle">Дата рождения</div>
          <div className="cardSub">Формат: дд.мм.гггг</div>

          <div className={`field ${dob.length > 0 && !dobOk ? 'field--bad' : ''}`}>
            <input
              value={dob}
              onChange={(e) => setDob(e.target.value)}
              inputMode="numeric"
              placeholder="например 07.11.1999"
              aria-label="Дата рождения"
            />
          </div>

          {dob.length > 0 && !dobOk ? <div className="err">Проверь формат даты: дд.мм.гггг</div> : null}
        </section>
      ) : null}

      {/* Шаг 3 — фото */}
      {canShowUploads ? (
        <section className="card" aria-label="Загрузка фото ладоней">
          <div className="cardTitle">Фото ладоней</div>
          <div className="cardSub">Загрузите обе ладони. Фото должны быть чёткие, ладонь целиком, без сильной тени.</div>

          <div className="uploadGrid">
            <div className="uploadBox">
              <div className="uploadHead">Загрузите левую ладонь</div>
              <label className={`uploadBtn ${left.uploading ? 'is-loading' : ''}`}>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => onPickFile(e.target.files?.[0] ?? null, 'left')}
                />
                {left.url ? 'Загружено ✓' : left.uploading ? 'Загружаю…' : 'Выбрать фото'}
              </label>
              <div className="uploadMeta">
                {left.fileName ? <div className="metaLine">{left.fileName}</div> : <div className="metaLine muted">Файл не выбран</div>}
                {left.error ? <div className="metaLine err">{left.error}</div> : null}
              </div>
            </div>

            <div className="uploadBox">
              <div className="uploadHead">Загрузите правую ладонь</div>
              <label className={`uploadBtn ${right.uploading ? 'is-loading' : ''}`}>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => onPickFile(e.target.files?.[0] ?? null, 'right')}
                />
                {right.url ? 'Загружено ✓' : right.uploading ? 'Загружаю…' : 'Выбрать фото'}
              </label>
              <div className="uploadMeta">
                {right.fileName ? <div className="metaLine">{right.fileName}</div> : <div className="metaLine muted">Файл не выбран</div>}
                {right.error ? <div className="metaLine err">{right.error}</div> : null}
              </div>
            </div>
          </div>

          {!bothUploaded ? <div className="hint">После загрузки двух фото появится выбор, что именно разбирать.</div> : null}
        </section>
      ) : null}

      {/* Шаг 4 — что рассматриваем */}
      {bothUploaded ? (
        <section className="card" aria-label="Выбор блоков разбора">
          <div className="cardTitle">Что будем рассматривать</div>
          <div className="cardSub">Нажмите на пункт — появится ✓ и стоимость +{PRICE_RUB} ₽</div>

          <div className="optGrid">
            {options.map((o) => {
              const on = selected[o.key];
              return (
                <button key={o.key} type="button" className={`opt ${on ? 'opt--on' : ''}`} onClick={() => toggleOption(o.key)}>
                  <div className="optMain">
                    <div className="optTitle">{o.title}</div>
                    <div className="optSub">{o.sub}</div>
                  </div>
                  <div className="optRight">
                    {on ? <span className="tick">✓</span> : <span className="plus">+{PRICE_RUB} ₽</span>}
                  </div>
                </button>
              );
            })}
          </div>

          <div className="totalRow">
            <div className="totalLeft">
              <div className="totalLabel">Итого</div>
              <div className="totalSub">
                Выбрано: <b>{selectedCount}</b> · {PRICE_RUB} ₽ за пункт
              </div>
            </div>
            <div className="totalRight">{totalRub} ₽</div>
          </div>

          <button type="button" className={`submit ${submitDisabled ? 'is-disabled' : ''}`} disabled={submitDisabled} onClick={onSubmit}>
            Продолжить
          </button>
        </section>
      ) : null}

      <style jsx>{`
        .page {
          min-height: 100dvh;
          padding: 0 0 calc(env(safe-area-inset-bottom, 0px) + 18px);
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        /* ===== HERO ===== */
        .hero {
          margin-top: 6px;
          margin-bottom: 2px;
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
          background: linear-gradient(
            115deg,
            #fff3cf 0%,
            #d2b35b 18%,
            #f6e7b0 36%,
            #b8892a 54%,
            #fff3cf 72%,
            #d2b35b 100%
          );
          background-size: 220% 100%;
          -webkit-background-clip: text;
          background-clip: text;
          text-shadow: 0 1px 0 rgba(255, 255, 255, 0.06), 0 18px 44px rgba(0, 0, 0, 0.65);
          animation: shimmer 3.2s ease-in-out infinite;
          will-change: background-position;
        }

        @keyframes shimmer {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }

        .subtitle {
          position: relative;
          font-size: 12px;
          color: rgba(233, 236, 255, 0.64);
          letter-spacing: 0.14em;
          text-transform: uppercase;
        }

        /* ===== CARDS ===== */
        .card {
          border-radius: 22px;
          padding: 16px 14px 16px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(233, 236, 255, 0.12);
          box-shadow: var(--shadow);
          backdrop-filter: blur(16px) saturate(140%);
          -webkit-backdrop-filter: blur(16px) saturate(140%);
        }

        .cardTitle {
          font-size: 16px;
          font-weight: 900;
          color: var(--text);
          letter-spacing: -0.01em;
        }

        .cardSub {
          margin-top: 6px;
          font-size: 13px;
          color: rgba(233, 236, 255, 0.68);
          line-height: 1.35;
        }

        .hint {
          margin-top: 10px;
          font-size: 12px;
          color: rgba(233, 236, 255, 0.62);
          padding-top: 10px;
          border-top: 1px solid rgba(233, 236, 255, 0.10);
        }

        .err {
          margin-top: 8px;
          font-size: 12px;
          color: rgba(255, 180, 180, 0.95);
        }

        /* ===== CHIPS ===== */
        .chips {
          margin-top: 12px;
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
        }

        .chip {
          flex: 1;
          min-width: 96px;
          padding: 10px 12px;
          border-radius: 999px;
          border: 1px solid rgba(233, 236, 255, 0.14);
          background: rgba(255, 255, 255, 0.03);
          color: rgba(233, 236, 255, 0.90);
          font-size: 13px;
          font-weight: 850;
          cursor: pointer;
          -webkit-tap-highlight-color: transparent;
          text-align: center;
        }

        .chip--on {
          border-color: rgba(210, 179, 91, 0.40);
          box-shadow: 0 14px 38px rgba(0, 0, 0, 0.45);
        }

        .chip:active {
          transform: scale(0.98);
          opacity: 0.92;
        }

        /* ===== FIELD ===== */
        .field {
          margin-top: 12px;
          border-radius: 16px;
          border: 1px solid rgba(233, 236, 255, 0.14);
          background: rgba(255, 255, 255, 0.03);
          padding: 12px 12px;
        }

        .field--bad {
          border-color: rgba(255, 180, 180, 0.45);
        }

        .field input {
          width: 100%;
          border: 0;
          outline: none;
          background: transparent;
          color: var(--text);
          font-size: 16px;
          font-weight: 800;
          letter-spacing: 0.02em;
        }

        /* ===== UPLOADS ===== */
        .uploadGrid {
          margin-top: 12px;
          display: grid;
          gap: 12px;
        }

        .uploadBox {
          border-radius: 18px;
          padding: 14px 12px 12px;
          border: 1px solid rgba(233, 236, 255, 0.10);
          background: rgba(255, 255, 255, 0.03);
          box-shadow: 0 10px 26px rgba(0, 0, 0, 0.40);
        }

        .uploadHead {
          font-weight: 900;
          color: rgba(233, 236, 255, 0.92);
          font-size: 14px;
          letter-spacing: -0.01em;
        }

        .uploadBtn {
          margin-top: 10px;
          display: inline-flex;
          width: 100%;
          justify-content: center;
          align-items: center;
          padding: 10px 12px;
          border-radius: 999px;
          border: 1px solid rgba(210, 179, 91, 0.30);
          background: rgba(255, 255, 255, 0.04);
          color: var(--text);
          font-weight: 900;
          font-size: 13px;
          cursor: pointer;
          -webkit-tap-highlight-color: transparent;
          position: relative;
          overflow: hidden;
        }

        .uploadBtn input {
          display: none;
        }

        .uploadBtn.is-loading {
          opacity: 0.85;
        }

        .uploadBtn:active {
          transform: scale(0.98);
          opacity: 0.92;
        }

        .uploadMeta {
          margin-top: 10px;
          font-size: 12px;
          color: rgba(233, 236, 255, 0.62);
        }

        .metaLine + .metaLine {
          margin-top: 4px;
        }

        .muted {
          opacity: 0.7;
        }

        /* ===== OPTIONS ===== */
        .optGrid {
          margin-top: 12px;
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
          cursor: pointer;
          -webkit-tap-highlight-color: transparent;
          text-align: left;
        }

        .opt:active {
          transform: scale(0.99);
          opacity: 0.92;
        }

        .opt--on {
          border-color: rgba(210, 179, 91, 0.40);
          background: rgba(255, 255, 255, 0.04);
        }

        .optTitle {
          font-weight: 950;
          color: rgba(233, 236, 255, 0.92);
          font-size: 14px;
        }

        .optSub {
          margin-top: 3px;
          font-size: 12px;
          color: rgba(233, 236, 255, 0.62);
          line-height: 1.25;
        }

        .optRight {
          margin-left: 10px;
          min-width: 74px;
          display: flex;
          justify-content: flex-end;
          align-items: center;
          font-weight: 950;
        }

        .tick {
          color: rgba(210, 179, 91, 0.95);
          font-size: 18px;
        }

        .plus {
          color: rgba(233, 236, 255, 0.70);
          font-size: 12px;
        }

        /* ===== TOTAL ===== */
        .totalRow {
          margin-top: 12px;
          padding-top: 12px;
          border-top: 1px solid rgba(233, 236, 255, 0.10);
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
        }

        .totalLabel {
          font-weight: 950;
          color: rgba(233, 236, 255, 0.92);
          font-size: 14px;
        }

        .totalSub {
          margin-top: 3px;
          font-size: 12px;
          color: rgba(233, 236, 255, 0.62);
        }

        .totalRight {
          font-weight: 950;
          color: rgba(210, 179, 91, 0.95);
          font-size: 16px;
          letter-spacing: 0.02em;
          white-space: nowrap;
        }

        .submit {
          margin-top: 12px;
          width: 100%;
          padding: 11px 14px;
          border-radius: 999px;
          border: 1px solid rgba(210, 179, 91, 0.35);
          background: rgba(255, 255, 255, 0.04);
          color: var(--text);
          font-size: 14px;
          font-weight: 950;
          cursor: pointer;
          -webkit-tap-highlight-color: transparent;
          box-shadow: 0 14px 38px rgba(0, 0, 0, 0.45);
        }

        .submit:active {
          transform: scale(0.98);
          opacity: 0.92;
        }

        .submit.is-disabled {
          opacity: 0.55;
          cursor: not-allowed;
        }
      `}</style>
    </main>
  );
}
