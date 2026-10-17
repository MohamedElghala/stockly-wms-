'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import StocklyGeometricIntroCanvas from '@/components/trailer/StocklyGeometricIntroCanvas';
import StocklyMobiusCanvas from '@/components/trailer/StocklyMobiusCanvas';

export default function TrailerPage() {
  const [activeTab, setActiveTab] = useState<'blender_3d' | 'kooply_intro' | 'canvas_engine' | 'disney_intro'>('blender_3d');

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
              منظومة الموشن جرافيك والريندر السينمائي ثلاثي الأبعاد لـ Stockly WMS
            </h1>
          </div>
          <p style={{ margin: '6px 0 0', color: '#94A3B8', fontSize: '14px' }}>
            ريندر ثلاثي الأبعاد حقيقي بمحرك Blender 4.2 LTS EEVEE Next (إضاءة استوديو سينمائية، مجسم الموبيوس الأزرق، تايبوجرافي كروم وتيتانيوم، ومسح ليزري براق)
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
      <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
        <button
          onClick={() => setActiveTab('blender_3d')}
          style={{
            padding: '12px 24px',
            borderRadius: '10px',
            background: activeTab === 'blender_3d' ? 'linear-gradient(135deg, #38BDF8, #2563EB)' : 'rgba(15,23,42,0.8)',
            color: activeTab === 'blender_3d' ? '#FFFFFF' : '#CBD5E1',
            border: activeTab === 'blender_3d' ? '1px solid #38BDF8' : '1px solid rgba(255,255,255,0.1)',
            fontWeight: 800,
            fontSize: '14px',
            cursor: 'pointer',
            transition: 'all 0.2s',
            boxShadow: activeTab === 'blender_3d' ? '0 0 24px rgba(56,189,248,0.45)' : 'none'
          }}
        >
          💎 إنترو ثلاثي الأبعاد حقيقي (Blender 4.2 Cinema 3D)
        </button>

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
          📐 الإنترو الهندسي المتفكك (After Effects Style)
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
          ⚡ محرك الكانفاس الحي 60 FPS
        </button>

        <button
          onClick={() => setActiveTab('disney_intro')}
          style={{
            padding: '12px 24px',
            borderRadius: '10px',
            background: activeTab === 'disney_intro' ? '#6366F1' : 'rgba(15,23,42,0.8)',
            color: activeTab === 'disney_intro' ? '#FFFFFF' : '#CBD5E1',
            border: activeTab === 'disney_intro' ? '1px solid #6366F1' : '1px solid rgba(255,255,255,0.1)',
            fontWeight: 800,
            fontSize: '14px',
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}
        >
          🎬 إنترو الفضاء المفتوح
        </button>
      </div>

      {/* Main Display Area */}
      {activeTab === 'blender_3d' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ background: '#0F172A', borderRadius: '16px', overflow: 'hidden', border: '1px solid rgba(56,189,248,0.4)', maxWidth: '1280px', margin: '0 auto', width: '100%', boxShadow: '0 25px 60px rgba(0,0,0,0.8)' }}>
            <div style={{ position: 'relative', width: '100%', aspectRatio: '16 / 9', background: '#030712' }}>
              <video
                src="/videos/stockly_blender_cinematic_intro.mp4"
                controls
                autoPlay
                loop
                playsInline
                style={{ width: '100%', height: '100%', objectFit: 'contain' }}
              />
            </div>
            <div style={{ padding: '20px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(15,23,42,0.95)', borderTop: '1px solid rgba(255,255,255,0.08)', flexWrap: 'wrap', gap: '16px' }}>
              <div>
                <h3 style={{ margin: '0 0 6px', fontSize: '18px', color: '#FFFFFF', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ color: '#38BDF8' }}>●</span> فيديو الريندر السينمائي ثلاثي الأبعاد: stockly_blender_cinematic_intro.mp4
                </h3>
                <p style={{ margin: 0, color: '#94A3B8', fontSize: '14px' }}>
                  تم تصميمه ورندره بمحرك Blender 4.2 LTS (EEVEE Next PBR) مع إضاءة استوديو سينمائية، أرضية أوبسيديان عاكسة، خامات كروم وتيتانيوم، ومؤثرات صوتية هوليوودية متزامنة.
                </p>
              </div>
              <a
                href="/videos/stockly_blender_cinematic_intro.mp4"
                download="stockly_blender_cinematic_intro.mp4"
                style={{
                  padding: '12px 24px',
                  borderRadius: '10px',
                  background: 'linear-gradient(135deg, #38BDF8, #2563EB)',
                  color: '#FFFFFF',
                  fontWeight: 800,
                  textDecoration: 'none',
                  fontSize: '14px',
                  boxShadow: '0 4px 16px rgba(56,189,248,0.35)'
                }}
              >
                ⬇ تحميل الفيديو بدقة 1080p Full HD
              </a>
            </div>
          </div>

          {/* Storyboard 3D Breakdown */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', maxWidth: '1280px', margin: '0 auto', width: '100%' }}>
            <div style={{ background: '#0F172A', padding: '16px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)' }}>
              <img src="/videos/blender_frame_1_emblem_spin.jpg" alt="Phase 1" style={{ width: '100%', borderRadius: '8px', marginBottom: '12px', aspectRatio: '16/9', objectFit: 'cover' }} />
              <span style={{ fontSize: '11px', color: '#38BDF8', fontWeight: 800 }}>01. دوران واقتراب الموبيوس (Orbit Reveal)</span>
              <h4 style={{ margin: '6px 0 4px', fontSize: '14px', color: '#FFFFFF' }}>هبوط الشعار الأزرق المختار</h4>
              <p style={{ margin: 0, fontSize: '12px', color: '#94A3B8', lineHeight: 1.5 }}>
                شعار الموبيوس الأصلي بالسيور المتحركة يدور في فضاء الاستوديو ويهبط فوق الأرضية العاكسة.
              </p>
            </div>

            <div style={{ background: '#0F172A', padding: '16px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)' }}>
              <img src="/videos/blender_frame_2_letters_rise.jpg" alt="Phase 2" style={{ width: '100%', borderRadius: '8px', marginBottom: '12px', aspectRatio: '16/9', objectFit: 'cover' }} />
              <span style={{ fontSize: '11px', color: '#00E599', fontWeight: 800 }}>02. بزوغ الحروف المجسمة 3D (Extrusion)</span>
              <h4 style={{ margin: '6px 0 4px', fontSize: '14px', color: '#FFFFFF' }}>حروف STOCKLY WMS بالحواف المصقولة</h4>
              <p style={{ margin: 0, fontSize: '12px', color: '#94A3B8', lineHeight: 1.5 }}>
                حروف ثلاثية الأبعاد حقيقية بارتفاع وحواف Bevel مشطوفة تلمع تحت إضاءة الاستوديو.
              </p>
            </div>

            <div style={{ background: '#0F172A', padding: '16px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)' }}>
              <img src="/videos/blender_frame_3_laser_sweep.jpg" alt="Phase 3" style={{ width: '100%', borderRadius: '8px', marginBottom: '12px', aspectRatio: '16/9', objectFit: 'cover' }} />
              <span style={{ fontSize: '11px', color: '#F59E0B', fontWeight: 800 }}>03. المسح الليزري البراق (Specular Sweep)</span>
              <h4 style={{ margin: '6px 0 4px', fontSize: '14px', color: '#FFFFFF' }}>شعاع ليزري أفقي يعبر الحواف</h4>
              <p style={{ margin: 0, fontSize: '12px', color: '#94A3B8', lineHeight: 1.5 }}>
                شعاع ضوئي سينمائي يمسح واجهة الكروم ويولد انعكاسات نصلية حادة على الحواف المشطوفة.
              </p>
            </div>

            <div style={{ background: '#0F172A', padding: '16px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)' }}>
              <img src="/videos/blender_frame_4_master_lockup.jpg" alt="Phase 4" style={{ width: '100%', borderRadius: '8px', marginBottom: '12px', aspectRatio: '16/9', objectFit: 'cover' }} />
              <span style={{ fontSize: '11px', color: '#A855F7', fontWeight: 800 }}>04. الهوية المؤسسية الكاملة (Master Lockup)</span>
              <h4 style={{ margin: '6px 0 4px', fontSize: '14px', color: '#FFFFFF' }}>شعار Stockly WMS مع الشعار الفرعي</h4>
              <p style={{ margin: 0, fontSize: '12px', color: '#94A3B8', lineHeight: 1.5 }}>
                استقرار التكوين النهائي مع ظهور INTELLIGENT WAREHOUSE OPERATING SYSTEM وانعكاسات الأرضية.
              </p>
            </div>
          </div>
        </div>
      )}
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
