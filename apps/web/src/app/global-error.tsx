'use client';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="ar" dir="rtl">
      <body>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', gap: '1rem', background: '#0a0d14', color: '#fff', fontFamily: 'sans-serif' }}>
          <h2>حدث خطأ في النظام</h2>
          <button
            onClick={() => reset()}
            style={{ padding: '0.75rem 1.5rem', background: '#10b981', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}
          >
            إعادة المحاولة
          </button>
        </div>
      </body>
    </html>
  );
}
