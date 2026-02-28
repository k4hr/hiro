/* path: app/date-code/combo/report/ReportClient.tsx */
'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';

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

type Payload = {
  mode: 'COMBO';
  dob: string; // dd.mm.yyyy
  age: number | null;
  name: string;
  selected: Record<OptionKey, boolean>;
  totalRub: number;
  priceRub: number;
  summaryPriceRub: number;
  createdAt: string;
};

type DbReport = {
  id: string;
  status: string;
  createdAt: string;
  errorCode: string | null;
  errorText: string | null;
  input: any | null;
};

type GetResp =
  | {
      ok: true;
      report: DbReport | null;
      text: string;
      hasText: boolean;
    }
  | { ok: false; error: string; hint?: string };

function safeSelectedFromDb(input: any): Record<OptionKey, boolean> | null {
  try {
    const sel = input?.selected;
    if (!sel || typeof sel !== 'object') return null;
    const keys: OptionKey[] = [
      'COMBO_RESONANCE',
      'COMBO_STRENGTHS',
      'COMBO_WEAKNESSES',
      'COMBO_MONEY',
      'COMBO_CAREER',
      'COMBO_COMM',
      'COMBO_ENERGY',
      'COMBO_LESSON',
      'SUMMARY',
    ];
    const out: any = {};
    for (const k of keys) out[k] = sel[k] === true;
    out.SUMMARY = true;
    return out as Record<OptionKey, boolean>;
  } catch {
    return null;
  }
}

function optionTitle(k: OptionKey) {
  switch (k) {
    case 'COMBO_RESONANCE':
      return 'Резонанс имени и жизненного пути';
    case 'COMBO_STRENGTHS':
      return 'Сильные стороны комбо';
    case 'COMBO_WEAKNESSES':
      return 'Слабые места комбо';
    case 'COMBO_MONEY':
      return 'Деньги и стратегия заработка';
    case 'COMBO_CAREER':
      return 'Карьера и формат работы';
    case 'COMBO_COMM':
      return 'Коммуникация и влияние';
    case 'COMBO_ENERGY':
      return 'Энергия и режим';
    case 'COMBO_LESSON':
      return 'Главный урок комбо';
    case 'SUMMARY':
      return 'Итог + общие советы';
    default:
      return String(k);
  }
}

function buildShareUrl(): string {
  const envUrl = (process.env.NEXT_PUBLIC_TMA_SHARE_URL || '').trim();
  if (envUrl) return envUrl;

  try {
    const u = new URL(window.location.href);
    return `${u.origin}/date-code`;
  } catch {
    return '/date-code';
  }
}

function openShare() {
  haptic('medium');

  const url = buildShareUrl();
  const text = 'Смотри разбор “Код судьбы” в мини-приложении';
  const shareLink = `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`;

  try {
    const w = tg();
    if (w?.openTelegramLink) {
      w.openTelegramLink(shareLink);
      return;
    }
  } catch {}

  try {
    window.open(shareLink, '_blank');
  } catch {
    window.location.href = shareLink;
  }
}

function storageKeyForCombo(dob: string, name: string) {
  return `date_code_combo_${dob}_${name}`.slice(0, 140);
}

