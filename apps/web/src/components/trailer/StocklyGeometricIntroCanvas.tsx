'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';

interface Props {
  width?: number;
  height?: number;
  autoPlay?: boolean;
}

export default function StocklyGeometricIntroCanvas({
  width = 1280,
  height = 720,
  autoPlay = true,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(autoPlay);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration] = useState(8.0);
  const animFrameRef = useRef<number | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const emblemImgRef = useRef<HTMLImageElement | null>(null);

  // Load Mobius 3D Emblem
  useEffect(() => {
    const img = new Image();
    img.src = '/brand/mobius_s_3d.png';
    img.onload = () => {
      emblemImgRef.current = img;
    };
  }, []);

  // Easing Functions
  const easeOutBack = (t: number, c = 1.70158) => {
    if (t <= 0) return 0;
    if (t >= 1) return 1;
    t = t - 1;
    return t * t * ((c + 1) * t + c) + 1;
  };

  const easeOutElastic = (t: number) => {
    t = Math.max(0, Math.min(1, t));
    if (t === 0) return 0;
    if (t === 1) return 1;
    const p = 0.3;
    const s = p / 4;
    return Math.pow(2, -10 * t) * Math.sin(((t - s) * (2 * Math.PI)) / p) + 1;
  };

  // Geometry Setup (Scaled to width x height)
  const scale = width / 1920;
  const Y_TOP = 570 * scale;
  const Y_MID = 635 * scale;
  const Y_BOT = 700 * scale;
  const radius = 9 * scale;

  // Render Loop
  const renderFrame = useCallback((t: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Background
    ctx.fillStyle = '#070D18';
    ctx.fillRect(0, 0, width, height);

    // Grid Fade
    let gridAlpha = 1.0;
    if (t > 5.5) {
      gridAlpha = Math.max(0, 1 - (t - 5.5) / 1.2);
    }

    // 1. Kinetic Construction Grid
    if (gridAlpha > 0.01) {
      ctx.save();
      ctx.globalAlpha = gridAlpha;

      // Fine Background Grid
      ctx.strokeStyle = 'rgba(30, 41, 59, 0.4)';
      ctx.lineWidth = 1;
      const step = 40 * scale;
      for (let x = 0; x < width; x += step) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y < height; y += step) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      // Guide Rails
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.6)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(50 * scale, Y_TOP);
      ctx.lineTo(width - 50 * scale, Y_TOP);
      ctx.moveTo(50 * scale, Y_BOT);
      ctx.lineTo(width - 50 * scale, Y_BOT);
      ctx.stroke();

      // Middle dashed guide
      ctx.setLineDash([4, 4]);
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.35)';
      ctx.beginPath();
      ctx.moveTo(50 * scale, Y_MID);
      ctx.lineTo(width - 50 * scale, Y_MID);
      ctx.stroke();
      ctx.setLineDash([]);

      // Measurements & Markers
      ctx.fillStyle = 'rgba(0, 229, 255, 0.8)';
      ctx.font = `${Math.round(11 * scale)}px monospace`;
      ctx.fillText(`CAP-HEIGHT: ${Math.round(130 * scale)}px`, 60 * scale, Y_TOP - 8 * scale);
      ctx.fillText(`BASELINE: 0.00`, 60 * scale, Y_BOT + 16 * scale);
      ctx.fillText(`KINETIC GUIDE AXIS [CENTER: ${Math.round(width / 2)}]`, width / 2 - 90 * scale, 80 * scale);

      // Dimension Markers
      [380, 600, 820, 1040, 1260, 1480].forEach((xTick) => {
        const sx = xTick * scale;
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.3)';
        ctx.beginPath();
        ctx.moveTo(sx, Y_TOP - 10 * scale);
        ctx.lineTo(sx, Y_BOT + 10 * scale);
        ctx.stroke();
        ctx.fillStyle = 'rgba(0, 229, 153, 0.7)';
        ctx.fillText(`R=9 W=80`, sx + 4 * scale, Y_TOP - 6 * scale);
      });

      // 45 Degree Diagonal Guides
      const kX = 835 * scale;
      ctx.strokeStyle = 'rgba(245, 158, 11, 0.5)';
      ctx.beginPath();
      ctx.moveTo(kX, Y_MID);
      ctx.lineTo(kX + 60 * scale, Y_MID - 60 * scale);
      ctx.moveTo(kX, Y_MID);
      ctx.lineTo(kX + 60 * scale, Y_MID + 60 * scale);
      ctx.stroke();
      ctx.fillStyle = 'rgba(245, 158, 11, 0.8)';
      ctx.fillText('45.0°', kX + 40 * scale, Y_MID - 35 * scale);

      ctx.restore();
    }

    // Helper: Draw Capsule with Conveyor Rollers
    const drawCapsule = (
      x1: number,
      y1: number,
      x2: number,
      y2: number,
      r: number,
      color: string
    ) => {
      const dx = x2 - x1;
      const dy = y2 - y1;
      const dist = Math.hypot(dx, dy);
      if (dist < 1) return;

      const nx = (-dy / dist) * r;
      const ny = (dx / dist) * r;

      ctx.save();
      // Outer colored glow body
      ctx.fillStyle = color;
      ctx.shadowColor = color;
      ctx.shadowBlur = 12 * scale;
      ctx.beginPath();
      ctx.arc(x1, y1, r, Math.atan2(ny, nx), Math.atan2(-ny, -nx));
      ctx.arc(x2, y2, r, Math.atan2(-ny, -nx), Math.atan2(ny, nx));
      ctx.closePath();
      ctx.fill();

      // Inner white core
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#FFFFFF';
      const rCore = Math.max(1.5, r - 4 * scale);
      const nxC = (-dy / dist) * rCore;
      const nyC = (dx / dist) * rCore;
      ctx.beginPath();
      ctx.arc(x1, y1, rCore, Math.atan2(nyC, nxC), Math.atan2(-nyC, -nxC));
      ctx.arc(x2, y2, rCore, Math.atan2(-nyC, -nxC), Math.atan2(nyC, nxC));
      ctx.closePath();
      ctx.fill();

      // Conveyor Rollers (Micro Ticks)
      if (dist > 15 * scale) {
        ctx.strokeStyle = 'rgba(15, 23, 42, 0.7)';
        ctx.lineWidth = 1.5 * scale;
        const numRollers = Math.floor(dist / (12 * scale));
        for (let i = 0; i < numRollers; i++) {
          const frac = ((i / Math.max(1, numRollers) + t * 2.0) % 1.0);
          const rx = x1 + dx * frac;
          const ry = y1 + dy * frac;
          const tx = (-dy / dist) * (r - 2 * scale);
          const ty = (dx / dist) * (r - 2 * scale);
          ctx.beginPath();
          ctx.moveTo(rx - tx, ry - ty);
          ctx.lineTo(rx + tx, ry + ty);
          ctx.stroke();
        }
      }
      ctx.restore();
    };

    // 2. Letters Capsules Definitions (Scaled)
    const rawCapsules = [
      // S
      { target: [400, 570, 460, 570], color: '#00E5FF', delay: 0.00 },
      { target: [400, 570, 400, 635], color: '#2563EB', delay: 0.05 },
      { target: [400, 635, 460, 635], color: '#00E5FF', delay: 0.10 },
      { target: [460, 635, 460, 700], color: '#00E599', delay: 0.15 },
      { target: [460, 700, 400, 700], color: '#00E5FF', delay: 0.20 },
      // T
      { target: [490, 570, 570, 570], color: '#00E599', delay: 0.15 },
      { target: [530, 570, 530, 700], color: '#2563EB', delay: 0.22 },
      // O
      { target: [615, 570, 665, 570], color: '#F59E0B', delay: 0.25 },
      { target: [665, 570, 665, 700], color: '#00E5FF', delay: 0.30 },
      { target: [665, 700, 615, 700], color: '#F59E0B', delay: 0.35 },
      { target: [615, 700, 615, 570], color: '#00E5FF', delay: 0.40 },
      // C
      { target: [785, 570, 725, 570], color: '#00E5FF', delay: 0.35 },
      { target: [725, 570, 725, 700], color: '#2563EB', delay: 0.42 },
      { target: [725, 700, 785, 700], color: '#00E5FF', delay: 0.48 },
      // K
      { target: [835, 570, 835, 700], color: '#00E599', delay: 0.45 },
      { target: [835, 635, 895, 570], color: '#F59E0B', delay: 0.52 },
      { target: [835, 635, 895, 700], color: '#00E5FF', delay: 0.58 },
      // L
      { target: [945, 570, 945, 700], color: '#2563EB', delay: 0.55 },
      { target: [945, 700, 1005, 700], color: '#00E599', delay: 0.62 },
      // Y
      { target: [1050, 570, 1080, 635], color: '#F59E0B', delay: 0.65 },
      { target: [1110, 570, 1080, 635], color: '#00E5FF', delay: 0.70 },
      { target: [1080, 635, 1080, 700], color: '#2563EB', delay: 0.75 },
      // W
      { target: [1180, 570, 1200, 700], color: '#00E5FF', delay: 0.80 },
      { target: [1200, 700, 1225, 635], color: '#00E599', delay: 0.85 },
      { target: [1225, 635, 1250, 700], color: '#00E5FF', delay: 0.90 },
      { target: [1250, 700, 1270, 570], color: '#2563EB', delay: 0.95 },
      // M
      { target: [1305, 700, 1305, 570], color: '#F59E0B', delay: 0.90 },
      { target: [1305, 570, 1345, 635], color: '#00E5FF', delay: 0.95 },
      { target: [1345, 635, 1385, 570], color: '#00E599', delay: 1.00 },
      { target: [1385, 570, 1385, 700], color: '#00E5FF', delay: 1.05 },
      // S2
      { target: [1440, 570, 1500, 570], color: '#00E5FF', delay: 1.05 },
      { target: [1440, 570, 1440, 635], color: '#2563EB', delay: 1.10 },
      { target: [1440, 635, 1500, 635], color: '#00E599', delay: 1.15 },
      { target: [1500, 635, 1500, 700], color: '#F59E0B', delay: 1.20 },
      { target: [1500, 700, 1440, 700], color: '#00E5FF', delay: 1.25 },
    ];

    const numCaps = rawCapsules.length;
    rawCapsules.forEach((c, idx) => {
      const angle = (idx / numCaps) * 2 * Math.PI;
      const r1 = (60 + 40 * Math.sin(2 * angle)) * scale;
      const cx = (width / 2) + r1 * Math.cos(angle);
      const cy = (height * 0.45) + r1 * Math.sin(angle) * 0.7;
      const dx = Math.cos(angle + Math.PI / 2) * 30 * scale;
      const dy = Math.sin(angle + Math.PI / 2) * 30 * scale;

      const ox1 = cx - dx;
      const oy1 = cy - dy;
      const ox2 = cx + dx;
      const oy2 = cy + dy;

      const tx1 = c.target[0] * scale;
      const ty1 = c.target[1] * scale;
      const tx2 = c.target[2] * scale;
      const ty2 = c.target[3] * scale;

      // Interpolation with Easing
      const startT = 1.2 + c.delay * 1.5;
      const rawProg = (t - startT) / 1.8;
      const prog = easeOutBack(rawProg);

      const curX1 = ox1 + (tx1 - ox1) * prog;
      const curY1 = oy1 + (ty1 - oy1) * prog;
      const curX2 = ox2 + (tx2 - ox2) * prog;
      const curY2 = oy2 + (ty2 - oy2) * prog;

      // Draw connecting guide trajectory if flying
      if (rawProg > 0.05 && rawProg < 0.95 && gridAlpha > 0.1) {
        ctx.strokeStyle = `${c.color}33`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(ox1, oy1);
        ctx.lineTo(curX1, curY1);
        ctx.stroke();
      }

      drawCapsule(curX1, curY1, curX2, curY2, radius, c.color);
    });

    // 3. 3D Mobius S Hero Emblem Docking
    if (t >= 4.5 && emblemImgRef.current) {
      const emblemT = (t - 4.5) / 1.6;
      const emblemScale = 0.55 * easeOutElastic(emblemT) * scale;
      const img = emblemImgRef.current;
      const ew = img.width * emblemScale;
      const eh = img.height * emblemScale;
      const ex = width / 2 - ew / 2;
      const ey = 330 * scale - eh / 2;

      // Glow behind emblem
      ctx.save();
      const glowR = ew * 0.7;
      const grad = ctx.createRadialGradient(width / 2, 330 * scale, 0, width / 2, 330 * scale, glowR);
      grad.addColorStop(0, 'rgba(0, 229, 255, 0.35)');
      grad.addColorStop(1, 'rgba(0, 229, 255, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(width / 2, 330 * scale, glowR, 0, 2 * Math.PI);
      ctx.fill();

      ctx.drawImage(img, ex, ey, ew, eh);
      ctx.restore();
    }

    // 4. Anamorphic Starburst Sweep (5.8s to 7.4s)
    if (t >= 5.8 && t <= 7.4) {
      const flareProg = (t - 5.8) / 1.4;
      const flareX = (250 + (1670 - 250) * flareProg) * scale;
      const flareY = Y_MID;

      ctx.save();
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 2 * scale;
      ctx.shadowColor = '#00E5FF';
      ctx.shadowBlur = 18 * scale;
      ctx.beginPath();
      ctx.moveTo(flareX - 250 * scale, flareY);
      ctx.lineTo(flareX + 250 * scale, flareY);
      ctx.stroke();

      ctx.strokeStyle = 'rgba(0, 229, 255, 0.7)';
      ctx.lineWidth = 6 * scale;
      ctx.beginPath();
      ctx.moveTo(flareX - 350 * scale, flareY);
      ctx.lineTo(flareX + 350 * scale, flareY);
      ctx.stroke();

      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(flareX, flareY, 8 * scale, 0, 2 * Math.PI);
      ctx.fill();
      ctx.restore();
    }

    // 5. Subtitle
    if (t >= 6.0) {
      const subAlpha = Math.min(1, (t - 6.0) / 1.0);
      ctx.save();
      ctx.globalAlpha = subAlpha;
      ctx.fillStyle = '#CBD5E1';
      ctx.font = `800 ${Math.round(18 * scale)}px system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.letterSpacing = '4px';
      ctx.fillText('INTELLIGENT WAREHOUSE OPERATING SYSTEM', width / 2, Y_BOT + 46 * scale);
      ctx.restore();
    }
  }, [width, height, scale, Y_TOP, Y_MID, Y_BOT, radius]);

  // Animation Loop Handler
  useEffect(() => {
    if (!isPlaying) {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      return;
    }

    let start = performance.now() - currentTime * 1000;
    startTimeRef.current = start;

    const tick = (now: number) => {
      const elapsed = (now - start) / 1000;
      if (elapsed >= duration) {
        setCurrentTime(duration);
        setIsPlaying(false);
        renderFrame(duration);
        return;
      }
      setCurrentTime(elapsed);
      renderFrame(elapsed);
      animFrameRef.current = requestAnimationFrame(tick);
    };

    animFrameRef.current = requestAnimationFrame(tick);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isPlaying, duration, renderFrame]);

  // Initial draw
  useEffect(() => {
    renderFrame(currentTime);
  }, [currentTime, renderFrame]);

  const handleRestart = () => {
    setCurrentTime(0);
    setIsPlaying(true);
  };

  const handleScrub = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setCurrentTime(val);
    renderFrame(val);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'center' }}>
      <div
        style={{
          width,
          height,
          borderRadius: '16px',
          overflow: 'hidden',
          border: '1px solid rgba(0, 229, 255, 0.3)',
          boxShadow: '0 25px 60px rgba(0, 0, 0, 0.8)',
          background: '#070D18',
        }}
      >
        <canvas ref={canvasRef} width={width} height={height} style={{ display: 'block' }} />
      </div>

      {/* Control Bar */}
      <div
        style={{
          width,
          padding: '12px 20px',
          borderRadius: '12px',
          background: 'rgba(15, 23, 42, 0.9)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              background: isPlaying ? '#EF4444' : '#00E599',
              color: isPlaying ? '#FFFFFF' : '#070D18',
              border: 'none',
              fontWeight: 800,
              fontSize: '13px',
              cursor: 'pointer',
            }}
          >
            {isPlaying ? '⏸ إيقاف مؤقت' : '▶ تشغيل'}
          </button>

          <button
            onClick={handleRestart}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              background: 'rgba(255, 255, 255, 0.1)',
              color: '#F8FAFC',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              fontWeight: 600,
              fontSize: '13px',
              cursor: 'pointer',
            }}
          >
            ↺ إعادة العرض
          </button>
        </div>

        {/* Timeline Slider */}
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '12px', margin: '0 16px' }}>
          <span style={{ fontSize: '12px', color: '#94A3B8', fontFamily: 'monospace' }}>
            {currentTime.toFixed(1)}s
          </span>
          <input
            type="range"
            min="0"
            max={duration}
            step="0.05"
            value={currentTime}
            onChange={handleScrub}
            style={{ flex: 1, accentColor: '#00E599', cursor: 'pointer' }}
          />
          <span style={{ fontSize: '12px', color: '#94A3B8', fontFamily: 'monospace' }}>
            {duration.toFixed(1)}s
          </span>
        </div>

        <div style={{ fontSize: '12px', color: '#00E5FF', fontWeight: 700 }}>
          ⚡ 60 FPS GPU Canvas Engine
        </div>
      </div>
    </div>
  );
}
