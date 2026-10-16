'use client';

import React, { useState, useEffect, useRef } from 'react';

interface StocklyIntroSplashProps {
  onComplete?: () => void;
  forceShow?: boolean;
}

export default function StocklyIntroSplash({ onComplete, forceShow = false }: StocklyIntroSplashProps) {
  const [visible, setVisible] = useState(false);
  const [phase, setPhase] = useState<'letters' | 'morph' | 'lock' | 'complete'>('letters');
  const [fadingOut, setFadingOut] = useState(false);
  const [progress, setProgress] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Check if user already saw the intro in this session
    const seen = sessionStorage.getItem('stockly_intro_seen');
    if (seen && !forceShow) {
      if (onComplete) onComplete();
      return;
    }

    setVisible(true);

    // Timeline phases:
    // 0ms - 1100ms: Letters fly in and glow (letters phase)
    // 1100ms - 2200ms: Letters converge into 3D isometric box (morph phase)
    // 2200ms - 3200ms: Vault locks, shield glows, laser scans (lock phase)
    // 3200ms - 3700ms: Final brand reveal & smooth fade-out (complete phase)

    const p1 = setTimeout(() => setPhase('morph'), 1100);
    const p2 = setTimeout(() => setPhase('lock'), 2100);
    const p3 = setTimeout(() => setPhase('complete'), 3100);
    const pEnd = setTimeout(() => {
      setFadingOut(true);
      setTimeout(() => {
        setVisible(false);
        sessionStorage.setItem('stockly_intro_seen', 'true');
        if (onComplete) onComplete();
      }, 500);
    }, 3600);

    // Progress bar ticker (3600ms total)
    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const pct = Math.min(100, (elapsed / 3500) * 100);
      setProgress(pct);
      if (pct >= 100) clearInterval(interval);
    }, 30);

    return () => {
      clearTimeout(p1);
      clearTimeout(p2);
      clearTimeout(p3);
      clearTimeout(pEnd);
      clearInterval(interval);
    };
  }, [forceShow, onComplete]);

  const handleSkip = () => {
    setFadingOut(true);
    setTimeout(() => {
      setVisible(false);
      sessionStorage.setItem('stockly_intro_seen', 'true');
      if (onComplete) onComplete();
    }, 300);
  };

  if (!visible) return null;

  const letters = ['S', 'T', 'O', 'C', 'K', 'L', 'Y'];

  return (
    <div 
      className={`stockly-intro-splash ${fadingOut ? 'fade-out' : ''}`}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100000,
        backgroundColor: '#060B14',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        fontFamily: "'Tajawal', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        userSelect: 'none',
        transition: 'opacity 0.5s cubic-bezier(0.4, 0, 0.2, 1), transform 0.5s ease',
        opacity: fadingOut ? 0 : 1,
        transform: fadingOut ? 'scale(1.04)' : 'scale(1)',
        pointerEvents: fadingOut ? 'none' : 'auto',
      }}
    >
      {/* Background Cyber Grid & Vignette */}
      <div 
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: `
            linear-gradient(to right, rgba(0, 229, 153, 0.05) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(0, 229, 153, 0.05) 1px, transparent 1px)
          `,
          backgroundSize: '48px 48px',
          maskImage: 'radial-gradient(ellipse at center, rgba(0,0,0,1) 30%, rgba(0,0,0,0) 80%)',
          WebkitMaskImage: 'radial-gradient(ellipse at center, rgba(0,0,0,1) 30%, rgba(0,0,0,0) 80%)',
          pointerEvents: 'none'
        }} 
      />

      {/* Ambient Pulsing Glow Orbs */}
      <div 
        style={{
          position: 'absolute',
          width: '500px',
          height: '500px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(0, 229, 153, 0.16) 0%, rgba(0, 194, 255, 0.08) 45%, transparent 70%)',
          filter: 'blur(50px)',
          animation: 'pulseGlow 3s ease-in-out infinite',
          pointerEvents: 'none'
        }} 
      />

      {/* Top Bar with Skip Button & Live Status */}
      <div 
        style={{
          position: 'absolute',
          top: '24px',
          left: '24px',
          right: '24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          zIndex: 10
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span 
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: '#00E599',
              boxShadow: '0 0 10px #00E599',
              display: 'inline-block',
              animation: 'beacon 1.2s infinite ease-in-out'
            }} 
          />
          <span style={{ fontSize: '11px', color: '#94A3B8', letterSpacing: '1.5px', textTransform: 'uppercase', fontWeight: 600 }}>
            WMS PROTOCOL INITIALIZATION
          </span>
        </div>

        <button
          onClick={handleSkip}
          style={{
            background: 'rgba(15, 23, 42, 0.65)',
            border: '1px solid rgba(0, 229, 153, 0.3)',
            borderRadius: '20px',
            color: '#E2E8F0',
            padding: '6px 16px',
            fontSize: '12px',
            fontWeight: 700,
            cursor: 'pointer',
            backdropFilter: 'blur(8px)',
            transition: 'all 0.2s ease',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = '#00E599';
            e.currentTarget.style.boxShadow = '0 0 14px rgba(0, 229, 153, 0.4)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = 'rgba(0, 229, 153, 0.3)';
            e.currentTarget.style.boxShadow = 'none';
          }}
        >
          <span>تخطي</span>
          <span style={{ opacity: 0.6 }}>•</span>
          <span style={{ fontSize: '10px', opacity: 0.75 }}>Skip</span>
        </button>
      </div>

      {/* Central Visual Motion Stage */}
      <div 
        style={{
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '260px',
          zIndex: 5
        }}
      >
        {/* PHASE 1: Typographic Kinetic Letters (0.0s - 1.1s) */}
        <div 
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            position: 'absolute',
            transition: 'all 0.7s cubic-bezier(0.16, 1, 0.3, 1)',
            opacity: phase === 'letters' ? 1 : 0,
            transform: phase === 'letters' ? 'scale(1) translateY(0)' : 'scale(0.3) translateY(40px)',
            pointerEvents: 'none'
          }}
        >
          {letters.map((char, idx) => (
            <span
              key={idx}
              style={{
                fontSize: 'clamp(2.5rem, 7vw, 4.2rem)',
                fontWeight: 900,
                color: '#FFFFFF',
                letterSpacing: '4px',
                textShadow: '0 0 20px rgba(0, 229, 153, 0.9), 0 0 40px rgba(0, 194, 255, 0.6)',
                animation: `letterDrop 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards`,
                animationDelay: `${idx * 0.1}s`,
                opacity: 0,
                display: 'inline-block'
              }}
            >
              {char}
            </span>
          ))}
        </div>

        {/* PHASE 2 & 3: Isometric 3D Warehouse Box & Security Vault (1.1s - 3.5s) */}
        <div 
          style={{
            position: 'relative',
            width: '180px',
            height: '180px',
            transition: 'all 0.8s cubic-bezier(0.34, 1.3, 0.64, 1)',
            opacity: phase !== 'letters' ? 1 : 0,
            transform: phase !== 'letters' ? 'scale(1) translateY(0)' : 'scale(0.4) translateY(-30px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          {/* Pulsing Radar Ring Behind the Vault */}
          <div 
            style={{
              position: 'absolute',
              inset: '-20px',
              border: '1.5px dashed rgba(0, 229, 153, 0.35)',
              borderRadius: '50%',
              animation: 'spinSlow 12s linear infinite',
              pointerEvents: 'none'
            }} 
          />
          <div 
            style={{
              position: 'absolute',
              inset: '-40px',
              border: '1px solid rgba(0, 194, 255, 0.15)',
              borderRadius: '50%',
              animation: 'spinReverse 18s linear infinite',
              pointerEvents: 'none'
            }} 
          />

          {/* SVG 3D Isometric Warehouse Box & Governance Shield */}
          <svg 
            viewBox="0 0 200 200" 
            style={{ 
              width: '100%', 
              height: '100%', 
              filter: 'drop-shadow(0 0 25px rgba(0, 229, 153, 0.65))',
              overflow: 'visible' 
            }}
          >
            <defs>
              {/* Top Face Gradient */}
              <linearGradient id="intro-top" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#4FFFC0" />
                <stop offset="50%" stopColor="#00E599" />
                <stop offset="100%" stopColor="#00BF88" />
              </linearGradient>

              {/* Left Face Gradient */}
              <linearGradient id="intro-left" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#0D6B52" />
                <stop offset="100%" stopColor="#063D2E" />
              </linearGradient>

              {/* Right Face Gradient */}
              <linearGradient id="intro-right" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#059968" />
                <stop offset="100%" stopColor="#06543C" />
              </linearGradient>

              {/* Cyan Laser Gradient */}
              <linearGradient id="laser-grad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="transparent" />
                <stop offset="50%" stopColor="#00F0FF" />
                <stop offset="100%" stopColor="transparent" />
              </linearGradient>
            </defs>

            {/* Isometric 3D Box Geometry */}
            {/* Top Roof */}
            <polygon 
              points="100,28 166,66 100,104 34,66" 
              fill="url(#intro-top)" 
              stroke="#03201C" 
              strokeWidth="3" 
              strokeLinejoin="round" 
            />
            {/* Left Wall */}
            <polygon 
              points="34,66 100,104 100,172 34,134" 
              fill="url(#intro-left)" 
              stroke="#03201C" 
              strokeWidth="3" 
              strokeLinejoin="round" 
            />
            {/* Right Wall */}
            <polygon 
              points="100,104 166,66 166,134 100,172" 
              fill="url(#intro-right)" 
              stroke="#03201C" 
              strokeWidth="3" 
              strokeLinejoin="round" 
            />

            {/* Digital Warehouse Barcode Stripes on Right Face */}
            <line x1="116" y1="104" x2="116" y2="152" stroke="#FFFFFF" strokeWidth="4" strokeLinecap="round" opacity="0.9" />
            <line x1="128" y1="97" x2="128" y2="145" stroke="#00E599" strokeWidth="2.5" strokeLinecap="round" opacity="0.85" />
            <line x1="138" y1="91" x2="138" y2="139" stroke="#FFFFFF" strokeWidth="5" strokeLinecap="round" opacity="0.95" />
            <line x1="150" y1="84" x2="150" y2="132" stroke="#00F0FF" strokeWidth="2" strokeLinecap="round" opacity="0.9" />

            {/* Smart Storage Racks Lines on Left Face */}
            <line x1="44" y1="88" x2="90" y2="114" stroke="rgba(255,255,255,0.4)" strokeWidth="2" strokeDasharray="3,3" />
            <line x1="44" y1="112" x2="90" y2="138" stroke="rgba(255,255,255,0.4)" strokeWidth="2" strokeDasharray="3,3" />

            {/* Sweeping Laser Scanner Bar */}
            <g style={{ animation: 'laserSweep 1.8s ease-in-out infinite' }}>
              <rect x="25" y="60" width="150" height="3" fill="url(#laser-grad)" opacity="0.9" filter="drop-shadow(0 0 6px #00F0FF)" />
            </g>

            {/* Center Governance Shield / Vault Core Lock */}
            <g transform="translate(100, 104)">
              {/* Central Glowing Shield */}
              <circle cx="0" cy="0" r="16" fill="#060B14" stroke="#00E599" strokeWidth="3" />
              {/* Vault Keyhole / Safety Lock Symbol */}
              <path 
                d="M -5 -3 L 5 -3 L 4 4 L -4 4 Z" 
                fill="#00E599" 
              />
              <circle cx="0" cy="-5" r="3.5" fill="none" stroke="#00E599" strokeWidth="2" />
            </g>
          </svg>
        </div>

        {/* Brand Typographic Reveal & Subtitles */}
        <div 
          style={{
            marginTop: '28px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
            transition: 'all 0.6s ease',
            opacity: phase === 'morph' || phase === 'lock' || phase === 'complete' ? 1 : 0,
            transform: phase === 'letters' ? 'translateY(15px)' : 'translateY(0)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span 
              style={{
                fontSize: 'clamp(1.8rem, 4vw, 2.6rem)',
                fontWeight: 900,
                color: '#FFFFFF',
                letterSpacing: '3px',
                fontFamily: "'Tajawal', system-ui, sans-serif",
                textShadow: '0 0 16px rgba(0, 229, 153, 0.7)'
              }}
            >
              STOCKLY
            </span>
            <span 
              style={{
                fontSize: 'clamp(0.85rem, 1.8vw, 1.1rem)',
                fontWeight: 800,
                color: '#060B14',
                background: 'linear-gradient(135deg, #00F0FF, #00E599)',
                padding: '3px 9px',
                borderRadius: '6px',
                letterSpacing: '1.5px',
                boxShadow: '0 0 14px rgba(0, 229, 153, 0.5)'
              }}
            >
              WMS
            </span>
          </div>

          <p 
            style={{
              margin: '8px 0 0 0',
              fontSize: 'clamp(0.72rem, 1.5vw, 0.88rem)',
              fontWeight: 700,
              color: '#94A3B8',
              letterSpacing: '2.5px',
              textTransform: 'uppercase'
            }}
          >
            INTELLIGENT WAREHOUSE & SUPPLY CHAIN GOVERNANCE
          </p>

          <div 
            style={{
              marginTop: '10px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '11px',
              color: '#00E599',
              background: 'rgba(0, 229, 153, 0.08)',
              padding: '4px 12px',
              borderRadius: '20px',
              border: '1px solid rgba(0, 229, 153, 0.25)'
            }}
          >
            <span>نظام إدارة المستودعات وسلاسل الإمداد الذكية</span>
            <span>✓</span>
          </div>
        </div>
      </div>

      {/* Bottom Progress Bar & Timing Ticker */}
      <div 
        style={{
          position: 'absolute',
          bottom: '0',
          left: '0',
          right: '0',
          height: '4px',
          background: 'rgba(255, 255, 255, 0.06)'
        }}
      >
        <div 
          style={{
            height: '100%',
            width: `${progress}%`,
            background: 'linear-gradient(90deg, #00E599, #00F0FF)',
            boxShadow: '0 0 12px #00E599',
            transition: 'width 0.04s linear'
          }} 
        />
      </div>

      {/* Global Embedded Animations */}
      <style jsx global>{`
        @keyframes letterDrop {
          0% {
            opacity: 0;
            transform: translateY(-40px) scale(0.6);
            filter: blur(10px);
          }
          60% {
            opacity: 1;
            transform: translateY(6px) scale(1.08);
            filter: blur(0px);
          }
          100% {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        @keyframes laserSweep {
          0% {
            transform: translateY(-20px);
            opacity: 0.2;
          }
          50% {
            transform: translateY(70px);
            opacity: 1;
          }
          100% {
            transform: translateY(-20px);
            opacity: 0.2;
          }
        }

        @keyframes pulseGlow {
          0%, 100% {
            transform: scale(0.9);
            opacity: 0.6;
          }
          50% {
            transform: scale(1.15);
            opacity: 1;
          }
        }

        @keyframes spinSlow {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }

        @keyframes spinReverse {
          from {
            transform: rotate(360deg);
          }
          to {
            transform: rotate(0deg);
          }
        }

        @keyframes beacon {
          0%, 100% {
            opacity: 1;
            transform: scale(1);
          }
          50% {
            opacity: 0.3;
            transform: scale(1.4);
          }
        }
      `}</style>
    </div>
  );
}
