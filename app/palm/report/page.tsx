/* path: app/palm/report/page.tsx */
import { Suspense } from 'react';
import ReportClient from './ReportClient';

export default function PalmReportPage() {
  return (
    <Suspense fallback={<div style={{ padding: 16, fontWeight: 800, color: 'rgba(233,236,255,.75)' }}>Загрузка…</div>}>
      <ReportClient />
    </Suspense>
  );
}
