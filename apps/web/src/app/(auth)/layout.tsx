'use client';

import React from 'react';
import { ThemeProvider } from '@/components/theme-provider';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="auth-layout-wrapper" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-primary)', position: 'relative', overflowX: 'hidden', overflowY: 'auto', WebkitOverflowScrolling: 'touch', padding: '1rem 0' }}>
      
      {/* Background Decorators */}
      <div style={{ position: 'absolute', top: '-10%', left: '-10%', width: '40vw', height: '40vw', background: 'var(--accent-primary)', opacity: 0.05, borderRadius: '50%', filter: 'blur(100px)', zIndex: 0, pointerEvents: 'none' }}></div>
      <div style={{ position: 'absolute', bottom: '-10%', right: '-10%', width: '40vw', height: '40vw', background: 'var(--accent-success)', opacity: 0.05, borderRadius: '50%', filter: 'blur(100px)', zIndex: 0, pointerEvents: 'none' }}></div>

      {/* Auth Container */}
      <div className="auth-container-box" style={{ zIndex: 1, width: '100%', maxWidth: '1200px', padding: '1rem' }}>
        {children}
      </div>
      
    </div>
  );
}
