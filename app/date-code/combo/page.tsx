/* path: app/date-code/combo/page.tsx */
import { Suspense } from 'react';
import ComboPageClient from './ComboPageClient';

export const dynamic = 'force-dynamic';

export default function Page() {
  return (
    <Suspense fallback={null}>
      <ComboPageClient />
    </Suspense>
  );
}
