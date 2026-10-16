'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import BrandLoader from '@/components/common/BrandLoader';

export default function RootPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/dashboard');
  }, [router]);

  return <BrandLoader fullScreen text="Stockly WMS • جاري التوجيه إلى لوحة التحكم..." size="lg" />;
}
