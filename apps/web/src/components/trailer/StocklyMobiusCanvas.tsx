'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';

interface StocklyMobiusCanvasProps {
  autoPlay?: boolean;
  onComplete?: () => void;
  width?: number;
  height?: number;
}

export default function StocklyMobiusCanvas({
  autoPlay = true,
  onComplete,
  width = 1200,
  height = 675,
}: StocklyMobiusCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameIdRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(Date.now());
  const [isPlaying, setIsPlaying] = useState<boolean>(autoPlay);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const audioCtxRef = useRef<AudioContext | null>(null);

  // Audio synthesis for laser & whoosh
  const triggerAudioEffect = useCallback((type: 'sweep' | 'impact') => {
    if (isMuted || typeof window === 'undefined') return;
    try {
      if (!audioCtxRef.current) {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioCtx) audioCtxRef.current = new AudioCtx();
      }
      const ctx = audioCtxRef.current;
      if (!ctx || ctx.state === 'suspended') ctx?.resume();

      if (type === 'sweep' && ctx) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(300, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(1400, ctx.currentTime + 0.35);
        gain.gain.setValueAtTime(0.08, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.35);
      } else if (type === 'impact' && ctx) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(120, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(45, ctx.currentTime + 0.6);
        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.6);
      }
    } catch {}
  }, [isMuted]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let laserFired = false;
    let impactFired = false;

    // Parametric 3D curve data
    const NUM_POINTS = 180;
    const NUM_ROLLERS = 70;
    const TRACK_W = 50;

    const render = () => {
      const now = Date.now();
      const elapsed = (now - startTimeRef.current) / 1000;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // 1. Dark Futuristic Studio Background with Radial Vignette
      const bgGrad = ctx.createRadialGradient(
        canvas.width / 2, canvas.height / 2, 80,
        canvas.width / 2, canvas.height / 2, canvas.width * 0.75
      );
      bgGrad.addColorStop(0, '#0F1E36');
      bgGrad.addColorStop(0.5, '#070D18');
      bgGrad.addColorStop(1, '#030712');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // 2. Perspective Ground Floor Grid
      ctx.strokeStyle = 'rgba(0, 229, 255, 0.05)';
      ctx.lineWidth = 1;
      const horizonY = canvas.height * 0.65;
      for (let y = horizonY; y < canvas.height; y += 30) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
      }
      for (let x = -canvas.width * 0.5; x < canvas.width * 1.5; x += 100) {
        ctx.beginPath();
        ctx.moveTo(canvas.width / 2, horizonY);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
      }

      // 3. 3D Camera Angles (Dynamic Rotation & Hero Ease)
      let yaw = 0;
      let pitch = 0.2;
      let roll = 0;
      let zoom = 1.0;

      if (elapsed < 4.5) {
        yaw = Math.sin(elapsed * 1.2) * 0.55 + elapsed * 0.25;
        pitch = Math.sin(elapsed * 0.9) * 0.25 + 0.18;
        roll = Math.sin(elapsed * 0.6) * 0.08;
        zoom = 0.95 + elapsed * 0.05;
      } else {
        // Smoothly settle into Hero pose
        const settle = Math.min(1.0, (elapsed - 4.5) / 1.5);
        const ease = 1 - Math.pow(1 - settle, 3);
        yaw = (1 - ease) * (Math.sin(4.5 * 1.2) * 0.55 + 4.5 * 0.25);
        pitch = (1 - ease) * 0.25 + ease * 0.08;
        zoom = 1.15;
      }

      // Audio triggers
      if (elapsed >= 2.0 && !laserFired) {
        triggerAudioEffect('sweep');
        laserFired = true;
      }
      if (elapsed >= 4.5 && !impactFired) {
        triggerAudioEffect('impact');
        impactFired = true;
      }

      // 4. Calculate 3D Points for Mobius Ribbon S
      const points3D: { x: number; y: number; z: number; u: number; sx: number; sy: number; scale: number }[] = [];
      const radX = 260 * zoom;
      const radY = 220 * zoom;
      const radZ = 140 * zoom;

      for (let i = 0; i < NUM_POINTS; i++) {
        const u = (i / NUM_POINTS) * Math.PI * 2;
        // Lemniscate of Gerono (figure-8 / S) in 3D:
        const rawX = radX * Math.sin(u);
        const rawY = radY * Math.sin(u) * Math.cos(u) * 1.85;
        const rawZ = radZ * Math.cos(u);

        // Rotate in 3D
        // Yaw
        const x1 = rawX * Math.cos(yaw) + rawZ * Math.sin(yaw);
        const y1 = rawY;
        const z1 = -rawX * Math.sin(yaw) + rawZ * Math.cos(yaw);
        // Pitch
        const x2 = x1;
        const y2 = y1 * Math.cos(pitch) - z1 * Math.sin(pitch);
        const z2 = y1 * Math.sin(pitch) + z1 * Math.cos(pitch);

        // Perspective Projection
        const fov = 750;
        const dist = fov + z2;
        const scale = fov / Math.max(10, dist);
        const sx = canvas.width / 2 + x2 * scale;
        const sy = canvas.height / 2 - 30 + y2 * scale;

        points3D.push({ x: x2, y: y2, z: z2, u, sx, sy, scale });
      }

      // 5. Draw 3D Rails with Volumetric Gradients
      const leftRail: { x: number; y: number; z: number }[] = [];
      const rightRail: { x: number; y: number; z: number }[] = [];

      for (let i = 0; i < NUM_POINTS; i++) {
        const p = points3D[i];
        const next = points3D[(i + 1) % NUM_POINTS];
        const dx = next.sx - p.sx;
        const dy = next.sy - p.sy;
        const len = Math.sqrt(dx * dx + dy * dy) || 1;
        const nx = -dy / len;
        const ny = dx / len;
        const hw = (TRACK_W / 2) * p.scale;

        leftRail.push({ x: p.sx + nx * hw, y: p.sy + ny * hw, z: p.z });
        rightRail.push({ x: p.sx - nx * hw, y: p.sy - ny * hw, z: p.z });
      }

      // Draw Rails Segments
      for (let i = 0; i < NUM_POINTS; i++) {
        const nextI = (i + 1) % NUM_POINTS;
        const p1 = leftRail[i];
        const p2 = leftRail[nextI];
        const q1 = rightRail[i];
        const q2 = rightRail[nextI];

        const depthFade = Math.min(1.0, Math.max(0.3, (p1.z + 180) / 360));
        const colorPhase = ((i / NUM_POINTS) + elapsed * 0.4) % 1.0;

        let strokeColor = '#00E599';
        if (colorPhase < 0.5) {
          strokeColor = `rgba(37, 99, 235, ${0.4 + depthFade * 0.6})`;
        } else {
          strokeColor = `rgba(0, 229, 153, ${0.4 + depthFade * 0.6})`;
        }

        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = Math.max(2, 4 * depthFade);
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(q1.x, q1.y);
        ctx.lineTo(q2.x, q2.y);
        ctx.stroke();
      }

      // 6. Draw Physically Rotating Conveyor Rollers
      const rollerStep = Math.floor(NUM_POINTS / NUM_ROLLERS);
      for (let r = 0; r < NUM_ROLLERS; r++) {
        const idx = (r * rollerStep) % NUM_POINTS;
        const pl = leftRail[idx];
        const pr = rightRail[idx];
        const depthFade = Math.min(1.0, Math.max(0.3, (pl.z + 180) / 360));

        // Angular rotation calculation
        const spinAngle = elapsed * 15.0 + r * 0.4;
        const isLight = Math.sin(spinAngle) > 0;

        ctx.strokeStyle = isLight 
          ? `rgba(226, 232, 240, ${depthFade * 0.85})` 
          : `rgba(71, 85, 105, ${depthFade * 0.65})`;
        ctx.lineWidth = Math.max(1.5, 3.5 * depthFade);

        ctx.beginPath();
        ctx.moveTo(pl.x, pl.y);
        ctx.lineTo(pr.x, pr.y);
        ctx.stroke();
      }

      // 7. Luminous Telemetry Data Packets Racing along Tracks
      const NUM_PACKETS = 8;
      for (let k = 0; k < NUM_PACKETS; k++) {
        const uOffset = ((elapsed * 1.8 + k / NUM_PACKETS) % 1.0) * NUM_POINTS;
        const pIdx = Math.floor(uOffset) % NUM_POINTS;
        const pl = leftRail[pIdx];
        const pr = rightRail[pIdx];
        const cx = (pl.x + pr.x) / 2;
        const cy = (pl.y + pr.y) / 2;
        const isEmerald = k % 2 === 0;

        // Glowing packet
        const pGrad = ctx.createRadialGradient(cx, cy, 2, cx, cy, 18);
        pGrad.addColorStop(0, '#FFFFFF');
        pGrad.addColorStop(0.3, isEmerald ? '#00E599' : '#00C2FF');
        pGrad.addColorStop(1, 'transparent');

        ctx.fillStyle = pGrad;
        ctx.beginPath();
        ctx.arc(cx, cy, 18, 0, Math.PI * 2);
        ctx.fill();
      }

      // 8. Volumetric Laser Sweep Plane (2.0s - 4.2s)
      if (elapsed >= 2.0 && elapsed <= 4.2) {
        const laserProgress = (elapsed - 2.0) / 2.2;
        const laserX = -100 + laserProgress * (canvas.width + 200);

        const laserGrad = ctx.createLinearGradient(laserX - 50, 0, laserX + 50, 0);
        laserGrad.addColorStop(0, 'rgba(0, 229, 255, 0)');
        laserGrad.addColorStop(0.4, 'rgba(0, 229, 153, 0.25)');
        laserGrad.addColorStop(0.5, 'rgba(255, 255, 255, 0.95)');
        laserGrad.addColorStop(0.6, 'rgba(0, 229, 255, 0.25)');
        laserGrad.addColorStop(1, 'rgba(0, 229, 255, 0)');

        ctx.fillStyle = laserGrad;
        ctx.fillRect(laserX - 50, 0, 100, canvas.height);
      }

      // 9. Shockwave Ripple Pulse on Lock (elapsed >= 4.5s)
      if (elapsed >= 4.5) {
        const shockTime = elapsed - 4.5;
        const radius = shockTime * 350;
        const alpha = Math.max(0, 1.0 - shockTime / 2.2);

        if (alpha > 0) {
          ctx.strokeStyle = `rgba(0, 229, 153, ${alpha * 0.75})`;
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.ellipse(canvas.width / 2, canvas.height / 2 - 30, radius, radius * 0.5, 0, 0, Math.PI * 2);
          ctx.stroke();

          ctx.strokeStyle = `rgba(0, 229, 255, ${alpha * 0.5})`;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.ellipse(canvas.width / 2, canvas.height / 2 - 30, radius * 0.75, radius * 0.38, 0, 0, Math.PI * 2);
          ctx.stroke();
        }
      }

      // 10. Kinetic Typography Reveal (elapsed >= 3.8s)
      if (elapsed >= 3.8) {
        const textProgress = Math.min(1.0, (elapsed - 3.8) / 1.2);
        const textAlpha = textProgress;
        const textY = canvas.height - 130 + (1 - textProgress) * 30;

        ctx.textAlign = 'center';
        ctx.font = '900 38px system-ui, sans-serif';
        ctx.letterSpacing = '8px';

        // Glow
        ctx.shadowColor = 'rgba(0, 229, 153, 0.6)';
        ctx.shadowBlur = 24 * textProgress;
        ctx.fillStyle = `rgba(255, 255, 255, ${textAlpha})`;
        ctx.fillText('STOCKLY WMS', canvas.width / 2, textY);
        ctx.shadowBlur = 0;

        ctx.font = '600 14px system-ui, sans-serif';
        ctx.letterSpacing = '4px';
        ctx.fillStyle = `rgba(148, 163, 184, ${textAlpha * 0.85})`;
        ctx.fillText('THE REVOLUTION OF WAREHOUSE INTELLIGENCE', canvas.width / 2, textY + 32);
      }

      if (isPlaying) {
        animFrameIdRef.current = requestAnimationFrame(render);
      }
    };

    animFrameIdRef.current = requestAnimationFrame(render);

    return () => {
      if (animFrameIdRef.current) {
        cancelAnimationFrame(animFrameIdRef.current);
      }
    };
  }, [isPlaying, triggerAudioEffect]);

  const restartAnimation = () => {
    startTimeRef.current = Date.now();
    setIsPlaying(true);
  };

  return (
    <div style={{ position: 'relative', width: '100%', maxWidth: `${width}px`, margin: '0 auto', borderRadius: '16px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.12)', boxShadow: '0 25px 60px rgba(0,0,0,0.8)' }}>
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        style={{ width: '100%', height: 'auto', display: 'block', background: '#070D18' }}
      />
      {/* Player HUD Controls */}
      <div style={{ position: 'absolute', bottom: '16px', right: '20px', left: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(15,23,42,0.7)', backdropFilter: 'blur(12px)', padding: '10px 18px', borderRadius: '30px', border: '1px solid rgba(255,255,255,0.15)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            style={{ padding: '6px 14px', borderRadius: '20px', background: isPlaying ? 'rgba(0,229,153,0.2)' : 'rgba(255,255,255,0.1)', border: '1px solid #00E599', color: '#00E599', fontWeight: 700, fontSize: '13px', cursor: 'pointer' }}
          >
            {isPlaying ? '❚❚ إيقاف مؤقت' : '▶ تشغيل'}
          </button>
          <button
            onClick={restartAnimation}
            style={{ padding: '6px 14px', borderRadius: '20px', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.2)', color: '#FFFFFF', fontSize: '13px', cursor: 'pointer' }}
          >
            ↺ إعادة العرض من البداية
          </button>
          <button
            onClick={() => setIsMuted(!isMuted)}
            style={{ padding: '6px 12px', borderRadius: '20px', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.2)', color: '#FFFFFF', fontSize: '13px', cursor: 'pointer' }}
          >
            {isMuted ? '🔇 كتم' : '🔊 صوت'}
          </button>
        </div>
        <span style={{ fontSize: '12px', color: '#94A3B8', fontWeight: 600 }}>
          ⚡ محرك موشن جرافيك حقيقي 60 FPS (WebGL / Canvas)
        </span>
      </div>
    </div>
  );
}
