'use client';

import React from 'react';

interface BrandLoaderProps {
  text?: string;
  fullScreen?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export default function BrandLoader({
  text = 'Stockly WMS • جاري تحميل بيانات المنظومة...',
  fullScreen = false,
  size = 'md',
  className = ''
}: BrandLoaderProps) {
  const dimensions = {
    sm: { svgSize: 38, brandSize: '20px', tagSize: '10px', subSize: '6.5px' },
    md: { svgSize: 52, brandSize: '28px', tagSize: '12px', subSize: '8px' },
    lg: { svgSize: 68, brandSize: '36px', tagSize: '14px', subSize: '9.5px' },
  };

  const config = dimensions[size] || dimensions.md;

  const content = (
    <div 
      className={`brand-loader-container ${className}`}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        userSelect: 'none',
        padding: '2rem'
      }}
      dir="rtl"
    >
      {/* Animated Stockly 3D Cube & Pulse Core */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }} dir="ltr">
          
          <div 
            style={{ 
              position: 'relative', 
              width: `${config.svgSize}px`, 
              height: `${config.svgSize}px`, 
              flexShrink: 0,
              filter: 'drop-shadow(0 0 16px rgba(0, 223, 143, 0.55))'
            }}
          >
            <svg viewBox="0 0 100 100" style={{ width: '100%', height: '100%', overflow: 'visible' }}>
              <defs>
                <linearGradient id="loader-top-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#3DE1A0" />
                  <stop offset="100%" stopColor="#00DF8F" />
                </linearGradient>
                <linearGradient id="loader-left-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#0B7B5B" />
                  <stop offset="100%" stopColor="#06543C" />
                </linearGradient>
                <linearGradient id="loader-right-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#00BF88" />
                  <stop offset="100%" stopColor="#089166" />
                </linearGradient>
              </defs>

              {/* Isometric Top */}
              <polygon points="50,14 84,33 50,52 16,33" fill="url(#loader-top-grad)" stroke="#042F2C" strokeWidth="2.5" strokeLinejoin="round" />
              {/* Isometric Left */}
              <polygon points="16,33 50,52 50,86 16,67" fill="url(#loader-left-grad)" stroke="#042F2C" strokeWidth="2.5" strokeLinejoin="round" />
              {/* Isometric Right */}
              <polygon points="50,52 84,33 84,67 50,86" fill="url(#loader-right-grad)" stroke="#042F2C" strokeWidth="2.5" strokeLinejoin="round" />

              {/* Scanning Barcode Slits */}
              <line x1="58" y1="52" x2="58" y2="76" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" opacity="0.9" />
              <line x1="64" y1="49" x2="64" y2="73" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" opacity="0.8" />
              <line x1="70" y1="46" x2="70" y2="70" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" opacity="0.9" />
              <line x1="76" y1="43" x2="76" y2="67" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" opacity="0.8" />

              {/* Center Core */}
              <circle cx="50" cy="52" r="4" fill="#FFFFFF" />
            </svg>
          </div>

          {/* Typography */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', lineHeight: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span 
                className="brand-loader-text-glow"
                style={{ 
                  fontSize: config.brandSize, 
                  fontWeight: 900, 
                  color: '#00DF8F', 
                  letterSpacing: '1.2px', 
                  lineHeight: '0.9',
                  fontFamily: 'system-ui, -apple-system, sans-serif',
                  textShadow: '0 0 16px rgba(0, 223, 143, 0.55)'
                }}
              >
                STOCKLY
              </span>
              <span 
                style={{ 
                  fontSize: config.tagSize, 
                  fontWeight: 800, 
                  color: '#042F2C', 
                  background: 'linear-gradient(135deg, #3DE1A0, #00DF8F)',
                  padding: '2px 6px',
                  borderRadius: '4px',
                  letterSpacing: '1px',
                  textTransform: 'uppercase',
                  fontFamily: 'system-ui, -apple-system, sans-serif'
                }}
              >
                WMS
              </span>
            </div>
          </div>

        </div>

        {/* Subtitle */}
        <div 
          style={{ 
            width: '100%', 
            textAlign: 'center', 
            fontSize: config.subSize, 
            fontWeight: 700, 
            color: '#64748B', 
            letterSpacing: '2.5px', 
            marginTop: '6px', 
            textTransform: 'uppercase', 
            opacity: 0.95,
            fontFamily: 'system-ui, -apple-system, sans-serif'
          }}
          dir="ltr"
        >
          INTELLIGENT WAREHOUSE MANAGEMENT SYSTEM
        </div>
      </div>

      {/* Dynamic Animated Status Text */}
      {text && (
        <div 
          style={{
            marginTop: '1.25rem',
            fontSize: '0.9rem',
            fontWeight: 700,
            color: '#94A3B8',
            letterSpacing: '0.4px',
            textAlign: 'center'
          }}
        >
          {text}
        </div>
      )}

      {/* Clean Pulsing Dots */}
      <div 
        style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          gap: '6px', 
          marginTop: '1.25rem' 
        }}
      >
        <span className="brand-loader-dot brand-loader-dot-1" style={{ width: '7px', height: '7px' }} />
        <span className="brand-loader-dot brand-loader-dot-2" style={{ width: '7px', height: '7px' }} />
        <span className="brand-loader-dot brand-loader-dot-3" style={{ width: '7px', height: '7px' }} />
      </div>
    </div>
  );

  if (fullScreen) {
    return (
      <div 
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 99999,
          background: '#0b132b',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backdropFilter: 'blur(12px)'
        }}
      >
        {content}
      </div>
    );
  }

  return content;
}
