/* path: components/DownBar.tsx */
'use client';

import HiromantBlock from './DownBarUtil/hiromant';
import KodSudbyBlock from './DownBarUtil/kod-sudby';

/**
 * Общий DownBar — блок в конце страницы.
 */
export default function DownBar() {
  return (
    <>
      <section className="downWrap">
        <div className="downContent">
          <HiromantBlock />
          <KodSudbyBlock />
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
