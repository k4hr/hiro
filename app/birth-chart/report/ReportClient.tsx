/* path: app/birth-chart/report/ReportClient.tsx */
'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
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

type OptionKey = 'ASTRO_PERSON' | 'ASTRO_LOVE' | 'ASTRO_MONEY' | 'ASTRO_CAREER' | 'ASTRO_TIMING' | 'ASTRO_FORMULA';

type Payload = {
  mode: 'ASTRO';
  dob: string;
  age: number | null;
  birthPlace: string;
  birthTime: string;
  accuracyLevel: number;
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
      paid: boolean;
      paymentStatus: string;
    }
  | { ok: false; error: string; hint?: string };

function safeSelectedFromDb(input: any): Record<OptionKey, boolean> | null {
  try {
    const sel = input?.selected;
    if (!sel || typeof sel !== 'object') return null;
    const keys: OptionKey[] = ['ASTRO_PERSON', 'ASTRO_LOVE', 'ASTRO_MONEY', 'ASTRO_CAREER', 'ASTRO_TIMING', 'ASTRO_FORMULA'];
    const out: any = {};
    for (const k of keys) out[k] = sel[k] === true;
    out.ASTRO_FORMULA = true;
    return out as Record<OptionKey, boolean>;
  } catch {
    return null;
  }
}

function optionTitle(k: OptionKey) {
  switch (k) {
    case 'ASTRO_PERSON':
      return 'Портрет личности';
    case 'ASTRO_LOVE':
      return 'Любовь и отношения';
    case 'ASTRO_MONEY':
      return 'Деньги, богатство, успех';
    case 'ASTRO_CAREER':
      return 'Карьера и предназначение';
    case 'ASTRO_TIMING':
      return 'Тайминг: год + 12 месяцев';
    case 'ASTRO_FORMULA':
      return 'Итог: формула карты';
    default:
      return String(k);
  }
}

function buildShareUrl(): string {
  const envUrl = (process.env.NEXT_PUBLIC_TMA_SHARE_URL || '').trim();
  if (envUrl) return envUrl;

  try {
    const u = new URL(window.location.href);
    return `${u.origin}/birth-chart`;
  } catch {
    return '/birth-chart';
  }
}

function openShare() {
  haptic('medium');

  const url = buildShareUrl();
  const text = 'Смотри разбор “Карта неба” в мини-приложении';
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

async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (!text) return false;
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', 'true');
      ta.style.position = 'fixed';
      ta.style.left = '-9999px';
      ta.style.top = '0';
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(ta);
      return ok;
    } catch {
      return false;
    }
  }
}

function storageKeyAstro(dob: string, place: string, time: string) {
  return `birth_chart_${dob}_${place}_${time}`.slice(0, 140);
}