export default function ReportClient() {
  const sp = useSearchParams();
  const dob = String(sp.get('dob') || '').trim();
  const name = String(sp.get('name') || '').trim();

  const [payload, setPayload] = useState<Payload | null>(null);
  const [dbReport, setDbReport] = useState<DbReport | null>(null);
  const [dbSelected, setDbSelected] = useState<Record<OptionKey, boolean> | null>(null);

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string>('');
  const [text, setText] = useState<string>('');
  const [info, setInfo] = useState<string>('');

  const selectedForUi = payload?.selected ?? dbSelected;

  const selectedKeysRu = useMemo(() => {
    const s = selectedForUi;
    if (!s) return [];
    return (Object.entries(s) as Array<[OptionKey, boolean]>)
      .filter(([, v]) => v)
      .map(([k]) => optionTitle(k));
  }, [selectedForUi]);

  useEffect(() => {
    try {
      tg()?.ready?.();
      tg()?.expand?.();
    } catch {}
  }, []);

  useEffect(() => {
    if (!dob) {
      setErr('NO_DOB');
      return;
    }
    if (!name) {
      setErr('NO_NAME');
      return;
    }

    try {
      const raw = sessionStorage.getItem(storageKeyForCombo(dob, name));
      if (raw) {
        const j = JSON.parse(raw) as Payload;
        if (j && j.mode === 'COMBO' && j.dob === dob && String(j.name) === name) setPayload(j);
      }
    } catch {}

    fetchFromDb();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dob, name]);

  const fetchFromDb = async () => {
    const initData = getInitDataNow();
    if (!initData) {
      setErr('NO_INIT_DATA');
      return;
    }

    setInfo('');
    setErr('');
    setLoading(true);

    try {
      const res = await fetch('/api/combo/get', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ initData, dob, name }),
      });

      const j = (await res.json().catch(() => null)) as GetResp | null;

      if (!res.ok || !j || (j as any).ok !== true) {
        setErr((j as any)?.error ? String((j as any).error) : `GET_FAILED(${res.status})`);
        setLoading(false);
        return;
      }

      const rep = (j as any).report ?? null;
      setDbReport(rep);

      const selFromDb = rep?.input ? safeSelectedFromDb(rep.input) : null;
      if (selFromDb) setDbSelected(selFromDb);

      if ((j as any).hasText && (j as any).text) {
        setText(String((j as any).text));
        setLoading(false);
        return;
      }

      setInfo('Отчёт ещё не создан. Сейчас запустим анализ.');
      setLoading(false);

      const s = payload?.selected ?? selFromDb;
      const age = payload?.age ?? (rep?.input?.age ?? null);

      if (s) {
        runAnalyze({ dob, name, age, selected: s });
      }
    } catch (e: any) {
      setErr(e?.message ? String(e.message) : 'NETWORK');
      setLoading(false);
    }
  };

  const runAnalyze = async (p: { dob: string; name: string; age: any; selected: Record<OptionKey, boolean> }) => {
    const initData = getInitDataNow();
    if (!initData) {
      setErr('NO_INIT_DATA');
      return;
    }

    setErr('');
    setInfo('');
    setText('');
    setLoading(true);

    try {
      const res = await fetch('/api/combo/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          initData,
          dob: p.dob,
          name: p.name,
          age: p.age,
          selected: p.selected,
        }),
      });

      const j = (await res.json().catch(() => null)) as any;
      if (!res.ok || !j || j.ok !== true || typeof j.text !== 'string') {
        setErr(j?.error ? String(j.error) : `ANALYZE_FAILED(${res.status})`);
        setLoading(false);
        return;
      }

      setText(String(j.text));
      setLoading(false);
    } catch (e: any) {
      setErr(e?.message ? String(e.message) : 'NETWORK');
      setLoading(false);
    }
  };

  const forceAnalyze = () => {
    haptic('medium');

    const sel = payload?.selected ?? dbSelected;
    const repInput = dbReport?.input ?? null;
    const age = payload?.age ?? (repInput?.age ?? null);

    if (!dob) {
      setErr('NO_DOB');
      return;
    }
    if (!name) {
      setErr('NO_NAME');
      return;
    }
    if (!sel) {
      setErr('NO_SELECTED_IN_DB');
      setInfo('Нет сохранённых пунктов. Вернись назад и нажми “Продолжить” ещё раз.');
      return;
    }

    runAnalyze({ dob, name, age, selected: sel });
  };

  const goBack = () => {
    haptic('light');
    try {
      window.history.back();
      return;
    } catch {}
    window.location.href = '/date-code/combo';
  };

  const showMeta = Boolean(dob || name || dbSelected || payload);
  const ready = Boolean(text) && !loading && !err;

  return (
    <main className="p">
      <header className="hero">
        <div className="title">РАЗБОР</div>
        <div className="subtitle">{ready ? 'ОТЧЁТ ГОТОВ' : loading ? 'ПРОХОДИТ АНАЛИЗ...' : 'ЗАГРУЗКА...'}</div>
      </header>

      {err ? (
        <section className="card">
          <div className="label">Ошибка</div>
          <div className="warn">{err}</div>
          <div className="row">
            <button type="button" className="btn" onClick={fetchFromDb} disabled={loading}>
              Обновить
            </button>
            <button type="button" className="btn2" onClick={goBack}>
              Назад
            </button>
          </div>
        </section>
      ) : null}

      {info ? (
        <section className="card">
          <div className="label">Статус</div>
          <div className="hint">{info}</div>
        </section>
      ) : null}

      {showMeta ? (
        <section className="card">
          <div className="label">Данные</div>
          <div className="meta">
            <div className="metaLine">
              <b>Дата:</b> {dob || '—'}
            </div>
            <div className="metaLine">
              <b>Имя:</b> {name || '—'}
            </div>

            {selectedKeysRu.length ? (
              <div className="metaLine">
                <b>Пункты:</b> {selectedKeysRu.join(', ')}
              </div>
            ) : (
              <div className="metaLine muted">Пункты не найдены.</div>
            )}
          </div>
        </section>
      ) : null}

      <section className="card">
        <div className="label">Отчёт</div>

        {loading ? <div className="hint">Готовим разбор…</div> : null}
        {!loading && !text ? <div className="hint">Пока пусто.</div> : null}

        {text ? <pre className="out">{text}</pre> : null}

        <div className="row">
          <button type="button" className="btn" onClick={fetchFromDb} disabled={loading}>
            Обновить из БД
          </button>
          <button type="button" className="btn2" onClick={goBack}>
            Назад
          </button>
        </div>

        <div className="row">
          <button type="button" className="btn3" onClick={forceAnalyze} disabled={loading}>
            Пересоздать отчёт (OpenAI)
          </button>
        </div>

        {ready ? (
          <button type="button" className="share" onClick={openShare}>
            Поделиться
          </button>
        ) : null}
      </section>

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

        .title {
          font-family: Montserrat, Manrope, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, 'Helvetica Neue', Arial;
          font-weight: 900;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          font-size: 24px;
          line-height: 1.05;
          margin: 0 0 6px;
          color: rgba(233, 236, 255, 0.92);
        }

        .subtitle {
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

        .hint {
          font-size: 12px;
          font-weight: 800;
          color: rgba(233, 236, 255, 0.62);
          padding-top: 6px;
          overflow-wrap: anywhere;
        }

        .warn {
          font-size: 12px;
          font-weight: 850;
          color: rgba(255, 180, 180, 0.95);
          overflow-wrap: anywhere;
        }

        .meta {
          font-size: 12px;
          font-weight: 800;
          color: rgba(233, 236, 255, 0.7);
          word-break: break-word;
        }

        .metaLine + .metaLine {
          margin-top: 4px;
        }

        .muted {
          opacity: 0.7;
        }

        .out {
          margin: 0;
          padding: 12px;
          border-radius: 16px;
          border: 1px solid rgba(233, 236, 255, 0.1);
          background: rgba(0, 0, 0, 0.25);
          color: rgba(233, 236, 255, 0.92);
          font-size: 13px;
          line-height: 1.45;
          white-space: pre-wrap;
          word-break: break-word;
        }

        .row {
          display: flex;
          gap: 10px;
          margin-top: 4px;
        }

        .btn,
        .btn2,
        .btn3 {
          flex: 1;
          border-radius: 999px;
          padding: 12px 14px;
          font-size: 14px;
          font-weight: 950;
          cursor: pointer;
          -webkit-tap-highlight-color: transparent;
        }

        .btn {
          border: 1px solid rgba(210, 179, 91, 0.35);
          color: var(--text);
          background: rgba(255, 255, 255, 0.04);
          box-shadow: 0 14px 38px rgba(0, 0, 0, 0.45);
        }

        .btn:disabled {
          opacity: 0.55;
          cursor: not-allowed;
          box-shadow: none;
        }

        .btn2 {
          border: 1px solid rgba(233, 236, 255, 0.14);
          color: rgba(233, 236, 255, 0.92);
          background: rgba(255, 255, 255, 0.03);
        }

        .btn3 {
          border: 1px solid rgba(233, 236, 255, 0.14);
          color: rgba(233, 236, 255, 0.92);
          background: rgba(255, 255, 255, 0.02);
        }

        .share {
          margin-top: 8px;
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

        .share:active {
          transform: scale(0.98);
          opacity: 0.92;
        }
      `}</style>
    </main>
  );
}
