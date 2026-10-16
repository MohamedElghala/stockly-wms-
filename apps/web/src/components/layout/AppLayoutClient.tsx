'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import Topbar from '@/components/layout/Topbar';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import BrandLoader from '@/components/common/BrandLoader';
import SecurityGuard from '@/components/common/SecurityGuard';
import StocklyIntroSplash from '@/components/common/StocklyIntroSplash';

function AppLayoutInner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { loading } = useAuth();
  const isAuthPage = pathname?.startsWith('/login') || pathname?.startsWith('/register');

  if (loading) {
    return <BrandLoader fullScreen text="Stockly WMS • جاري تأمين الاتصال بالمخازن..." size="lg" />;
  }

  if (isAuthPage) {
    return (
      <main style={{ width: '100%', minHeight: '100vh' }}>
        <SecurityGuard />
        {children}
      </main>
    );
  }

  return (
    <div className="app-container topbar-layout">
      <SecurityGuard />
      <Topbar />
      <main className="main-content">
        {children}
      </main>
    </div>
  );
}

export default function AppLayoutClient({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <StocklyIntroSplash />
      <AppLayoutInner>
        {children}
      </AppLayoutInner>
    </AuthProvider>
  );
}
