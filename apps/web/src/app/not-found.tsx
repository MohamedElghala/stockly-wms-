'use client';

import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex-center" style={{ minHeight: '70vh', flexDirection: 'column', gap: '1rem', textAlign: 'center' }}>
      <h2 style={{ fontSize: '3rem', fontWeight: 800, color: 'var(--accent-primary)' }}>404</h2>
      <p style={{ fontSize: '1.25rem', color: 'var(--text-secondary)' }}>الصفحة المطلوبة غير موجودة</p>
      <Link 
        href="/dashboard" 
        className="btn btn-primary"
        style={{ marginTop: '1rem', padding: '0.75rem 1.5rem', borderRadius: 'var(--radius-md)' }}
      >
        العودة للرئيسية
      </Link>
    </div>
  );
}
