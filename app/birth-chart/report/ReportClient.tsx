/* path: app/birth-chart/report/ReportClient.tsx */
'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

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

function storageKeyAstro(dob: string, place: string, time: string) {
  return `birth_chart_${dob}_${place}_${time}`.slice(0, 140);
}

type AstroSelected = {
  ASTRO_PERSON?: boolean;
  ASTRO_LOVE?: boolean;
  ASTRO_MONEY?: boolean;
  ASTRO_CAREER?: boolean;
  ASTRO_TIMING?: boolean;
  ASTRO_FORMULA?: boolean;
};

type Payload = {
  mode: 'ASTRO';
  dob: string;
  age?: number | null;
  birthPlace?: string;
  birthTime?: string;
  accuracyLevel?: number;
  selected?: AstroSelected;
  totalRub?: number;
  createdAt?: string;
};

type ApiOk = {
  ok: true;
  text: string;
  cached?: boolean;
};

type ApiBad = {
  ok: false;
  error: string;
};

export default function ReportClient() {
  const sp = useSearchParams();
  const router = useRouter();

  const dob = String(sp.get('dob') || '').trim();
  const place = String(sp.get('place') || '').trim();
  const time = String(sp.get('time') || '').trim();

  const sk = useMemo(() => storageKeyAstro(dob, place, time), [dob, place, time]);

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [text, setText] = useState('');
  const [title] = useState('Карта неба');

  useEffect(() => {
    try {
      tg()?.ready?.();
      tg()?.expand?.();
    } catch {}
  }, []);

  useEffect(() => {
    let payload: Payload | null = null;

    try {
      const raw = sessionStorage.getItem(sk);
      if (raw) payload = JSON.parse(raw);
    } catch {}

    const run = async () => {
      try {
        setLoading(true);
        setErr('');

        const initData = getInitDataNow();

        const res = await fetch('/api/astro/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            initData,
            dob: payload?.dob || dob,
            age: payload?.age ?? null,
            birthPlace: payload?.birthPlace || place,
            birthTime: payload?.birthTime || time,
            accuracyLevel: payload?.accuracyLevel ?? null,
            selected: payload?.selected || null,
          }),
        });

        const data = (await res.json()) as ApiOk | ApiBad;

        if (!data || (data as ApiBad).ok === false) {
          throw new Error((data as ApiBad)?.error || 'Ошибка генерации отчёта');
        }

        setText((data as ApiOk).text);
      } catch (e: any) {
        setErr(String(e?.message || 'Ошибка'));
      } finally {
        setLoading(false);
      }
    };

    if (dob) run();
    else {
      setErr('Нет даты рождения в ссылке.');
      setLoading(false);
    }
  }, [dob, place, time, sk]);

  const back = () => {
    haptic('light');
    router.push('/birth-chart');
  };

  return (
    <main className="p">
      <header className="hero">
        <div className="t">{title}</div>
        <div className="s">
          {dob ? `Дата: ${dob}` : ''}
          {place ? ` · ${place}` : ''}
          {time ? ` · ${time}` : ''}
        </div>
      </header>

      <section className="card">
        {loading ? <div className="muted">Формирую карту…</div> : null}
        {!loading && err ? <div className="err">{err}</div> : null}
        {!loading && !err ? <div className="txt">{text}</div> : null}

        <button type="button" className="back" onClick={back}>
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
          padding: 16px 14px 14px;
          border-radius: 22px;
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(233, 236, 255, 0.12);
          box-shadow: var(--shadow);
          backdrop-filter: blur(16px) saturate(140%);
          -webkit-backdrop-filter: blur(16px) saturate(140%);
          text-align: center;
        }

        .t {
          font-weight: 950;
          font-size: 18px;
          color: rgba(233, 236, 255, 0.94);
          letter-spacing: -0.01em;
        }

        .s {
          margin-top: 6px;
          font-size: 12px;
          font-weight: 800;
          color: rgba(233, 236, 255, 0.62);
          overflow-wrap: anywhere;
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
          gap: 12px;
          overflow: hidden;
        }

        .muted {
          font-size: 13px;
          font-weight: 800;
          color: rgba(233, 236, 255, 0.62);
          text-align: center;
          padding: 10px 0;
        }

        .err {
          font-size: 13px;
          font-weight: 900;
          color: rgba(255, 180, 180, 0.95);
          text-align: center;
          padding: 10px 0;
        }

        .txt {
          white-space: pre-wrap;
          line-height: 1.45;
          font-size: 14px;
          font-weight: 800;
          color: rgba(233, 236, 255, 0.9);
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
      `}</style>
    </main>
  );
}