export default function ReportClient() {
  const router = useRouter();
  const sp = useSearchParams();

  const dob = String(sp.get('dob') || '').trim();
  const place = String(sp.get('place') || '').trim();
  const time = String(sp.get('time') || '').trim();
  const reportId = String(sp.get('reportId') || '').trim();

  const [payload, setPayload] = useState<Payload | null>(null);
  const [dbReport, setDbReport] = useState<DbReport | null>(null);
  const [dbSelected, setDbSelected] = useState<Record<OptionKey, boolean> | null>(null);

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string>('');
  const [text, setText] = useState<string>('');
  const [info, setInfo] = useState<string>('');
  const [paid, setPaid] = useState<boolean>(false);
  const [paymentStatus, setPaymentStatus] = useState<string>('');

  const [toast, setToast] = useState<string>('');
  const toastOn = Boolean(toast);

  const selectedForUi = payload?.selected ?? dbSelected;

  const selectedKeysRu = useMemo(() => {
    const s = selectedForUi;
    if (!s) return [];
    return (Object.entries(s) as Array<[OptionKey, boolean]>)
      .filter(([, v]) => v)
      .map(([k]) => optionTitle(k));
  }, [selectedForUi]);

  const analyzeStartedRef = useRef(false);
  const pollRef = useRef<any>(null);

  const stopPoll = () => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  };

  const startPoll = () => {
    if (pollRef.current) return;
    pollRef.current = setInterval(() => {
      fetchFromDb(true);
    }, 2000);
  };

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

    try {
      const raw = sessionStorage.getItem(storageKeyAstro(dob, place, time));
      if (raw) {
        const j = JSON.parse(raw) as Payload;
        if (j && j.mode === 'ASTRO' && j.dob === dob) setPayload(j);
      }
    } catch {}

    analyzeStartedRef.current = false;
    fetchFromDb(false);

    return () => stopPoll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dob, place, time, reportId]);

  useEffect(() => {
    if (!toastOn) return;
    const t = setTimeout(() => setToast(''), 1800);
    return () => clearTimeout(t);
  }, [toastOn]);

  const fetchFromDb = async (silent = false) => {
    const initData = getInitDataNow();
    if (!initData) {
      if (!silent) setErr('NO_INIT_DATA');
      return;
    }

    if (!silent) {
      setInfo('');
      setErr('');
      setLoading(true);
    }

    try {
      const res = await fetch('/api/astro/get', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          initData,
          reportId,
          dob,
          birthPlace: place,
          birthTime: time,
        }),
      });

      const j = (await res.json().catch(() => null)) as GetResp | null;

      if (!res.ok || !j || (j as any).ok !== true) {
        if (!silent) {
          setErr((j as any)?.error ? String((j as any).error) : `GET_FAILED(${res.status})`);
          setLoading(false);
        }
        return;
      }

      const rep = j.report ?? null;
      setDbReport(rep);
      setPaymentStatus(String(j.paymentStatus || ''));

      const selFromDb = rep?.input ? safeSelectedFromDb(rep.input) : null;
      if (selFromDb) setDbSelected(selFromDb);

      const isPaid = Boolean(j.paid === true);
      setPaid(isPaid);

      if (j.hasText && j.text) {
        stopPoll();
        setText(String(j.text));
        setInfo('');
        setLoading(false);
        return;
      }

      const selectedNow = payload?.selected ?? selFromDb;
      const agex = payload?.age ?? (rep?.input?.age ?? null);
      const accx = payload?.accuracyLevel ?? (rep?.input?.accuracyLevel ?? null);
      const bp = payload?.birthPlace ?? (rep?.input?.birthPlace ?? place);
      const bt = payload?.birthTime ?? (rep?.input?.birthTime ?? time);
      const repStatus = String(rep?.status || '').toUpperCase();

      if (!isPaid) {
        analyzeStartedRef.current = false;
        setText('');
        setInfo('Ожидаем подтверждение оплаты…');
        startPoll();
        setLoading(false);
        return;
      }

      if (repStatus === 'ANALYZING') {
        setText('');
        setInfo('Анализ уже идёт…');
        startPoll();
        setLoading(false);
        return;
      }

      stopPoll();

      if (!selectedNow) {
        setInfo('Данные для анализа не найдены.');
        setLoading(false);
        return;
      }

      if (!analyzeStartedRef.current) {
        analyzeStartedRef.current = true;
        setInfo('Оплата подтверждена. Запускаем анализ…');
        setLoading(false);

        runAnalyze({
          reportId,
          dob,
          age: agex,
          birthPlace: bp,
          birthTime: bt,
          accuracyLevel: accx,
          selected: selectedNow,
        });
        return;
      }

      setLoading(false);
    } catch (e: any) {
      if (!silent) {
        setErr(e?.message ? String(e.message) : 'NETWORK');
        setLoading(false);
      }
    }
  };

  const runAnalyze = async (p: {
    reportId: string;
    dob: string;
    age: any;
    birthPlace: string;
    birthTime: string;
    accuracyLevel: any;
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
      const res = await fetch('/api/astro/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          initData,
          reportId: p.reportId,
          dob: p.dob,
          age: p.age,
          birthPlace: p.birthPlace,
          birthTime: p.birthTime,
          accuracyLevel: p.accuracyLevel,
          selected: p.selected,
        }),
      });

      const j = (await res.json().catch(() => null)) as any;
      if (!res.ok || !j || j.ok !== true || typeof j.text !== 'string') {
        setErr(j?.error ? String(j.error) : `ANALYZE_FAILED(${res.status})`);
        setLoading(false);
        return;
      }

      stopPoll();
      setText(String(j.text));
      setInfo('');
      setLoading(false);

      fetchFromDb(true);
    } catch (e: any) {
      setErr(e?.message ? String(e.message) : 'NETWORK');
      setLoading(false);
    }
  };

  const forceAnalyze = () => {
    haptic('medium');

    const sel = payload?.selected ?? dbSelected;
    const repInput = dbReport?.input ?? null;

    const agex = payload?.age ?? (repInput?.age ?? null);
    const accx = payload?.accuracyLevel ?? (repInput?.accuracyLevel ?? null);
    const bp = payload?.birthPlace ?? (repInput?.birthPlace ?? place);
    const bt = payload?.birthTime ?? (repInput?.birthTime ?? time);

    if (!dob) {
      setErr('NO_DOB');
      return;
    }
    if (!sel) {
      setErr('NO_SELECTED_IN_DB');
      setInfo('Нет сохранённых пунктов. Вернись назад и нажми “Продолжить” ещё раз.');
      return;
    }
    if (!paid) {
      setErr('PAYMENT_NOT_CONFIRMED');
      setInfo('Сначала должна подтвердиться оплата.');
      return;
    }

    analyzeStartedRef.current = true;
    runAnalyze({
      reportId: reportId || String(dbReport?.id || ''),
      dob,
      age: agex,
      birthPlace: bp,
      birthTime: bt,
      accuracyLevel: accx,
      selected: sel,
    });
  };

  const goBack = () => {
    haptic('light');
    router.push('/birth-chart');
  };

  const onCopy = async () => {
    haptic('light');
    const ok = await copyToClipboard(text || '');
    setToast(ok ? 'Скопировано' : 'Не удалось скопировать');
  };

  const showMeta = Boolean(dob || place || time || dbSelected || payload || dbReport);
  const ready = Boolean(text) && !loading && !err;

  return (
    <main className="p">
      <header className="hero">
        <div className="title">РАЗБОР</div>
        <div className="subtitle">{ready ? 'ОТЧЁТ ГОТОВ' : loading ? 'ПРОХОДИТ АНАЛИЗ...' : paid ? 'ОЖИДАЕМ ОТЧЁТ...' : 'ОЖИДАЕМ ОПЛАТУ...'}</div>
      </header>

      {toastOn ? (
        <div className="toast" aria-live="polite">
          {toast}
        </div>
      ) : null}

      {err ? (
        <section className="card">
          <div className="label">Ошибка</div>
          <div className="warn">{err}</div>
          <div className="row">
            <button type="button" className="btn" onClick={() => fetchFromDb(false)} disabled={loading}>
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
          <div className="hint">
            Оплата: <b>{paid ? 'подтверждена' : 'ожидается'}</b>
          </div>
          {paymentStatus ? (
            <div className="hint">
              Payment status: <b>{paymentStatus}</b>
            </div>
          ) : null}
          {dbReport?.status ? (
            <div className="hint">
              Report status: <b>{dbReport.status}</b>
            </div>
          ) : null}
        </section>
      ) : null}

      {showMeta ? (
        <section className="card">
          <div className="label">Данные</div>
          <div className="meta">
            {reportId || dbReport?.id ? (
              <div className="metaLine">
                <b>ReportId:</b> {reportId || dbReport?.id || '—'}
              </div>
            ) : null}
            <div className="metaLine">
              <b>Дата:</b> {dob || '—'}
            </div>
            <div className="metaLine">
              <b>Место:</b> {place || '—'}
            </div>
            <div className="metaLine">
              <b>Время:</b> {time || '—'}
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
          <button type="button" className="btn2" onClick={onCopy} disabled={!ready}>
            Скопировать
          </button>
          <button type="button" className="btn" onClick={openShare} disabled={!ready}>
            Поделиться
          </button>
        </div>

        <div className="row">
          <button type="button" className="btn" onClick={() => fetchFromDb(false)} disabled={loading}>
            Обновить из БД
          </button>
          <button type="button" className="btn2" onClick={goBack}>
            Назад
          </button>
        </div>

        <div className="row">
          <button type="button" className="btn3" onClick={forceAnalyze} disabled={loading || !paid}>
            Пересоздать отчёт (OpenAI)
          </button>
        </div>
      </section>

      <section className="bottom" aria-label="Назад">
        <button type="button" className="backBtn" onClick={goBack}>
          Назад
        </button>
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

        .toast {
          width: 100%;
          max-width: 520px;
          padding: 10px 12px;
          border-radius: 14px;
          border: 1px solid rgba(233, 236, 255, 0.12);
          background: rgba(12, 16, 32, 0.7);
          color: rgba(233, 236, 255, 0.9);
          font-size: 12px;
          font-weight: 850;
          text-align: center;
          box-shadow: 0 18px 48px rgba(0, 0, 0, 0.45);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
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

        .btn:disabled,
        .btn2:disabled,
        .btn3:disabled {
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

        .btn:active,
        .btn2:active,
        .btn3:active {
          transform: scale(0.99);
          opacity: 0.92;
        }

        .bottom {
          margin-top: 14px;
        }

        .backBtn {
          width: 100%;
          padding: 14px 14px;
          border-radius: 18px;
          border: 1px solid rgba(233, 236, 255, 0.14);
          background: rgba(255, 255, 255, 0.03);
          color: rgba(233, 236, 255, 0.92);
          font-size: 14px;
          font-weight: 900;
          letter-spacing: 0.02em;
          cursor: pointer;
          -webkit-tap-highlight-color: transparent;
          box-shadow: 0 18px 48px rgba(0, 0, 0, 0.45);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
        }

        .backBtn:active {
          transform: scale(0.99);
          opacity: 0.92;
        }
      `}</style>
    </main>
  );
}
