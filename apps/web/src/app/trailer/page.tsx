'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import StocklyMobiusCanvas from '@/components/trailer/StocklyMobiusCanvas';

export default function TrailerPage() {
  const [activeTab, setActiveTab] = useState<'canvas_engine' | 'mp4_video'>('canvas_engine');

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
              منظومة الموشن جرافيك السينمائي الحقيقي لـ Stockly WMS
            </h1>
          </div>
          <p style={{ margin: '6px 0 0', color: '#94A3B8', fontSize: '14px' }}>
            دوران ثلاثي الأبعاد حقيقي للوغو، دوران فيزيائي لبكرات السيور، تدفق حزم البيانات، ومسح ليزري متزامن مع الصوت
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
          onClick={() => setActiveTab('canvas_engine')}
          style={{
            padding: '10px 22px',
            borderRadius: '10px',
            background: activeTab === 'canvas_engine' ? '#00E599' : 'rgba(15,23,42,0.8)',
            color: activeTab === 'canvas_engine' ? '#070D18' : '#CBD5E1',
            border: activeTab === 'canvas_engine' ? '1px solid #00E599' : '1px solid rgba(255,255,255,0.1)',
            fontWeight: 800,
            fontSize: '14px',
            cursor: 'pointer',
            transition: 'all 0.2s',
            boxShadow: activeTab === 'canvas_engine' ? '0 0 20px rgba(0,229,153,0.35)' : 'none'
          }}
        >
          ⚡ محرك الموشن الحقيقي الحي 60 FPS (Interactive 3D Engine)
        </button>

        <button
          onClick={() => setActiveTab('mp4_video')}
          style={{
            padding: '10px 22px',
            borderRadius: '10px',
            background: activeTab === 'mp4_video' ? '#2563EB' : 'rgba(15,23,42,0.8)',
            color: activeTab === 'mp4_video' ? '#FFFFFF' : '#CBD5E1',
            border: activeTab === 'mp4_video' ? '1px solid #2563EB' : '1px solid rgba(255,255,255,0.1)',
            fontWeight: 800,
            fontSize: '14px',
            cursor: 'pointer',
            transition: 'all 0.2s',
            boxShadow: activeTab === 'mp4_video' ? '0 0 20px rgba(37,99,235,0.35)' : 'none'
          }}
        >
          🎬 تشغيل ملف الفيديو المصدر (MP4 Video 1080p)
        </button>
      </div>

      {/* Main Display Area */}
      {activeTab === 'canvas_engine' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <StocklyMobiusCanvas width={1280} height={720} autoPlay={true} />
          
          {/* Engineering Breakdown Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginTop: '12px' }}>
            <div style={{ background: '#0F172A', padding: '16px 20px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)' }}>
              <span style={{ fontSize: '11px', color: '#00E599', fontWeight: 800 }}>01. حركة الشعار (3D Orbit)</span>
              <h4 style={{ margin: '6px 0 4px', fontSize: '15px', color: '#FFFFFF' }}>دوران محوري حقيقي</h4>
              <p style={{ margin: 0, fontSize: '12px', color: '#94A3B8', lineHeight: 1.5 }}>
                حساب رياضي لمنحنى Lemniscate ثلاثي الأبعاد يدور بزوايا Yaw و Pitch و Roll حقيقية.
              </p>
            </div>

            <div style={{ background: '#0F172A', padding: '16px 20px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)' }}>
              <span style={{ fontSize: '11px', color: '#38BDF8', fontWeight: 800 }}>02. بكرات السيور (Spinning Rollers)</span>
              <h4 style={{ margin: '6px 0 4px', fontSize: '15px', color: '#FFFFFF' }}>دوران فيزيائي للبكرات</h4>
              <p style={{ margin: 0, fontSize: '12px', color: '#94A3B8', lineHeight: 1.5 }}>
                70 بكرة أوتوماتيكية تدور بسرعات متزامنة مع حركة التوريد والصرف على مسارات الشريط.
              </p>
            </div>

            <div style={{ background: '#0F172A', padding: '16px 20px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)' }}>
              <span style={{ fontSize: '11px', color: '#A855F7', fontWeight: 800 }}>03. حزم البيانات (Telemetry Orbs)</span>
              <h4 style={{ margin: '6px 0 4px', fontSize: '15px', color: '#FFFFFF' }}>تدفق ضوئي سريع</h4>
              <p style={{ margin: 0, fontSize: '12px', color: '#94A3B8', lineHeight: 1.5 }}>
                جسيمات نيون زمردية وسماوية تجري بسرعة البرق على المسارات المزدوجة مع ذيول مضيئة.
              </p>
            </div>

            <div style={{ background: '#0F172A', padding: '16px 20px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)' }}>
              <span style={{ fontSize: '11px', color: '#F59E0B', fontWeight: 800 }}>04. المسح الليزري (Volumetric Laser)</span>
              <h4 style={{ margin: '6px 0 4px', fontSize: '15px', color: '#FFFFFF' }}>موجة مسح ضوئي عملاقة</h4>
              <p style={{ margin: 0, fontSize: '12px', color: '#94A3B8', lineHeight: 1.5 }}>
                لوح ليزري عالي الكثافة يمسح الشعار مع رنين صوتي وموجة صدمية تبرز الاسم في النهاية.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div style={{ background: '#0F172A', borderRadius: '16px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)', maxWidth: '1280px', margin: '0 auto', boxShadow: '0 25px 50px rgba(0,0,0,0.7)' }}>
          <div style={{ position: 'relative', width: '100%', aspectRatio: '16 / 9', background: '#000000' }}>
            <video
              src="/videos/stockly_real_motion_graphics.mp4"
              controls
              autoPlay
              loop
              style={{ width: '100%', height: '100%', objectFit: 'contain' }}
            />
          </div>
          <div style={{ padding: '20px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 style={{ margin: '0 0 6px', fontSize: '18px', color: '#FFFFFF' }}>
                ملف الفيديو المنتج: stockly_real_motion_graphics.mp4 (210 إطار بمعدل 30 FPS)
              </h3>
              <p style={{ margin: 0, color: '#94A3B8', fontSize: '14px' }}>
                فيديو ريندر حقيقي إطاراً بإطار محسوب فيزيائياً مع دوران اللوغو ومسح الليزر وتدفق البيانات.
              </p>
            </div>
            <a
              href="/videos/stockly_real_motion_graphics.mp4"
              download
              style={{
                padding: '10px 20px',
                borderRadius: '8px',
                background: '#00E599',
                color: '#070D18',
                fontWeight: 800,
                textDecoration: 'none',
                fontSize: '14px'
              }}
            >
              ⬇ تحميل ملف MP4
            </a>
          </div>
        </div>
      )}

    </div>
  );
}
