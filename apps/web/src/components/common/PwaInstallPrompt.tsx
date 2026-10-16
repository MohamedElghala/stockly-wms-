'use client';

import React, { useState, useEffect } from 'react';
import { Download, X, Smartphone, Share, PlusSquare } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

export default function PwaInstallPrompt() {
  const { language } = useLanguage();
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [showIosGuide, setShowIosGuide] = useState(false);

  useEffect(() => {
    // Check if user already dismissed recently
    const dismissedAt = localStorage.getItem('calm_wms_pwa_dismissed');
    if (dismissedAt && Date.now() - Number(dismissedAt) < 7 * 24 * 60 * 60 * 1000) {
      return;
    }

    // Check if already in standalone mode (already installed and running as PWA)
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || 
      (window.navigator as any).standalone === true;
    
    if (isStandalone) return;

    // Detect iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIos(isIosDevice);

    if (isIosDevice) {
      // On iOS, beforeinstallprompt is not supported, show after 3 seconds on mobile
      const timer = setTimeout(() => setShowPrompt(true), 3000);
      return () => clearTimeout(timer);
    }

    // Android / Chromium / Desktop
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (isIos) {
      setShowIosGuide(true);
      return;
    }

    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setShowPrompt(false);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    setShowIosGuide(false);
    localStorage.setItem('calm_wms_pwa_dismissed', String(Date.now()));
  };

  if (!showPrompt) return null;

  return (
    <>
      <div 
        className="hide-on-print"
        style={{
          position: 'fixed',
          bottom: '1.25rem',
          [language === 'ar' ? 'left' : 'right']: '1.25rem',
          zIndex: 9999,
          maxWidth: '380px',
          width: 'calc(100vw - 2.5rem)',
          background: 'rgba(15, 23, 42, 0.95)',
          backdropFilter: 'blur(12px)',
          border: '1px solid rgba(9, 154, 117, 0.4)',
          borderRadius: '16px',
          padding: '1rem 1.15rem',
          boxShadow: '0 12px 32px rgba(0, 0, 0, 0.5), 0 0 20px rgba(9, 154, 117, 0.25)',
          animation: 'fadeInUp 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.75rem',
          fontFamily: 'inherit'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div 
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #099A75 0%, #065f46 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(9, 154, 117, 0.4)',
                flexShrink: 0
              }}
            >
              <Smartphone size={22} color="#ffffff" />
            </div>

            <div>
              <div style={{ fontWeight: 800, fontSize: '0.95rem', color: '#ffffff', lineHeight: 1.2 }}>
                {language === 'ar' ? 'تثبيت تطبيق Stockly WMS' : 'Install Stockly WMS'}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '2px' }}>
                {language === 'ar' ? 'كأيقونة مباشرة وسريعة على هاتفك' : 'Add to phone home screen'}
              </div>
            </div>
          </div>

          <button 
            onClick={handleDismiss}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#64748b',
              cursor: 'pointer',
              padding: '4px',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            title={language === 'ar' ? 'إغلاق' : 'Dismiss'}
          >
            <X size={18} />
          </button>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            onClick={handleInstallClick}
            style={{
              flex: 1,
              background: 'linear-gradient(135deg, #099A75 0%, #0b7d60 100%)',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              padding: '0.6rem 1rem',
              fontWeight: 700,
              fontSize: '0.85rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.4rem',
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(9, 154, 117, 0.3)'
            }}
          >
            <Download size={16} />
            <span>{language === 'ar' ? 'تثبيت على الشاشة الآن' : 'Install App'}</span>
          </button>

          <button
            onClick={handleDismiss}
            style={{
              background: 'rgba(255, 255, 255, 0.05)',
              color: '#94a3b8',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '8px',
              padding: '0.6rem 0.85rem',
              fontSize: '0.85rem',
              cursor: 'pointer'
            }}
          >
            {language === 'ar' ? 'لاحقاً' : 'Later'}
          </button>
        </div>
      </div>

      {/* iOS Instructions Modal Guide */}
      {showIosGuide && (
        <div 
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(8px)',
            zIndex: 10000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1.25rem'
          }}
          onClick={() => setShowIosGuide(false)}
        >
          <div 
            style={{
              background: '#0f172a',
              border: '1px solid rgba(9, 154, 117, 0.3)',
              borderRadius: '18px',
              padding: '1.75rem',
              maxWidth: '400px',
              width: '100%',
              textAlign: 'center',
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.6)'
            }}
            onClick={e => e.stopPropagation()}
          >
            <div 
              style={{
                width: '54px',
                height: '54px',
                borderRadius: '14px',
                background: 'rgba(9, 154, 117, 0.15)',
                color: '#099A75',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 1rem auto'
              }}
            >
              <Smartphone size={28} />
            </div>

            <h3 style={{ margin: '0 0 0.75rem 0', color: '#ffffff', fontSize: '1.15rem', fontWeight: 800 }}>
              {language === 'ar' ? 'تثبيت التطبيق على الآيفون' : 'Install on iPhone / iPad'}
            </h3>

            <p style={{ color: '#94a3b8', fontSize: '0.875rem', lineHeight: 1.6, marginBottom: '1.5rem' }}>
              {language === 'ar' 
                ? 'لتثبيت المنظومة كأيقونة على شاشتك الرئيسية، اتبع الخطوتين البسيطتين:' 
                : 'Follow these 2 simple steps to add the app to your home screen:'}
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', textAlign: language === 'ar' ? 'right' : 'left', marginBottom: '1.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', background: 'rgba(255, 255, 255, 0.04)', padding: '0.75rem 1rem', borderRadius: '10px' }}>
                <Share size={20} color="#38bdf8" style={{ flexShrink: 0 }} />
                <span style={{ fontSize: '0.85rem', color: '#f8fafc' }}>
                  {language === 'ar' ? '1. اضغط على زر المشاركة (Share) أسفل المتصفح' : '1. Tap the Share button at bottom of Safari'}
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', background: 'rgba(255, 255, 255, 0.04)', padding: '0.75rem 1rem', borderRadius: '10px' }}>
                <PlusSquare size={20} color="#099A75" style={{ flexShrink: 0 }} />
                <span style={{ fontSize: '0.85rem', color: '#f8fafc' }}>
                  {language === 'ar' ? '2. اختر "إضافة إلى الصفحة الرئيسية" (Add to Home Screen)' : '2. Select "Add to Home Screen"'}
                </span>
              </div>
            </div>

            <button
              onClick={() => setShowIosGuide(false)}
              style={{
                width: '100%',
                background: '#099A75',
                color: '#ffffff',
                border: 'none',
                borderRadius: '10px',
                padding: '0.75rem',
                fontWeight: 700,
                fontSize: '0.9rem',
                cursor: 'pointer'
              }}
            >
              {language === 'ar' ? 'فهمت، حسناً' : 'Got it!'}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
