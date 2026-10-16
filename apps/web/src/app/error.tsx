'use client';

import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex-center" style={{ minHeight: '70vh', flexDirection: 'column', gap: '1rem', textAlign: 'center' }}>
      <h2 style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--accent-danger)' }}>حدث خطأ غير متوقع</h2>
      <p style={{ color: 'var(--text-secondary)' }}>{error.message || 'يرجى المحاولة مرة أخرى'}</p>
      <button
        onClick={() => reset()}
        className="btn btn-primary"
        style={{ marginTop: '1rem', padding: '0.75rem 1.5rem', borderRadius: 'var(--radius-md)' }}
      >
        إعادة المحاولة
      </button>
    </div>
  );
}
