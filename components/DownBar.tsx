/* path: components/DownBar.tsx */
'use client';

import HiromantBlock from './DownBarUtil/hiromant';
import KodSudbyBlock from './DownBarUtil/kod-sudby';
import KartaNebaBlock from './DownBarUtil/karta-neba';

export default function DownBar() {
  return (
    <>
      <section className="downWrap">
        <div className="downContent">
          <HiromantBlock />
          <KodSudbyBlock />
          <KartaNebaBlock />
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
