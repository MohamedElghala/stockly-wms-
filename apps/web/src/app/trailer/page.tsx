'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import StocklyGeometricIntroCanvas from '@/components/trailer/StocklyGeometricIntroCanvas';
import StocklyMobiusCanvas from '@/components/trailer/StocklyMobiusCanvas';

export default function TrailerPage() {
  const [activeTab, setActiveTab] = useState<'kooply_intro' | 'canvas_engine' | 'disney_intro'>('kooply_intro');

  return (
    <div 
      style={{ 
        minHeight: '100vh', 
        background: '#070D18', 
        color: '#F8FAFC', 
        fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        padding: '24px 32px'
      }}
      dir="rtl"
    >
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ display: 'inline-block', width: '12px', height: '12px', borderRadius: '50%', background: '#00E599', boxShadow: '0 0 16px #00E599' }} />
            <h1 style={{ fontSize: '24px', fontWeight: 800, margin: 0, letterSpacing: '-0.5px' }}>
              منظومة الموشن جرافيك السينمائي والهندسي لـ Stockly WMS
            </h1>
          </div>
          <p style={{ margin: '6px 0 0', color: '#94A3B8', fontSize: '14px' }}>
            موشن جرافيك احترافي بنمط After Effects (تفكك المسارات الهندسية، انزلاق الكبسولات على شبكة البناء، تشكل الحروف، وبكرات السيور الناقلة)
          </p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <Link 
            href="/dashboard"
            style={{
              padding: '10px 18px',
              borderRadius: '8px',
              background: 'linear-gradient(135deg, #2563EB, #1D4ED8)',
              color: '#FFFFFF',
              textDecoration: 'none',
              fontSize: '14px',
              fontWeight: 600,
              boxShadow: '0 4px 14px rgba(37,99,235,0.35)'
            }}
          >
            ← العودة للوحة التحكم
          </Link>
        </div>
      </div>

      {/* Mode Switcher Tabs */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
        <button
          onClick={() => setActiveTab('kooply_intro')}
          style={{
            padding: '12px 24px',
            borderRadius: '10px',
            background: activeTab === 'kooply_intro' ? 'linear-gradient(135deg, #00E599, #059669)' : 'rgba(15,23,42,0.8)',
            color: activeTab === 'kooply_intro' ? '#070D18' : '#CBD5E1',
            border: activeTab === 'kooply_intro' ? '1px solid #00E599' : '1px solid rgba(255,255,255,0.1)',
            fontWeight: 800,
            fontSize: '14px',
            cursor: 'pointer',
            transition: 'all 0.2s',
            boxShadow: activeTab === 'kooply_intro' ? '0 0 24px rgba(0,229,153,0.4)' : 'none'
          }}
        >
          🌟 فيديو الإنترو الهندسي (After Effects / Kooply Style)
        </button>

        <button
          onClick={() => setActiveTab('canvas_engine')}
          style={{
            padding: '12px 24px',
            borderRadius: '10px',
            background: activeTab === 'canvas_engine' ? '#2563EB' : 'rgba(15,23,42,0.8)',
            color: activeTab === 'canvas_engine' ? '#FFFFFF' : '#CBD5E1',
            border: activeTab === 'canvas_engine' ? '1px solid #2563EB' : '1px solid rgba(255,255,255,0.1)',
            fontWeight: 800,
            fontSize: '14px',
            cursor: 'pointer',
            transition: 'all 0.2s',
            boxShadow: activeTab === 'canvas_engine' ? '0 0 20px rgba(37,99,235,0.35)' : 'none'
          }}
        >
          ⚡ محرك الكانفاس الحي 60 FPS (Interactive Kinetic Engine)
        </button>

        <button
          onClick={() => setActiveTab('disney_intro')}
          style={{
            padding: '12px 24px',
            borderRadius: '10px',
            background: activeTab === 'disney_intro' ? '#38BDF8' : 'rgba(15,23,42,0.8)',
            color: activeTab === 'disney_intro' ? '#070D18' : '#CBD5E1',
            border: activeTab === 'disney_intro' ? '1px solid #38BDF8' : '1px solid rgba(255,255,255,0.1)',
            fontWeight: 800,
            fontSize: '14px',
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}
        >
          🎬 إنترو الفضاء المفتوح (Disney Space Approach)
        </button>
      </div>

      {/* Main Display Area */}
      {activeTab === 'kooply_intro' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ background: '#0F172A', borderRadius: '16px', overflow: 'hidden', border: '1px solid rgba(0,229,255,0.3)', maxWidth: '1280px', margin: '0 auto', width: '100%', boxShadow: '0 25px 60px rgba(0,0,0,0.8)' }}>
            <div style={{ position: 'relative', width: '100%', aspectRatio: '16 / 9', background: '#030712' }}>
              <video
                src="/videos/stockly_kooply_cinematic_intro.mp4"
                controls
                autoPlay
                loop
                playsInline
                style={{ width: '100%', height: '100%', objectFit: 'contain' }}
              />
            </div>
            <div style={{ padding: '20px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(15,23,42,0.95)', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
              <div>
                <h3 style={{ margin: '0 0 6px', fontSize: '18px', color: '#FFFFFF', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ color: '#00E5FF' }}>●</span> الإنترو الهندسي المتكامل: stockly_kooply_cinematic_intro.mp4
                </h3>
                <p style={{ margin: 0, color: '#94A3B8', fontSize: '14px' }}>
                  مبني طبق الأصل لتكنيك مشروع After Effects (تفكك المسارات، شبكة البناء بالأبعاد والزوايا، تدفق بكرات السيور، والتحول الشكلي للحروف).
                </p>
              </div>
              <a
                href="/videos/stockly_kooply_cinematic_intro.mp4"
                download="stockly_kooply_cinematic_intro.mp4"
                style={{
                  padding: '12px 24px',
                  borderRadius: '10px',
                  background: '#00E599',
                  color: '#070D18',
                  fontWeight: 800,
                  textDecoration: 'none',
                  fontSize: '14px',
                  boxShadow: '0 4px 16px rgba(0,229,153,0.35)'
                }}
              >
                ⬇ تحميل الفيديو (1080p MP4)
              </a>
            </div>
          </div>

          {/* Storyboard Engineering Breakdown */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', maxWidth: '1280px', margin: '0 auto', width: '100%' }}>
            <div style={{ background: '#0F172A', padding: '16px 20px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)' }}>
              <span style={{ fontSize: '11px', color: '#38BDF8', fontWeight: 800 }}>01. شبكة البناء (Kinetic Grid)</span>
              <h4 style={{ margin: '6px 0 4px', fontSize: '15px', color: '#FFFFFF' }}>محاور وقياسات دقيقة</h4>
              <p style={{ margin: 0, fontSize: '12px', color: '#94A3B8', lineHeight: 1.5 }}>
                خطوط الأساس (Baseline و Cap-Height) ومؤشرات الأبعاد (R=9, 45°) تتفرع ديناميكياً.
              </p>
            </div>

            <div style={{ background: '#0F172A', padding: '16px 20px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)' }}>
              <span style={{ fontSize: '11px', color: '#00E599', fontWeight: 800 }}>02. تفكك المسارات (Deconstruction)</span>
              <h4 style={{ margin: '6px 0 4px', fontSize: '15px', color: '#FFFFFF' }}>انزلاق الكبسولات الملونة</h4>
              <p style={{ margin: 0, fontSize: '12px', color: '#94A3B8', lineHeight: 1.5 }}>
                مسارات السيور تنطلق من الشعار المركزي وتنزلق بفيزياء Penner Overshoot لمواقع الحروف.
              </p>
            </div>

            <div style={{ background: '#0F172A', padding: '16px 20px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)' }}>
              <span style={{ fontSize: '11px', color: '#F59E0B', fontWeight: 800 }}>03. تشكل الحروف (Shape Morphing)</span>
              <h4 style={{ margin: '6px 0 4px', fontSize: '15px', color: '#FFFFFF' }}>تراص الحروف والسيور</h4>
              <p style={{ margin: 0, fontSize: '12px', color: '#94A3B8', lineHeight: 1.5 }}>
                حروف STOCKLY WMS تتشكل من أجزاء السير مع دوران فيزيائي حي لبكرات التوريد الداخلية.
              </p>
            </div>

            <div style={{ background: '#0F172A', padding: '16px 20px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)' }}>
              <span style={{ fontSize: '11px', color: '#A855F7', fontWeight: 800 }}>04. الاستقرار النهائي (Hero Lockup)</span>
              <h4 style={{ margin: '6px 0 4px', fontSize: '15px', color: '#FFFFFF' }}>شعار الموبيوس الأصلي</h4>
              <p style={{ margin: 0, fontSize: '12px', color: '#94A3B8', lineHeight: 1.5 }}>
                مجسم الموبيوس ثلاثي الأبعاد يستقر في القمة مع مسح ضوئي ليزري أفقي براق.
              </p>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'canvas_engine' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <StocklyGeometricIntroCanvas width={1280} height={720} autoPlay={true} />
        </div>
      )}

      {activeTab === 'disney_intro' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ background: '#0F172A', borderRadius: '16px', overflow: 'hidden', border: '1px solid rgba(0,229,153,0.3)', maxWidth: '1280px', margin: '0 auto', width: '100%', boxShadow: '0 25px 60px rgba(0,0,0,0.8)' }}>
            <div style={{ position: 'relative', width: '100%', aspectRatio: '16 / 9', background: '#030712' }}>
              <video
                src="/videos/stockly_disney_cinematic_intro.mp4"
                controls
                autoPlay
                loop
                playsInline
                style={{ width: '100%', height: '100%', objectFit: 'contain' }}
              />
            </div>
            <div style={{ padding: '20px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ margin: '0 0 6px', fontSize: '18px', color: '#FFFFFF' }}>
                  فيديو ديزني/مارفل: stockly_disney_cinematic_intro.mp4
                </h3>
                <p style={{ margin: 0, color: '#94A3B8', fontSize: '14px' }}>
                  الاقتراب من الفضاء العميق وقذف الأحرف بالمسارات المقوسة.
                </p>
              </div>
              <a
                href="/videos/stockly_disney_cinematic_intro.mp4"
                download="stockly_disney_cinematic_intro.mp4"
                style={{
                  padding: '10px 20px',
                  borderRadius: '8px',
                  background: '#38BDF8',
                  color: '#070D18',
                  fontWeight: 800,
                  textDecoration: 'none',
                  fontSize: '14px'
                }}
              >
                ⬇ تحميل
              </a>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
