/* path: components/DownBar.tsx */
'use client';

import HiromantBlock from './DownBarUtil/hiromant';

/**
 * Общий DownBar — блок в конце страницы.
 * Без OnlyDown (файла нет — и не нужен).
 */
export default function DownBar() {
  return (
    <>
      <section className="downWrap">
        <div className="downContent">
          <HiromantBlock />
        </div>
      </section>

      <style jsx>{`
        .downWrap {
          margin-top: 16px;
        }

        .downContent {
          display: flex;
          flex-direction: column;
          gap: 24px;
        }
      `}</style>
    </>
  );
}
