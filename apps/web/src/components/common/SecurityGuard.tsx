'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';

export default function SecurityGuard() {
  const { userData, user } = useAuth();
  const [isDevToolsDetected, setIsDevToolsDetected] = useState(false);

  // SuperAdmin exemption (Mohamed Helmy / Owner only) or localhost development/testing
  const isLocalhost = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
  const isSuperAdmin = 
    isLocalhost ||
    userData?.email?.toLowerCase() === 'mohamedalghala@gmail.com' ||
    userData?.email?.toLowerCase().startsWith('admin@calm.com') ||
    user?.email?.toLowerCase() === 'mohamedalghala@gmail.com';

  useEffect(() => {
    // If SuperAdmin or localhost, leave everything open for full development, testing and audit freedom
    if (isSuperAdmin) {
      setIsDevToolsDetected(false);
      return;
    }

    // 1. Disable Right-Click (Context Menu) Everywhere
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      return false;
    };

    // 2. Block Inspection Keyboard Shortcuts Unconditionally
    const handleKeyDown = (e: KeyboardEvent) => {
      // F12
      if (e.key === 'F12' || e.keyCode === 123) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }

      const isCtrlOrCmd = e.ctrlKey || e.metaKey;

      // Ctrl+Shift+I / Cmd+Opt+I (Inspect Element)
      if (isCtrlOrCmd && e.shiftKey && (e.key === 'I' || e.key === 'i' || e.keyCode === 73)) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }

      // Ctrl+Shift+J / Cmd+Opt+J (Console)
      if (isCtrlOrCmd && e.shiftKey && (e.key === 'J' || e.key === 'j' || e.keyCode === 74)) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }

      // Ctrl+Shift+C / Cmd+Opt+C (Inspect DOM element selector)
      if (isCtrlOrCmd && e.shiftKey && (e.key === 'C' || e.key === 'c' || e.keyCode === 67)) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }

      // Ctrl+U / Cmd+Opt+U (View Source)
      if (isCtrlOrCmd && (e.key === 'U' || e.key === 'u' || e.keyCode === 85)) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }

      // Ctrl+S / Cmd+S (Save page source)
      if (isCtrlOrCmd && (e.key === 'S' || e.key === 's' || e.keyCode === 83)) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }
    };

    // 3. Neutralize Console logging completely
    try {
      const noop = () => {};
      window.console.log = noop;
      window.console.debug = noop;
      window.console.info = noop;
      window.console.warn = noop;
      window.console.table = noop;
      window.console.dir = noop;
    } catch {}

    // 4. DevTools Detection: Dimension Threshold (Docked DevTools)
    const checkThreshold = () => {
      const threshold = 160;
      const widthDiff = window.outerWidth - window.innerWidth;
      const heightDiff = window.outerHeight - window.innerHeight;
      
      // If docked on side or bottom
      if (widthDiff > threshold || heightDiff > threshold) {
        setIsDevToolsDetected(true);
        try { window.console.clear(); } catch {}
      } else {
        setIsDevToolsDetected(false);
      }
    };

    // 5. Anti-DevTools Debugger Trap (Undocked / Detached DevTools)
    const intervalId = setInterval(() => {
      checkThreshold();
      
      const startTime = performance.now();
      // Debugger triggers only if DevTools is active
      try {
        (function() { return false; }['constructor']('debugger')());
      } catch {}
      const endTime = performance.now();
      
      if (endTime - startTime > 100) {
        setIsDevToolsDetected(true);
        try { window.console.clear(); } catch {}
      }
    }, 400);

    // Initial check
    checkThreshold();

    document.addEventListener('contextmenu', handleContextMenu, { capture: true });
    window.addEventListener('contextmenu', handleContextMenu, { capture: true });
    document.addEventListener('keydown', handleKeyDown, { capture: true });
    window.addEventListener('keydown', handleKeyDown, { capture: true });
    window.addEventListener('resize', checkThreshold);

    return () => {
      document.removeEventListener('contextmenu', handleContextMenu, { capture: true });
      window.removeEventListener('contextmenu', handleContextMenu, { capture: true });
      document.removeEventListener('keydown', handleKeyDown, { capture: true });
      window.removeEventListener('keydown', handleKeyDown, { capture: true });
      window.removeEventListener('resize', checkThreshold);
      clearInterval(intervalId);
    };
  }, [isSuperAdmin]);

  if (!isDevToolsDetected || isSuperAdmin) return null;

  // 🛡️ Security Lockdown Screen
  return (
    <div 
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 999999999,
        background: '#0B132B',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem',
        textAlign: 'center',
        color: '#ffffff',
        fontFamily: 'Cairo, system-ui, sans-serif'
      }}
    >
      <div style={{ fontSize: '4.5rem', marginBottom: '1.25rem' }}>⛔</div>
      <h1 style={{ color: '#EF4444', fontSize: '1.85rem', fontWeight: 800, marginBottom: '1rem', letterSpacing: '-0.5px' }}>
        تنبيه أمني صارم: محاولة فحص النظام محظورة!
      </h1>
      <p style={{ color: '#94A3B8', fontSize: '1.15rem', maxWidth: '620px', lineHeight: 1.7, marginBottom: '1.75rem' }}>
        تم رصد فتح أدوات المطورين (DevTools / Inspect Element). لحماية سرية وحصانة بيانات المخزون والحسابات، تم حجب الشاشة بالكامل وتجميد العمليات فوراً.
      </p>
      <div style={{ padding: '0.85rem 1.5rem', borderRadius: '10px', background: 'rgba(16, 185, 129, 0.12)', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
        <p style={{ margin: 0, color: '#10B981', fontSize: '1rem', fontWeight: 700 }}>
          💡 يرجى إغلاق شاشة الفحص (DevTools) وتحديث الصفحة (F5) لاستئناف العمل.
        </p>
      </div>
    </div>
  );
}
