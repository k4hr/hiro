/* path: app/reports/page.tsx */
'use client';

import { useEffect, useMemo, useState } from 'react';
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

type Item = {
  id: string;
  type: 'PALM' | 'NUM' | 'ASTRO' | 'SYNTH';
  createdAt: string;
  updatedAt: string;

  numMode?: 'DATE' | 'COMBO' | 'COMPAT' | null;

  astroMode?: 'CHART' | 'COMPAT' | null;

  input?: any | null;
};

type Resp =
  | { ok: true; items: Item[] }
  | { ok: false; error: string; hint?: string };

function fmtDate(iso: string) {
  try {
    const d = new Date(iso);
    return d.toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch {
    return iso;
  }
}

function titleFor(it: Item) {
  if (it.type === 'PALM') return 'Хиромант';
  if (it.type === 'NUM') {
    if (it.numMode === 'COMPAT') return 'Код судьбы · Совместимость';
    if (it.numMode === 'COMBO') return 'Код судьбы · Дата + имя';
    return 'Код судьбы · Дата рождения';
  }
  if (it.type === 'ASTRO') {
    if (it.astroMode === 'COMPAT') return 'Астро-совместимость';
    return 'Карта неба';
  }
  return 'Отчёт';
}

function subFor(it: Item) {
  const created = fmtDate(it.createdAt);
  const dob = String(it?.input?.dob || it?.input?.a?.dob || '').trim();
  if (dob) return `${created} · ${dob}`;
  return created;
}

export default function ReportsPage() {
  const router = useRouter();

  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    try {
      tg()?.ready?.();
      tg()?.expand?.();
    } catch {}
  }, []);

  const fetchList = async () => {
    const initData = getInitDataNow();
    if (!initData) {
      setErr('NO_INIT_DATA');
      return;
    }

    setErr('');
    setLoading(true);

    try {
      const res = await fetch('/api/reports/list', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ initData }),
      });

      const j = (await res.json().catch(() => null)) as Resp | null;
      if (!res.ok || !j || (j as any).ok !== true) {
        setErr((j as any)?.error ? String((j as any).error) : `LIST_FAILED(${res.status})`);
        setLoading(false);
        return;
      }

      setItems(Array.isArray((j as any).items) ? ((j as any).items as Item[]) : []);
      setLoading(false);
    } catch (e: any) {
      setErr(e?.message ? String(e.message) : 'NETWORK');
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const empty = useMemo(() => !loading && !err && items.length === 0, [loading, err, items.length]);

  const go = (href: string) => {
    haptic('medium');
    router.push(href);
  };

  return (
    <main className="home">
      <header className="hero" aria-label="Заголовок">
        <div className="title">МОИ ОТЧЁТЫ</div>
        <div className="subtitle">сохранённые разборы</div>
      </header>

      {err ? (
        <section className="card" aria-label="Ошибка">
          <div className="label">Ошибка</div>
          <div className="warn">{err}</div>
          <div className="row">
            <button type="button" className="btn" onClick={fetchList} disabled={loading}>
              Обновить
            </button>
            <button type="button" className="btn2" onClick={() => go('/')}>
              Назад
            </button>
          </div>
        </section>
      ) : null}

      {loading ? (
        <section className="card" aria-label="Загрузка">
          <div className="label">Загрузка</div>
          <div className="hint">Собираем ваши отчёты…</div>
        </section>
      ) : null}

      {empty ? (
        <section className="card" aria-label="Пусто">
          <div className="label">Пока пусто</div>
          <div className="hint">Сделайте любой разбор — и он появится здесь.</div>
        </section>
      ) : null}

      {items.length ? (
        <section className="grid" aria-label="Список отчётов">
          {items.map((it) => (
            <button key={it.id} type="button" className="cardx" onClick={() => go(`/reports/${encodeURIComponent(it.id)}`)}>
              <div className="cardText">
                <div className="cardTitle">{titleFor(it)}</div>
                <div className="cardSub">{subFor(it)}</div>
              </div>
            </button>
          ))}
        </section>
      ) : null}

      <section className="bottom" aria-label="Назад">
        <button type="button" className="backBtn" onClick={() => go('/')}>
          Назад
        </button>
      </section>

      <style jsx>{`
        .home {
          min-height: 100dvh;
          padding: 0 0 calc(env(safe-area-inset-bottom, 0px) + 12px);
        }

        .hero {
          margin-top: 6px;
          margin-bottom: 14px;
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
          font-size: 26px;
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

        .grid {
          margin-top: 12px;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .cardx {
          width: 100%;
          border: 1px solid var(--card-border);
          padding: 16px 16px;
          border-radius: 20px;
          background: var(--card-bg);
          box-shadow: var(--shadow);
          backdrop-filter: blur(14px) saturate(140%);
          -webkit-backdrop-filter: blur(14px) saturate(140%);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          -webkit-tap-highlight-color: transparent;
          transition: transform 0.08s ease, opacity 0.08s ease, border-color 0.12s ease, background 0.12s ease;
          color: inherit;
          text-align: center;
          position: relative;
          overflow: hidden;
        }

        .cardx::before {
          content: '';
          position: absolute;
          inset: 0;
          pointer-events: none;
          border-radius: 20px;
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.08);
        }

        .cardx:hover {
          border-color: rgba(139, 92, 246, 0.4);
          background: rgba(255, 255, 255, 0.07);
        }

        .cardx:active {
          transform: scale(0.99);
          opacity: 0.92;
        }

        .cardText {
          width: 100%;
        }

        .cardTitle {
          font-size: 16px;
          font-weight: 900;
          color: var(--text);
          line-height: 1.1;
          letter-spacing: -0.01em;
        }

        .cardSub {
          margin-top: 5px;
          font-size: 12px;
          color: rgba(233, 236, 255, 0.62);
          line-height: 1.25;
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

        .row {
          display: flex;
          gap: 10px;
          margin-top: 4px;
        }

        .btn,
        .btn2 {
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
