/* path: app/loading.tsx */
'use client';

import { useEffect, useState } from 'react';
import FullScreenLoader from '@/components/Loading/FullScreenLoader';

function pick() {
  if (typeof window === 'undefined') {
    return {
      mobile: '/splash/doctor-9x16.jpg',
      desktop: '/splash/doctor-16x9.jpg',
    };
  }
  return window.innerWidth >= 900
    ? { mobile: '/splash/doctor-9x16.jpg', desktop: '/splash/doctor-16x9.jpg' }
    : { mobile: '/splash/doctor-9x16.jpg', desktop: '/splash/doctor-16x9.jpg' };
}

export default function Loading() {
  const [bg, setBg] = useState(() => pick());

  useEffect(() => {
    const onResize = () => setBg(pick());
    onResize();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  return (
    <FullScreenLoader
      bgMobileUrl={bg.mobile}
      bgDesktopUrl={bg.desktop}
      spinnerSize={70}
      spinnerXPercent={50}
      spinnerYPercent={72}
    />
  );
}
