'use client';

import React from 'react';

interface BrandLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'compact';
  showSubtitle?: boolean;
  className?: string;
}

export default function BrandLogo({ size = 'md', showSubtitle = true, className = '' }: BrandLogoProps) {
  const dimensions = {
    sm: { svgSize: 36, brandSize: '20px', tagSize: '10px', subSize: '7px', gap: '9px', subMargin: '3px' },
    md: { svgSize: 46, brandSize: '26px', tagSize: '12px', subSize: '8px', gap: '12px', subMargin: '5px' },
    lg: { svgSize: 60, brandSize: '34px', tagSize: '15px', subSize: '9.5px', gap: '15px', subMargin: '6px' },
    compact: { svgSize: 28, brandSize: '16px', tagSize: '8px', subSize: '6px', gap: '6px', subMargin: '2px' }
  };

  const config = dimensions[size] || dimensions.md;

  return (
    <div 
      className={`brand-logo-official ${className}`} 
      style={{ 
        display: 'inline-flex', 
        flexDirection: 'column', 
        alignItems: 'flex-start', 
        userSelect: 'none' 
      }} 
      dir="ltr"
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: config.gap }}>
        
        {/* Stockly Official Geometric 3D Smart Warehouse Cube & Barcode Icon */}
        <div 
          style={{ 
            position: 'relative', 
            width: `${config.svgSize}px`, 
            height: `${config.svgSize}px`, 
            flexShrink: 0,
            filter: 'drop-shadow(0 0 10px rgba(0, 223, 143, 0.45))'
          }}
        >
          <svg viewBox="0 0 100 100" style={{ width: '100%', height: '100%', overflow: 'visible' }}>
            <defs>
              <linearGradient id="stockly-top-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#4FFFC0" />
                <stop offset="100%" stopColor="#00E599" />
              </linearGradient>
              <linearGradient id="stockly-left-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#0D6B52" />
                <stop offset="100%" stopColor="#063D2E" />
              </linearGradient>
              <linearGradient id="stockly-right-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#00E599" />
                <stop offset="100%" stopColor="#059968" />
              </linearGradient>
            </defs>

            {/* Isometric Warehouse Box - Top Facet */}
            <polygon 
              points="50,14 84,33 50,52 16,33" 
              fill="url(#stockly-top-grad)" 
              stroke="#03201C" 
              strokeWidth="2.5" 
              strokeLinejoin="round" 
            />

            {/* Isometric Warehouse Box - Left Facet */}
            <polygon 
              points="16,33 50,52 50,86 16,67" 
              fill="url(#stockly-left-grad)" 
              stroke="#03201C" 
              strokeWidth="2.5" 
              strokeLinejoin="round" 
            />

            {/* Isometric Warehouse Box - Right Facet */}
            <polygon 
              points="50,52 84,33 84,67 50,86" 
              fill="url(#stockly-right-grad)" 
              stroke="#03201C" 
              strokeWidth="2.5" 
              strokeLinejoin="round" 
            />

            {/* Stylized Barcode Slits on Right Facet */}
            <line x1="58" y1="52" x2="58" y2="76" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" opacity="0.95" />
            <line x1="64" y1="49" x2="64" y2="73" stroke="#00F0FF" strokeWidth="1.5" strokeLinecap="round" opacity="0.9" />
            <line x1="70" y1="46" x2="70" y2="70" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" opacity="0.95" />
            <line x1="76" y1="43" x2="76" y2="67" stroke="#00E599" strokeWidth="1.5" strokeLinecap="round" opacity="0.85" />

            {/* Dynamic Center Pulse Core */}
            <circle cx="50" cy="52" r="3.5" fill="#00F0FF" />
          </svg>
        </div>

        {/* Brand Name Typography */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', lineHeight: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span 
              style={{ 
                fontSize: config.brandSize, 
                fontWeight: 900, 
                color: '#00E599', 
                letterSpacing: '1.4px', 
                lineHeight: '0.9',
                fontFamily: 'system-ui, -apple-system, sans-serif',
                textShadow: '0 0 16px rgba(0, 229, 153, 0.55)'
              }}
            >
              STOCKLY
            </span>
            <span 
              style={{ 
                fontSize: config.tagSize, 
                fontWeight: 800, 
                color: '#060B14', 
                background: 'linear-gradient(135deg, #00F0FF, #00E599)',
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

      {/* Subtitle - Centered Underneath Entire Logo */}
      {showSubtitle && (
        <div 
          style={{ 
            width: '100%',
            textAlign: 'center',
            fontSize: config.subSize, 
            fontWeight: 700, 
            color: '#64748B', 
            letterSpacing: '2px', 
            marginTop: config.subMargin, 
            textTransform: 'uppercase', 
            opacity: 0.95, 
            fontFamily: 'system-ui, -apple-system, sans-serif'
          }}
        >
          INTELLIGENT WAREHOUSE MANAGEMENT SYSTEM
        </div>
      )}
    </div>
  );
}
