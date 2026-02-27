/* path: components/DownBar.tsx */
'use client';

import HiromantBlock from './DownBarUtil/hiromant';

/**
 * Общий DownBar — блок в конце страницы + футер, который прижимается к низу экрана.
 *
 * ВАЖНО:
 * - Эта компонента должна быть ПОСЛЕДНЕЙ внутри flex-колонки страницы.
 * - DownBar делает: min-height: 100dvh; display:flex; flex-direction:column;
 *   и контенту даёт flex:1, а футер (OnlyDown) окажется внизу даже если контента мало.
 */
export default function DownBar() {
  return (
    <>
      <section className="downWrap">
        <div className="downContent">
          <HiromantBlock />
        </div>

        {/* ✅ всегда внизу */}
        <OnlyDown />
      </section>

      <style jsx>{`
        .downWrap {
          min-height: 100dvh;
          display: flex;
          flex-direction: column;
        }

        .downContent {
          flex: 1;
          margin-top: 16px;
          margin-bottom: 4px;

          display: flex;
          flex-direction: column;
          gap: 24px;
        }
      `}</style>
    </>
  );
}
