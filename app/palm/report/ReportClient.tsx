/* path: app/palm/report/ReportClient.tsx */
'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

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

type Handedness = 'RIGHT' | 'LEFT' | 'AMBI';
type OptionKey =
  | 'HEART'
  | 'HEAD'
  | 'LIFE'
  | 'FATE'
  | 'SUN'
  | 'MERCURY'
  | 'MOUNTS'
  | 'HANDS_DIFF';

type Payload = {
  scanId: string;
  handedness: Handedness;
  dob: string;
  age: number | null;
  leftUrl: string;
  rightUrl: string;
  selected: Record<OptionKey, boolean>;
  totalRub: number;
};

type DbReport = {
  id: string;
  status: string;
  createdAt: string;
  errorCode: string | null;
  errorText: string | null;
  input: any | null;
};

type ScanGetResp =
  | {
      ok: true;
      scan: {
        id: string;
        status: string;
        createdAt: string;
        leftImageUrl: string | null;
        rightImageUrl: string | null;
        errorCode: string | null;
        errorText: string | null;
      };
      report: DbReport | null;
      text: string;
      hasText: boolean;
    }
  | { ok: false; error: string; hint?: string };

function safeSelectedFromDb(input: any): Record<OptionKey, boolean> | null {
  try {
    const sel = input?.selected;
    if (!sel || typeof sel !== 'object') return null;
    const keys: OptionKey[] = ['HEART', 'HEAD', 'LIFE', 'FATE', 'SUN', 'MERCURY', 'MOUNTS', 'HANDS_DIFF'];
    const out: any = {};
    for (const k of keys) out[k] = sel[k] === true;
    return out as Record<OptionKey, boolean>;
  } catch {
    return null;
  }
}

