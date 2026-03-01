/* path: app/birth-chart/report/page.tsx */
import { Suspense } from 'react';
import ReportClient from './ReportClient';

export const dynamic = 'force-dynamic';

export default function Page() {
  return (
    <Suspense fallback={null}>
      <ReportClient />
    </Suspense>
  );
}
