'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Camera, 
  Zap, 
  RefreshCw, 
  Barcode, 
  QrCode, 
  CheckCircle2, 
  AlertCircle, 
  Keyboard 
} from 'lucide-react';

interface BarcodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (scannedCode: string) => void;
  title?: string;
  subtitle?: string;
}

export default function BarcodeScannerModal({
  isOpen,
  onClose,
  onScan,
  title = 'مسح الباركود و QR Code',
  subtitle = 'وجه الكاميرا نحو الباركود أو استخدم قارئ الباركود اليدوي'
}: BarcodeScannerModalProps) {
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [hasBarcodeDetector, setHasBarcodeDetector] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const [scannedFeedback, setScannedFeedback] = useState<string | null>(null);
  const [torchOn, setTorchOn] = useState(false);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanLoopRef = useRef<number | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Buffer for rapid hardware barcode scanner input (keyboard wedge)
  const hardwareBuffer = useRef<string>('');
  const lastKeyTime = useRef<number>(0);

  // Play audio beep via Web Audio API (100% offline, zero network)
  const playBeep = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(1200, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1800, ctx.currentTime + 0.08);

      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.08);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.08);
    } catch {
      // Audio might be blocked by browser policy until interaction
    }
  };

  const handleSuccessfulScan = (code: string) => {
    const trimmed = code.trim();
    if (!trimmed) return;

    playBeep();
    setScannedFeedback(trimmed);

    // Provide visual pulse before dispatching
    setTimeout(() => {
      onScan(trimmed);
      setScannedFeedback(null);
      onClose();
    }, 450);
  };

  // Hardware scanner listener (auto-detects high-speed wedge typing)
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const now = Date.now();
      const timeDiff = now - lastKeyTime.current;
      lastKeyTime.current = now;

      // When Enter is pressed
      if (e.key === 'Enter') {
        if (hardwareBuffer.current.length >= 3 && timeDiff < 100) {
          e.preventDefault();
          const code = hardwareBuffer.current;
          hardwareBuffer.current = '';
          handleSuccessfulScan(code);
        } else {
          hardwareBuffer.current = '';
        }
        return;
      }

      // Ignore non-printable keys
      if (e.key.length !== 1) return;

      // If characters arrive rapidly (< 60ms between keys), it's a barcode gun
      if (timeDiff < 60 || hardwareBuffer.current.length === 0) {
        hardwareBuffer.current += e.key;
      } else {
        // Reset buffer if human typing slow gap
        hardwareBuffer.current = e.key;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // Camera Management
  useEffect(() => {
    if (!isOpen) {
      stopCamera();
      return;
    }

    // Check BarcodeDetector support
    if (typeof window !== 'undefined' && 'BarcodeDetector' in window) {
      setHasBarcodeDetector(true);
    } else {
      setHasBarcodeDetector(false);
    }

    startCamera();

    // Focus manual input for convenience
    setTimeout(() => {
      inputRef.current?.focus();
    }, 200);

    return () => {
      stopCamera();
    };
  }, [isOpen, facingMode]);

  const startCamera = async () => {
    stopCamera();
    setCameraError(null);

    try {
      if (!navigator?.mediaDevices?.getUserMedia) {
        setCameraError('متصفحك لا يدعم الوصول للكاميرا');
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: facingMode },
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setCameraActive(true);
        startScanningLoop();
      }
    } catch (err: any) {
      console.warn('Camera access denied or unavailable:', err);
      setCameraActive(false);
      if (err.name === 'NotAllowedError') {
        setCameraError('يرجى منح إذن الوصول للكاميرا للمسح المباشر');
      } else {
        setCameraError('لم يتم العثور على كاميرا متصلة، يمكنك استخدام القارئ اليدوي أو كتابة الكود');
      }
    }
  };

  const stopCamera = () => {
    if (scanLoopRef.current) {
      cancelAnimationFrame(scanLoopRef.current);
      scanLoopRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
    setTorchOn(false);
  };

  const toggleTorch = async () => {
    if (!streamRef.current) return;
    const track = streamRef.current.getVideoTracks()[0];
    if (!track) return;

    try {
      const capabilities: any = track.getCapabilities?.() || {};
      if (capabilities.torch) {
        const next = !torchOn;
        await (track as any).applyConstraints({
          advanced: [{ torch: next }]
        });
        setTorchOn(next);
      }
    } catch (err) {
      console.warn('Torch not supported:', err);
    }
  };

  const toggleFacingMode = () => {
    setFacingMode(prev => (prev === 'environment' ? 'user' : 'environment'));
  };

  // Continuous Detection Loop via native BarcodeDetector
  const startScanningLoop = () => {
    if (!('BarcodeDetector' in window)) return;

    try {
      const barcodeDetector = new (window as any).BarcodeDetector({
        formats: ['code_128', 'code_39', 'ean_13', 'ean_8', 'qr_code', 'data_matrix', 'upc_a']
      });

      const detectFrame = async () => {
        if (!videoRef.current || videoRef.current.readyState < 2) {
          scanLoopRef.current = requestAnimationFrame(detectFrame);
          return;
        }

        try {
          const barcodes = await barcodeDetector.detect(videoRef.current);
          if (barcodes && barcodes.length > 0) {
            const rawValue = barcodes[0].rawValue;
            if (rawValue) {
              handleSuccessfulScan(rawValue);
              return; // Stop loop on detection
            }
          }
        } catch {
          // Ignore intermittent detection frame errors
        }

        scanLoopRef.current = requestAnimationFrame(detectFrame);
      };

      scanLoopRef.current = requestAnimationFrame(detectFrame);
    } catch (err) {
      console.warn('Failed to initialize BarcodeDetector:', err);
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualCode.trim()) {
      handleSuccessfulScan(manualCode.trim());
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="stockly-scanner-backdrop"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(2, 6, 23, 0.85)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
        animation: 'fadeIn 0.2s ease-out'
      }}
    >
      <div 
        className="stockly-scanner-card"
        style={{
          width: '100%',
          maxWidth: '520px',
          background: '#041c18',
          border: '1px solid rgba(0, 223, 143, 0.3)',
          borderRadius: '20px',
          overflow: 'hidden',
          boxShadow: '0 25px 50px -12px rgba(0, 223, 143, 0.15)',
          color: '#ffffff',
          fontFamily: "'Cairo', sans-serif",
          direction: 'rtl'
        }}
      >
        {/* Header */}
        <div 
          style={{
            padding: '1.25rem 1.5rem',
            borderBottom: '1px solid rgba(0, 223, 143, 0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'linear-gradient(180deg, rgba(0, 223, 143, 0.08) 0%, transparent 100%)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div 
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '12px',
                background: 'rgba(0, 223, 143, 0.15)',
                border: '1px solid rgba(0, 223, 143, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#00DF8F'
              }}
            >
              <Barcode size={22} />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#f8fafc' }}>
                {title}
              </h2>
              <p style={{ margin: 0, fontSize: '0.8rem', color: '#94a3b8' }}>
                {subtitle}
              </p>
            </div>
          </div>

          <button 
            type="button"
            onClick={onClose}
            style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '10px',
              padding: '6px',
              color: '#94a3b8',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s'
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Viewport Area */}
        <div style={{ padding: '1.25rem' }}>
          
          {/* Camera Viewfinder */}
          <div 
            style={{
              position: 'relative',
              width: '100%',
              height: '260px',
              borderRadius: '14px',
              overflow: 'hidden',
              background: '#02100d',
              border: '1.5px solid rgba(0, 223, 143, 0.25)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            {cameraActive ? (
              <>
                <video 
                  ref={videoRef}
                  playsInline
                  muted
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover'
                  }}
                />

                {/* Laser Scanning Line Animation */}
                <div 
                  className="stockly-scanner-laser"
                  style={{
                    position: 'absolute',
                    left: '10%',
                    right: '10%',
                    height: '2px',
                    background: '#00DF8F',
                    boxShadow: '0 0 12px #00DF8F, 0 0 20px #00DF8F',
                    animation: 'scannerLaser 2s cubic-bezier(0.4, 0, 0.2, 1) infinite'
                  }}
                />

                {/* Viewfinder Target Reticle */}
                <div 
                  style={{
                    position: 'absolute',
                    width: '180px',
                    height: '140px',
                    border: '2px dashed rgba(0, 223, 143, 0.6)',
                    borderRadius: '12px',
                    pointerEvents: 'none',
                    boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.35)'
                  }}
                />
              </>
            ) : (
              <div style={{ textAlign: 'center', padding: '1.5rem', color: '#94a3b8' }}>
                <Camera size={44} style={{ color: 'rgba(0, 223, 143, 0.4)', marginBottom: '0.75rem' }} />
                <p style={{ margin: '0 0 0.5rem', fontSize: '0.9rem', color: '#e2e8f0', fontWeight: 600 }}>
                  {cameraError || 'الكاميرا غير نشطة'}
                </p>
                <button
                  type="button"
                  onClick={startCamera}
                  style={{
                    background: 'rgba(0, 223, 143, 0.15)',
                    border: '1px solid #00DF8F',
                    color: '#00DF8F',
                    padding: '6px 14px',
                    borderRadius: '8px',
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <RefreshCw size={14} />
                  <span>إعادة تشغيل الكاميرا</span>
                </button>
              </div>
            )}

            {/* Quick Camera Controls Toolbar */}
            {cameraActive && (
              <div 
                style={{
                  position: 'absolute',
                  top: '10px',
                  right: '10px',
                  display: 'flex',
                  gap: '6px'
                }}
              >
                <button
                  type="button"
                  onClick={toggleTorch}
                  title="فلاش الكاميرا"
                  style={{
                    background: torchOn ? '#00DF8F' : 'rgba(0, 0, 0, 0.6)',
                    color: torchOn ? '#041c18' : '#ffffff',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '8px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <Zap size={16} />
                </button>
                <button
                  type="button"
                  onClick={toggleFacingMode}
                  title="تبديل الكاميرا"
                  style={{
                    background: 'rgba(0, 0, 0, 0.6)',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '8px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <RefreshCw size={16} />
                </button>
              </div>
            )}

            {/* Success Scan Feedback Overlay */}
            {scannedFeedback && (
              <div 
                style={{
                  position: 'absolute',
                  inset: 0,
                  background: 'rgba(0, 223, 143, 0.9)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#041c18',
                  animation: 'fadeIn 0.15s ease-out'
                }}
              >
                <CheckCircle2 size={48} strokeWidth={2.5} />
                <div style={{ fontWeight: 900, fontSize: '1.25rem', marginTop: '6px' }}>
                  تم المسح بنجاح!
                </div>
                <div style={{ fontFamily: 'monospace', fontSize: '1.1rem', fontWeight: 800 }}>
                  {scannedFeedback}
                </div>
              </div>
            )}
          </div>

          {/* Status info */}
          <div 
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              margin: '0.85rem 0 1.25rem',
              fontSize: '0.78rem',
              color: '#94a3b8'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span 
                style={{
                  display: 'inline-block',
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: cameraActive ? '#00DF8F' : '#f59e0b',
                  boxShadow: cameraActive ? '0 0 8px #00DF8F' : 'none'
                }}
              />
              <span>{cameraActive ? 'الكاميرا جاهزة للمسح الفوري' : 'جاهز للمسح عبر قارئ الباركود اليدوي'}</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#00DF8F' }}>
              <Keyboard size={13} />
              <span>دعم القارئ اللاسلكي USB مفعّل</span>
            </div>
          </div>

          {/* Manual Input Fallback */}
          <form onSubmit={handleManualSubmit}>
            <div style={{ display: 'flex', gap: '8px' }}>
              <div style={{ position: 'relative', flex: 1 }}>
                <input
                  ref={inputRef}
                  type="text"
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value)}
                  placeholder="أدخل كود الصنف أو الباركود يدوياً (مثال: STK-0012)"
                  style={{
                    width: '100%',
                    padding: '0.75rem 1rem',
                    background: '#02100d',
                    border: '1.5px solid rgba(0, 223, 143, 0.3)',
                    borderRadius: '10px',
                    color: '#ffffff',
                    fontSize: '0.9rem',
                    fontFamily: 'inherit',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <button
                type="submit"
                disabled={!manualCode.trim()}
                style={{
                  padding: '0 1.5rem',
                  background: manualCode.trim() ? '#00DF8F' : 'rgba(255, 255, 255, 0.1)',
                  color: manualCode.trim() ? '#041c18' : '#64748b',
                  border: 'none',
                  borderRadius: '10px',
                  fontWeight: 800,
                  fontSize: '0.9rem',
                  cursor: manualCode.trim() ? 'pointer' : 'not-allowed',
                  transition: 'all 0.2s',
                  whiteSpace: 'nowrap'
                }}
              >
                تأكيد الكود
              </button>
            </div>
          </form>

        </div>
      </div>

      <style jsx global>{`
        @keyframes scannerLaser {
          0% { top: 15%; opacity: 0.3; }
          50% { top: 85%; opacity: 1; }
          100% { top: 15%; opacity: 0.3; }
        }
      `}</style>
    </div>
  );
}