export default function ReportClient() {
  const router = useRouter();
  const sp = useSearchParams();
  const scanId = String(sp.get('scanId') || '').trim();

  const [payload, setPayload] = useState<Payload | null>(null);
  const [dbReport, setDbReport] = useState<DbReport | null>(null);
  const [dbSelected, setDbSelected] = useState<Record<OptionKey, boolean> | null>(null);

  const [scanStatus, setScanStatus] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string>('');
  const [text, setText] = useState<string>('');
  const [info, setInfo] = useState<string>('');

  const selectedForUi = payload?.selected ?? dbSelected;

  const selectedKeys = useMemo(() => {
    const s = selectedForUi;
    if (!s) return [];
    return Object.entries(s)
      .filter(([, v]) => v)
      .map(([k]) => k);
  }, [selectedForUi]);

  useEffect(() => {
    try {
      tg()?.ready?.();
      tg()?.expand?.();
    } catch {}
  }, []);

  useEffect(() => {
    if (!scanId) {
      setErr('NO_SCAN_ID');
      return;
    }

    try {
      const raw = sessionStorage.getItem(`palm_submit_${scanId}`);
      if (raw) {
        const j = JSON.parse(raw) as Payload;
        if (j && j.scanId === scanId) setPayload(j);
      }
    } catch {}

    fetchFromDb();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scanId]);

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
      const res = await fetch('/api/palm/get', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ initData, scanId }),
      });

      const j = (await res.json().catch(() => null)) as ScanGetResp | null;

      if (!res.ok || !j || (j as any).ok !== true) {
        setErr((j as any)?.error ? String((j as any).error) : `GET_FAILED(${res.status})`);
        setLoading(false);
        return;
      }

      setScanStatus(j.scan?.status ? String(j.scan.status) : '');

      const rep = j.report ?? null;
      setDbReport(rep);

      const selFromDb = rep?.input ? safeSelectedFromDb(rep.input) : null;
      if (selFromDb) setDbSelected(selFromDb);

      if (j.hasText && j.text) {
        setText(String(j.text));
        setLoading(false);
        return;
      }

      setInfo('Отчёт ещё не создан. Сейчас можно запустить анализ.');
      setLoading(false);

      const s = payload?.selected ?? selFromDb;
      if (s) {
        runAnalyze({
          scanId,
          handedness: (payload?.handedness ?? (rep?.input?.handedness as Handedness) ?? 'RIGHT') as Handedness,
          dob: String(payload?.dob ?? rep?.input?.dob ?? ''),
          age: payload?.age ?? (rep?.input?.age ?? null),
          selected: s,
        });
      }
    } catch (e: any) {
      setErr(e?.message ? String(e.message) : 'NETWORK');
      setLoading(false);
    }
  };

  const runAnalyze = async (p: {
    scanId: string;
    handedness: Handedness;
    dob: string;
    age: any;
    selected: Record<OptionKey, boolean>;
  }) => {
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
      const res = await fetch('/api/palm/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          initData,
          scanId: p.scanId,
          handedness: p.handedness,
          dob: p.dob,
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

  const goBack = () => {
    haptic('light');
    router.push('/palm');
  };

  const retry = () => {
    haptic('medium');
    fetchFromDb();
  };

  const forceAnalyze = () => {
    haptic('medium');

    const sel = payload?.selected ?? dbSelected;
    const repInput = dbReport?.input ?? null;

    const handedness = (payload?.handedness ?? (repInput?.handedness as Handedness) ?? null) as Handedness | null;
    const dob = String(payload?.dob ?? repInput?.dob ?? '');
    const age = payload?.age ?? (repInput?.age ?? null);

    if (!sel) {
      setErr('NO_SELECTED_IN_DB');
      setInfo('Нет сохранённых пунктов выбора. Нажми “Скан заново” и пройди шаг выбора пунктов.');
      return;
    }
    if (!handedness || !dob) {
      setErr('NO_INPUT_FOR_ANALYZE');
      setInfo('Не хватает данных для пересоздания. Нажми “Скан заново”.');
      return;
    }

    runAnalyze({ scanId, handedness, dob, age, selected: sel });
  };

  const showMeta = Boolean(payload || scanStatus || dbSelected);

  return (
    <main className="p">
      <header className="hero">
        <div className="title">РАЗБОР</div>
        <div className="subtitle">ИИ анализирует две ладони</div>
      </header>

      {err ? (
        <section className="card">
          <div className="label">Ошибка</div>
          <div className="warn">{err}</div>
          <div className="row">
            <button type="button" className="btn" onClick={retry} disabled={loading}>
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
          {scanStatus ? (
            <div className="hint">
              PalmScan.status: <b>{scanStatus}</b>
            </div>
          ) : null}
        </section>
      ) : null}

      {showMeta ? (
        <section className="card">
          <div className="label">Данные</div>
          <div className="meta">
            <div className="metaLine">
              <b>ScanId:</b> {scanId || '—'}
            </div>

            {scanStatus ? (
              <div className="metaLine">
                <b>Status:</b> {scanStatus}
              </div>
            ) : null}

            {selectedKeys.length ? (
              <div className="metaLine">
                <b>Пункты:</b> {selectedKeys.join(', ')}
              </div>
            ) : (
              <div className="metaLine muted">Пункты не найдены.</div>
            )}

            {!payload ? <div className="metaLine muted">Параметры подтянуты из БД (можно открывать позже и пересоздавать).</div> : null}
          </div>
        </section>
      ) : null}

      <section className="card">
        <div className="label">Отчёт</div>

        {loading ? <div className="hint">Готовим разбор…</div> : null}
        {!loading && !text ? <div className="hint">Пока пусто.</div> : null}

        {text ? <pre className="out">{text}</pre> : null}

        <div className="row">
          <button type="button" className="btn" onClick={retry} disabled={loading}>
            Обновить из БД
          </button>
          <button type="button" className="btn2" onClick={goBack}>
            Скан заново
          </button>
        </div>

        <div className="row">
          <button type="button" className="btn3" onClick={forceAnalyze} disabled={loading}>
            Пересоздать отчёт (OpenAI)
          </button>
        </div>

        <div className="disclaimer">Это развлекательная интерпретация (хиромантия), а не медицина и не диагностика.</div>
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

        .disclaimer {
          margin-top: 8px;
          padding-top: 10px;
          border-top: 1px solid rgba(233, 236, 255, 0.1);
          font-size: 12px;
          font-weight: 800;
          color: rgba(233, 236, 255, 0.58);
          line-height: 1.35;
        }
      `}</style>
    </main>
  );
}
