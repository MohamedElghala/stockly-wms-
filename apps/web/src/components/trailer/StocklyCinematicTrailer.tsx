'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Pause, Volume2, VolumeX, FastForward, CheckCircle2, Sparkles, ArrowRight, Layers } from 'lucide-react';
import { useRouter } from 'next/navigation';

export interface StocklyCinematicTrailerProps {
  fullScreen?: boolean;
  onComplete?: () => void;
  autoPlay?: boolean;
}

export interface TrailerScene {
  scene: number;
  name: string;
  durationMs: number;
  desc: string;
}

export const TRAILER_TIMELINE: TrailerScene[] = [
  { scene: 1, name: 'cube_deconstruct', durationMs: 3000, desc: 'Deconstructed chrome-and-glass modular cube' },
  { scene: 2, name: 'laser_sweep', durationMs: 4000, desc: 'Intersecting volumetric amber & cyan laser beams' },
  { scene: 3, name: 'kinetic_typography', durationMs: 5000, desc: 'Kinetic typography tagline reveal' },
  { scene: 4, name: 'hud_morph', durationMs: 3000, desc: 'Seamless HUD morph into live operational dashboard' },
];

export default function StocklyCinematicTrailer({
  fullScreen = true,
  onComplete,
  autoPlay = true,
}: StocklyCinematicTrailerProps) {
  const router = useRouter();
  const [currentSceneIdx, setCurrentSceneIdx] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(autoPlay);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isFinished, setIsFinished] = useState<boolean>(false);
  const [progressPct, setProgressPct] = useState<number>(0);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const sceneStartTimeRef = useRef<number>(Date.now());

  // Web Audio Procedural Sound Synthesis
  const initAudio = useCallback(() => {
    if (typeof window === 'undefined') return;
    try {
      if (!audioCtxRef.current) {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioCtx) {
          audioCtxRef.current = new AudioCtx();
        }
      }
      if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
        audioCtxRef.current.resume();
      }
    } catch {
      // AudioContext unavailable in silent environments
    }
  }, []);

  const playWhooshSound = useCallback(() => {
    if (isMuted || !audioCtxRef.current) return;
    try {
      const ctx = audioCtxRef.current;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(80, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.4);

      gain.gain.setValueAtTime(0.01, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.18, ctx.currentTime + 0.15);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.45);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.45);
    } catch {}
  }, [isMuted]);

  const playLaserSound = useCallback(() => {
    if (isMuted || !audioCtxRef.current) return;
    try {
      const ctx = audioCtxRef.current;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(1200, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(150, ctx.currentTime + 0.3);

      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.35);
    } catch {}
  }, [isMuted]);

  // Skip Trailer Handler
  const handleSkip = useCallback(() => {
    try {
      sessionStorage.setItem('stockly_intro_seen', 'true');
    } catch {}
    setIsFinished(true);
    setIsPlaying(false);
    if (onComplete) {
      onComplete();
    } else {
      router.push('/dashboard');
    }
  }, [onComplete, router]);

  // Scene Progression Controller
  useEffect(() => {
    if (!isPlaying || isFinished) return;
    initAudio();

    const currentScene = TRAILER_TIMELINE[currentSceneIdx];
    sceneStartTimeRef.current = Date.now();

    // Trigger procedural audio events per scene
    if (currentScene.scene === 1) playWhooshSound();
    if (currentScene.scene === 2) playLaserSound();
    if (currentScene.scene === 3) playWhooshSound();

    timerRef.current = setTimeout(() => {
      if (currentSceneIdx < TRAILER_TIMELINE.length - 1) {
        setCurrentSceneIdx(prev => prev + 1);
      } else {
        // Complete Sequence
        setIsFinished(true);
        setIsPlaying(false);
        try {
          sessionStorage.setItem('stockly_intro_seen', 'true');
        } catch {}
        if (onComplete) onComplete();
      }
    }, currentScene.durationMs);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [currentSceneIdx, isPlaying, isFinished, onComplete, initAudio, playWhooshSound, playLaserSound]);

  // Progress Bar Animation
  useEffect(() => {
    if (!isPlaying || isFinished) return;

    const totalDuration = TRAILER_TIMELINE.reduce((acc, s) => acc + s.durationMs, 0);
    const elapsedBeforeCurrent = TRAILER_TIMELINE.slice(0, currentSceneIdx).reduce((acc, s) => acc + s.durationMs, 0);

    const updateProgress = () => {
      const sceneElapsed = Date.now() - sceneStartTimeRef.current;
      const totalElapsed = elapsedBeforeCurrent + sceneElapsed;
      const pct = Math.min(100, (totalElapsed / totalDuration) * 100);
      setProgressPct(pct);

      if (isPlaying && !isFinished) {
        animationFrameRef.current = requestAnimationFrame(updateProgress);
      }
    };

    animationFrameRef.current = requestAnimationFrame(updateProgress);

    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [currentSceneIdx, isPlaying, isFinished]);

  // Keyboard shortcut: Space toggles play/pause
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        setIsPlaying(prev => !prev);
      } else if (e.code === 'Escape') {
        handleSkip();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleSkip]);

  const activeScene = TRAILER_TIMELINE[currentSceneIdx];

  return (
    <div 
      className="stockly-cinematic-trailer-viewport"
      style={{
        position: fullScreen ? 'fixed' : 'relative',
        inset: 0,
        zIndex: 9999,
        background: '#070D18', // Cinematic Deep Obsidian Space for marketing video
        color: '#FFFFFF',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        userSelect: 'none',
        fontFamily: 'Tajawal, system-ui, sans-serif'
      }}
    >

      {/* Atmospheric Fog & Background Laser Particle Grid */}
      <div 
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: `
            radial-gradient(circle at 50% 50%, rgba(6, 182, 212, 0.15) 0%, transparent 60%),
            radial-gradient(circle at 80% 20%, rgba(245, 158, 11, 0.12) 0%, transparent 50%),
            linear-gradient(to right, rgba(255, 255, 255, 0.03) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(255, 255, 255, 0.03) 1px, transparent 1px)
          `,
          backgroundSize: '100% 100%, 100% 100%, 40px 40px, 40px 40px',
          opacity: 0.8
        }}
      />

      {/* Top Floating Control Bar */}
      <div 
        style={{
          position: 'absolute',
          top: '20px',
          left: '24px',
          right: '24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          zIndex: 50
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ padding: '3px 8px', borderRadius: '4px', background: 'linear-gradient(135deg, #06B6D4, #10B981)', fontSize: '0.72rem', fontWeight: 900, color: '#070D18', letterSpacing: '1px' }}>
            PROMO 4K
          </span>
          <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#94A3B8', letterSpacing: '0.5px' }}>
            STOCKLY WMS • THE FUTURE OF LOGISTICS
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {/* Mute/Unmute */}
          <button 
            type="button"
            onClick={() => setIsMuted(!isMuted)} 
            style={{ padding: '0.4rem', borderRadius: '50%', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', color: '#FFFFFF', cursor: 'pointer' }}
            title={isMuted ? 'تشغيل الصوت' : 'كتم الصوت'}
          >
            {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
          </button>

          {/* Skip Button */}
          <button 
            type="button"
            onClick={handleSkip}
            style={{
              padding: '0.45rem 1rem',
              borderRadius: '20px',
              background: 'rgba(255,255,255,0.12)',
              border: '1px solid rgba(255,255,255,0.3)',
              color: '#FFFFFF',
              fontWeight: 800,
              fontSize: '0.82rem',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              cursor: 'pointer',
              backdropFilter: 'blur(8px)',
              transition: 'all 0.2s'
            }}
          >
            <span>تخطي العرض (Skip)</span>
            <FastForward size={14} />
          </button>
        </div>
      </div>

      {/* ──── SCENE 1: DECONSTRUCTED 3D MODULAR CUBE ──── */}
      {activeScene.scene === 1 && (
        <div 
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            animation: 'fadeInScale 0.8s ease-out forwards',
            zIndex: 20
          }}
        >
          {/* 3D Isometric Chrome Cube with GPU CSS Transform */}
          <div 
            style={{
              width: '240px',
              height: '240px',
              position: 'relative',
              transformStyle: 'preserve-3d',
              transform: 'perspective(1000px) rotateX(25deg) rotateY(-45deg) translate3d(0, 0, 50px)',
              filter: 'drop-shadow(0 0 35px rgba(6, 182, 212, 0.55))',
              transition: 'transform 0.4s ease'
            }}
          >
            <svg viewBox="0 0 100 100" style={{ width: '100%', height: '100%', overflow: 'visible' }}>
              <polygon points="50,14 84,33 50,52 16,33" fill="#00E599" stroke="#FFFFFF" strokeWidth="2" opacity="0.95" />
              <polygon points="16,33 50,52 50,86 16,67" fill="#0D6B52" stroke="#FFFFFF" strokeWidth="2" opacity="0.9" />
              <polygon points="50,52 84,33 84,67 50,86" fill="#06B6D4" stroke="#FFFFFF" strokeWidth="2" opacity="0.95" />
            </svg>
          </div>

          <h2 style={{ marginTop: '2.5rem', fontSize: '2rem', fontWeight: 900, letterSpacing: '1px', textAlign: 'center', color: '#FFFFFF', textShadow: '0 0 20px rgba(6, 182, 212, 0.6)' }}>
            المستودعات التقليدية... أصبحت من الماضي
          </h2>
          <p style={{ margin: '0.5rem 0 0 0', color: '#94A3B8', fontSize: '1rem', fontWeight: 600 }}>
            The Next-Generation Architecture of Warehouse Logistics
          </p>
        </div>
      )}

      {/* ──── SCENE 2: INTERSECTING AMBER & CYAN VOLUMETRIC LASERS ──── */}
      {activeScene.scene === 2 && (
        <div 
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
            width: '100%',
            height: '100%',
            zIndex: 20,
            animation: 'fadeInScale 0.6s ease-out forwards'
          }}
        >
          {/* Volumetric Laser Beams SVG */}
          <svg width="100%" height="400" style={{ position: 'absolute', inset: 0 }}>
            {/* Amber Laser Beam #F59E0B */}
            <line x1="0" y1="120" x2="100%" y2="280" stroke="#F59E0B" strokeWidth="4" strokeLinecap="round" filter="drop-shadow(0 0 12px #F59E0B)" />
            {/* Cyan Laser Beam #06B6D4 */}
            <line x1="0" y1="280" x2="100%" y2="120" stroke="#06B6D4" strokeWidth="4" strokeLinecap="round" filter="drop-shadow(0 0 12px #06B6D4)" />
          </svg>

          {/* Central Holographic Spatial Core */}
          <div style={{ padding: '2rem 3rem', borderRadius: '16px', background: 'rgba(15, 23, 42, 0.75)', border: '2px solid #06B6D4', boxShadow: '0 0 50px rgba(6, 182, 212, 0.4)', textAlign: 'center', backdropFilter: 'blur(16px)' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#F59E0B', letterSpacing: '2px' }}>
              AUTONOMOUS SPATIAL AUDIT
            </span>
            <h2 style={{ fontSize: '2.5rem', fontWeight: 900, color: '#FFFFFF', margin: '0.5rem 0' }}>
              توأم رقمي 3D فائق السرعة
            </h2>
            <p style={{ margin: 0, color: '#CBD5E1', fontSize: '1rem' }}>
              مسح باركود لحظي • توجيه ذكي للرافعات AGV • دقة جرد 100%
            </p>
          </div>
        </div>
      )}

      {/* ──── SCENE 3: KINETIC TYPOGRAPHY TAGLINE REVEAL ──── */}
      {activeScene.scene === 3 && (
        <div 
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
            padding: '2rem',
            zIndex: 20,
            animation: 'fadeInScale 0.6s ease-out forwards'
          }}
        >
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '0.4rem 1.25rem', borderRadius: '24px', background: 'rgba(16, 185, 129, 0.15)', border: '1.5px solid #10B981', color: '#10B981', fontSize: '0.9rem', fontWeight: 800, marginBottom: '1.25rem' }}>
            <Sparkles size={16} />
            <span>COMMERCIAL REVEAL 2026</span>
          </div>

          <h1 
            style={{ 
              fontSize: '3rem', 
              fontWeight: 900, 
              color: '#FFFFFF', 
              letterSpacing: '2px', 
              lineHeight: 1.2,
              maxWidth: '900px',
              textShadow: '0 0 30px rgba(16, 185, 129, 0.6)'
            }}
          >
            STOCKLY WMS: THE REVOLUTION OF WAREHOUSE INTELLIGENCE
          </h1>

          <p style={{ fontSize: '1.25rem', fontWeight: 700, color: '#94A3B8', marginTop: '1rem', maxWidth: '700px' }}>
            المنظومة السحابية الأذكى والأسرع عالمياً لإدارة المستودعات والتوزيع
          </p>
        </div>
      )}

      {/* ──── SCENE 4: SEAMLESS HUD MORPH INTO LIVE DASHBOARD ──── */}
      {activeScene.scene === 4 && (
        <div 
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
            zIndex: 20,
            animation: 'fadeInScale 0.6s ease-out forwards'
          }}
        >
          <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'rgba(16, 185, 129, 0.2)', border: '2px solid #10B981', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10B981', marginBottom: '1.5rem', boxShadow: '0 0 30px rgba(16, 185, 129, 0.5)' }}>
            <CheckCircle2 size={44} />
          </div>

          <h2 style={{ fontSize: '2.2rem', fontWeight: 900, color: '#FFFFFF', margin: 0 }}>
            جاهز للانطلاق والتجربة الميدانية
          </h2>

          <div style={{ display: 'flex', gap: '1rem', marginTop: '1.75rem' }}>
            <button 
              type="button"
              onClick={handleSkip}
              className="btn btn-primary"
              style={{ padding: '0.85rem 2rem', fontSize: '1rem', fontWeight: 800, borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              <span>دخول لوحة التحكم المباشرة</span>
              <ArrowRight size={18} />
            </button>
            <button 
              type="button"
              onClick={() => router.push('/warehouse-map')}
              className="btn btn-outline"
              style={{ padding: '0.85rem 1.75rem', fontSize: '1rem', fontWeight: 700, borderRadius: '12px', background: 'rgba(255,255,255,0.08)', color: '#FFFFFF' }}
            >
              مشاهدة خريطة الأرفف 3D
            </button>
          </div>
        </div>
      )}

      {/* Bottom Progress Bar & Timeline Indicator */}
      <div 
        style={{
          position: 'absolute',
          bottom: '24px',
          left: '32px',
          right: '32px',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          zIndex: 50
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', fontWeight: 700, color: '#94A3B8' }}>
          <span>المشهد {activeScene.scene} من 4 • {activeScene.desc}</span>
          <span>{Math.round(progressPct)}%</span>
        </div>

        <div style={{ width: '100%', height: '4px', borderRadius: '2px', background: 'rgba(255,255,255,0.15)', overflow: 'hidden' }}>
          <div 
            style={{
              height: '100%',
              width: `${progressPct}%`,
              background: 'linear-gradient(90deg, #F59E0B, #06B6D4, #10B981)',
              borderRadius: '2px',
              transition: 'width 0.1s linear'
            }}
          />
        </div>
      </div>

    </div>
  );
}
