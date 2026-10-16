'use client';

import React from 'react';
import BrandLogo from '@/components/common/BrandLogo';

export default function PreviewLoadersPage() {
  return (
    <div style={{ minHeight: '100vh', background: '#0b132b', color: '#f8fafc', padding: '2rem' }} dir="rtl">
      <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
        
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <span style={{ 
            display: 'inline-flex', 
            alignItems: 'center', 
            gap: '8px', 
            padding: '4px 14px', 
            borderRadius: '9999px', 
            background: 'rgba(16, 185, 129, 0.15)', 
            border: '1px solid rgba(16, 185, 129, 0.35)', 
            color: '#34d399', 
            fontSize: '0.85rem', 
            fontWeight: 700, 
            marginBottom: '0.75rem' 
          }}>
            ⚡ Stockly WMS • عينات أنيميشن اللوجو وشاشات التحميل
          </span>
          <h1 style={{ fontSize: '2rem', fontWeight: 900, color: '#ffffff', margin: '0.5rem 0' }}>
            اختر أنيميشن التحميل والمسح المفضل لديك
          </h1>
          <p style={{ color: '#94a3b8', fontSize: '0.95rem', margin: 0 }}>
            عاين الـ 3 نماذج الحية أدناه لتحديد الأنيميشن المعتمد لشاشات التحميل والتنقل
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.75rem' }}>
          
          {/* Sample 1: Radar Scan */}
          <div style={{ background: '#0f172a', border: '2px solid rgba(16, 185, 129, 0.4)', borderRadius: '16px', padding: '1.5rem', textAlign: 'center', position: 'relative' }}>
            <div style={{ position: 'absolute', top: '12px', right: '12px', background: 'rgba(16, 185, 129, 0.2)', color: '#6ee7b7', padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 700 }}>
              النموذج 1
            </div>
            <h3 style={{ color: '#34d399', fontSize: '1.2rem', fontWeight: 800, margin: '0 0 4px 0' }}>المسح الراداري الذكي</h3>
            <p style={{ color: '#94a3b8', fontSize: '0.8rem', margin: '0 0 1.25rem 0' }}>شعاع مسح ليزري دوار يضيء الأقواس بدقة رادار الفحص</p>
            
            <div style={{ background: '#020617', border: '1px solid #1e293b', borderRadius: '12px', padding: '2.5rem 1rem', display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative', overflow: 'hidden' }}>
              <div style={{
                position: 'absolute',
                inset: '-20px',
                borderRadius: '50%',
                background: 'conic-gradient(from 0deg, rgba(0, 229, 153, 0) 0deg, rgba(0, 229, 153, 0.4) 60deg, rgba(255, 255, 255, 0.7) 65deg, rgba(0, 229, 153, 0) 66deg)',
                animation: 'radarSpin 2s infinite linear',
                pointerEvents: 'none',
                maskImage: 'radial-gradient(circle, rgba(0,0,0,1) 40%, rgba(0,0,0,0) 70%)',
                WebkitMaskImage: 'radial-gradient(circle, rgba(0,0,0,1) 40%, rgba(0,0,0,0) 70%)'
              }} />
              <div style={{ position: 'relative', zIndex: 10 }}>
                <BrandLogo size="md" showSubtitle={true} />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '1.5rem', color: '#34d399', fontSize: '0.85rem', fontWeight: 600 }}>
                <span>جاري مسح ومزامنة المخازن...</span>
              </div>
            </div>
          </div>

          {/* Sample 2: Wave Pulse */}
          <div style={{ background: '#0f172a', border: '2px solid rgba(16, 185, 129, 0.4)', borderRadius: '16px', padding: '1.5rem', textAlign: 'center', position: 'relative' }}>
            <div style={{ position: 'absolute', top: '12px', right: '12px', background: 'rgba(16, 185, 129, 0.2)', color: '#6ee7b7', padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 700 }}>
              النموذج 2
            </div>
            <h3 style={{ color: '#34d399', fontSize: '1.2rem', fontWeight: 800, margin: '0 0 4px 0' }}>النبض التتابعي واللمعان</h3>
            <p style={{ color: '#94a3b8', fontSize: '0.8rem', margin: '0 0 1.25rem 0' }}>نبضات متتابعة للأقواس من الداخل للخارج مع شريط لمعان نيون</p>
            
            <div style={{ background: '#020617', border: '1px solid #1e293b', borderRadius: '12px', padding: '2.5rem 1rem', display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'relative', zIndex: 10, animation: 'laserGlow 2s infinite ease-in-out' }}>
                <BrandLogo size="md" showSubtitle={true} />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '1.5rem', color: '#34d399', fontSize: '0.85rem', fontWeight: 600 }}>
                <span>جاري تحميل بيانات المنظومة...</span>
              </div>
            </div>
          </div>

          {/* Sample 3: Morphing Stroke Trace */}
          <div style={{ background: '#0f172a', border: '2px solid rgba(16, 185, 129, 0.4)', borderRadius: '16px', padding: '1.5rem', textAlign: 'center', position: 'relative' }}>
            <div style={{ position: 'absolute', top: '12px', right: '12px', background: 'rgba(16, 185, 129, 0.2)', color: '#6ee7b7', padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 700 }}>
              النموذج 3
            </div>
            <h3 style={{ color: '#34d399', fontSize: '1.2rem', fontWeight: 800, margin: '0 0 4px 0' }}>الرسم الحي المستمر</h3>
            <p style={{ color: '#94a3b8', fontSize: '0.8rem', margin: '0 0 1.25rem 0' }}>ألياف ضوئية تلتف وترسم الأقواس بسلاسة مستمرة مع توهج نيون</p>
            
            <div style={{ background: '#020617', border: '1px solid #1e293b', borderRadius: '12px', padding: '2.5rem 1rem', display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'relative', zIndex: 10 }} dir="ltr">
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '48px', height: '48px', position: 'relative' }}>
                    <svg viewBox="0 0 100 100" style={{ width: '100%', height: '100%' }}>
                      <path d="M 50 10 A 40 40 0 1 0 90 50" fill="none" stroke="#0B7B5B" strokeWidth="10" strokeLinecap="round" className="arc-trace-1" />
                      <path d="M 50 24 A 26 26 0 1 0 76 50" fill="none" stroke="#00BF88" strokeWidth="10" strokeLinecap="round" className="arc-trace-2" />
                      <path d="M 50 38 A 12 12 0 1 0 62 50" fill="none" stroke="#3DE1A0" strokeWidth="10" strokeLinecap="round" className="arc-trace-3" />
                    </svg>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', lineHeight: 1 }}>
                    <span style={{ fontSize: '10px', fontWeight: 800, color: '#00BF88', letterSpacing: '1.8px', textTransform: 'uppercase', marginBottom: '2px' }}>THE</span>
                    <span style={{ fontSize: '28px', fontWeight: 900, color: 'var(--accent-primary)', letterSpacing: '1.2px', textShadow: '0 0 12px rgba(0, 229, 153, 0.45)' }}>CALM WMS</span>
                  </div>
                </div>
                <div style={{ width: '100%', textAlign: 'center', fontSize: '8px', fontWeight: 700, color: '#64748B', letterSpacing: '2px', marginTop: '5px' }}>
                  INTELLIGENT WAREHOUSE MANAGEMENT SYSTEM
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '1.5rem', color: '#34d399', fontSize: '0.85rem', fontWeight: 600 }}>
                <span>Stockly WMS • جاري الاتصال...</span>
              </div>
            </div>
          </div>

        </div>

      </div>

      <style jsx global>{`
        @keyframes radarSpin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes laserGlow {
          0%, 100% { filter: drop-shadow(0 0 8px rgba(0, 229, 153, 0.3)); opacity: 0.85; }
          50% { filter: drop-shadow(0 0 25px rgba(0, 229, 153, 0.85)); opacity: 1; }
        }
        @keyframes traceArc1 {
          0% { stroke-dashoffset: 200; }
          50% { stroke-dashoffset: 0; }
          100% { stroke-dashoffset: -200; }
        }
        @keyframes traceArc2 {
          0% { stroke-dashoffset: 160; }
          50% { stroke-dashoffset: 0; }
          100% { stroke-dashoffset: -160; }
        }
        @keyframes traceArc3 {
          0% { stroke-dashoffset: 100; }
          50% { stroke-dashoffset: 0; }
          100% { stroke-dashoffset: -100; }
        }
        .arc-trace-1 {
          stroke-dasharray: 60 140;
          animation: traceArc1 2.2s infinite ease-in-out;
        }
        .arc-trace-2 {
          stroke-dasharray: 45 100;
          animation: traceArc2 2.2s infinite ease-in-out;
        }
        .arc-trace-3 {
          stroke-dasharray: 25 60;
          animation: traceArc3 2.2s infinite ease-in-out;
        }
      `}</style>
    </div>
  );
}
