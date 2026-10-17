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
            filter: 'drop-shadow(0 0 10px rgba(0, 229, 153, 0.45))'
          }}
        >
          <svg viewBox="0 0 100 100" style={{ width: '100%', height: '100%', overflow: 'visible' }}>
            <defs>
              <linearGradient id="stk-titanium-bezel" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#475569" />
                <stop offset="50%" stopColor="#1E293B" />
                <stop offset="100%" stopColor="#0F172A" />
              </linearGradient>
              <linearGradient id="stk-glass-top" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#38BDF8" stopOpacity="0.95" />
                <stop offset="100%" stopColor="#0284C7" stopOpacity="0.85" />
              </linearGradient>
              <linearGradient id="stk-glass-left" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#0F766E" stopOpacity="0.95" />
                <stop offset="100%" stopColor="#042F2E" stopOpacity="0.95" />
              </linearGradient>
              <linearGradient id="stk-glass-right" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#10B981" stopOpacity="0.95" />
                <stop offset="100%" stopColor="#047857" stopOpacity="0.95" />
              </linearGradient>
              <filter id="core-glow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="2.5" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
            </defs>

            {/* Precision Titanium Outer Corner Brackets */}
            <path d="M 50 8 L 88 28 L 50 48 L 12 28 Z" fill="none" stroke="url(#stk-titanium-bezel)" strokeWidth="5" strokeLinejoin="round" />
            <path d="M 12 28 L 12 72 L 50 92 L 50 48 Z" fill="none" stroke="url(#stk-titanium-bezel)" strokeWidth="5" strokeLinejoin="round" />
            <path d="M 88 28 L 88 72 L 50 92 L 50 48 Z" fill="none" stroke="url(#stk-titanium-bezel)" strokeWidth="5" strokeLinejoin="round" />

            {/* Chamfered Facets - Top Sapphire Glass */}
            <polygon points="50,14 82,30 50,46 18,30" fill="url(#stk-glass-top)" stroke="#38BDF8" strokeWidth="1" />
            {/* Left Emerald/Teal Glass Facet */}
            <polygon points="18,30 50,46 50,82 18,66" fill="url(#stk-glass-left)" stroke="#14B8A6" strokeWidth="1" />
            {/* Right Radiant Emerald Facet */}
            <polygon points="50,46 82,30 82,66 50,82" fill="url(#stk-glass-right)" stroke="#34D399" strokeWidth="1" />

            {/* Smart Micro-Conduit Lines & Barcode Telemetry */}
            <line x1="56" y1="49" x2="56" y2="72" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" opacity="0.95" />
            <line x1="62" y1="46" x2="62" y2="69" stroke="#38BDF8" strokeWidth="1.5" strokeLinecap="round" opacity="0.9" />
            <line x1="68" y1="43" x2="68" y2="66" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" opacity="0.95" />
            <line x1="74" y1="40" x2="74" y2="63" stroke="#34D399" strokeWidth="1.5" strokeLinecap="round" opacity="0.9" />

            {/* Intelligent Processor Core (Glowing Microchip) */}
            <rect x="44" y="44" width="12" height="12" rx="2" fill="#0F172A" stroke="#00F0FF" strokeWidth="1.5" transform="rotate(45 50 50)" filter="url(#core-glow)" />
            <circle cx="50" cy="50" r="3" fill="#FFFFFF" />
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
