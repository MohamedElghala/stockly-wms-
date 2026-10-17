'use client';

import React, { Suspense } from 'react';
import StocklyCinematicTrailer from '@/components/trailer/StocklyCinematicTrailer';
import { useSearchParams, useRouter } from 'next/navigation';

function TrailerContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const autoPlayParam = searchParams.get('autoplay');
  const autoPlay = autoPlayParam !== 'false';

  return (
    <div style={{ width: '100vw', height: '100vh', overflow: 'hidden', background: '#070D18' }}>
      <StocklyCinematicTrailer 
        fullScreen={true}
        autoPlay={autoPlay}
        onComplete={() => router.push('/dashboard')}
      />
    </div>
  );
}

export default function TrailerPage() {
  return (
    <Suspense fallback={<div style={{ background: '#070D18', width: '100vw', height: '100vh' }} />}>
      <TrailerContent />
    </Suspense>
  );
}
