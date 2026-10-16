'use client';
import BrandLoader from '@/components/common/BrandLoader';

import React, { useState, Suspense } from 'react';
import BrandLogo from '@/components/common/BrandLogo';
import { useRouter, useSearchParams } from 'next/navigation';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { auth, db, functions } from '@/lib/firebase';
import { Mail, Lock, ShieldCheck, Eye, EyeOff, Globe, KeyRound, CheckCircle2, AlertCircle, X } from 'lucide-react';
import Link from 'next/link';
import { useLanguage } from '@/contexts/LanguageContext';
import { ThemeToggle } from '@/components/ThemeToggle';

const ADMIN_EMAILS = [
  'mohamedalghala@gmail.com',
  'admin@calm.com'
];

function isSuperAdminEmail(email?: string | null): boolean {
  if (!email) return false;
  const cleanEmail = email.toLowerCase().trim();
  return ADMIN_EMAILS.includes(cleanEmail) || cleanEmail.startsWith('admin@');
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t, language, toggleLanguage } = useLanguage();
  const isRTL = language === 'ar';
  
  const isPending = searchParams.get('pending') === 'true';
  const isVerify = searchParams.get('verify') === 'true';
  
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [customSuccessMsg, setCustomSuccessMsg] = useState('');

  // OTP Password Reset Modal State
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [otpStep, setOtpStep] = useState<1 | 2>(1); // 1: request email, 2: enter code + new password
  const [otpEmail, setOtpEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [newOtpPassword, setNewOtpPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpError, setOtpError] = useState('');
  const [otpSuccess, setOtpSuccess] = useState('');

  const displaySuccessMsg = isVerify
    ? t('auth.accountCreatedVerify')
    : isPending
    ? t('auth.accountCreatedPending')
    : customSuccessMsg;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setCustomSuccessMsg('');
    
    const isAdmin = isSuperAdminEmail(formData.email);

    try {
      const userCredential = await signInWithEmailAndPassword(auth, formData.email, formData.password);
      const user = userCredential.user;
      
      // Check user status in Firestore
      const userDocRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userDocRef);
      
      let effectiveRole = 'user';
      let effectiveRoleClass = 'role-user';
      
      if (userDoc.exists()) {
        const userData = userDoc.data();
        
        if (!isAdmin && userData.role === 'pending') {
          await auth.signOut();
          setError(t('auth.accountPending'));
          return;
        } else if (!isAdmin && userData.role === 'blocked') {
          await auth.signOut();
          setError(t('auth.accountBlocked'));
          return;
        }
        
        effectiveRole = isAdmin ? 'admin' : (userData.role || 'user');
        effectiveRoleClass = isAdmin ? 'role-admin' : (userData.roleClass || 'role-user');
        
        if (isAdmin && (userData.role !== 'admin' || userData.status !== 'active')) {
          await setDoc(userDocRef, {
            role: 'admin',
            roleClass: 'role-admin',
            status: 'active'
          }, { merge: true });
        }
      } else {
        // No user document found -> auto create for admin or user
        effectiveRole = isAdmin ? 'admin' : 'user';
        effectiveRoleClass = isAdmin ? 'role-admin' : 'role-user';
        
        await setDoc(userDocRef, {
          uid: user.uid,
          name: user.displayName || (isAdmin ? 'Mohamed Helmy' : 'User'),
          email: user.email || formData.email,
          role: effectiveRole,
          roleClass: effectiveRoleClass,
          status: 'active',
          department: isAdmin ? 'الإدارة العليا' : 'عام',
          createdAt: Date.now()
        }, { merge: true });
      }
      
      // Set persistent 30-day cookies for middleware
      const maxAge = 60 * 60 * 24 * 30;
      document.cookie = `userRole=${effectiveRole}; path=/; max-age=${maxAge}; SameSite=Lax`;
      document.cookie = `roleClass=${effectiveRoleClass}; path=/; max-age=${maxAge}; SameSite=Lax`;
      
      if (typeof window !== 'undefined') {
        localStorage.setItem('calm_wms_user_role', effectiveRole);
      }
      
      router.push('/dashboard');
      
    } catch (err: any) {
      console.error(err);
      
      // If admin account does not exist in Auth emulator yet, auto-create and sign in
      if (isAdmin && (err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential')) {
        try {
          const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
          const user = userCredential.user;
          const userDocRef = doc(db, 'users', user.uid);
          await setDoc(userDocRef, {
            uid: user.uid,
            name: 'Mohamed Helmy',
            email: user.email || formData.email,
            role: 'admin',
            roleClass: 'role-admin',
            status: 'active',
            department: 'الإدارة العليا',
            createdAt: Date.now()
          }, { merge: true });
          
          const maxAge = 60 * 60 * 24 * 30;
          document.cookie = `userRole=admin; path=/; max-age=${maxAge}; SameSite=Lax`;
          document.cookie = `roleClass=role-admin; path=/; max-age=${maxAge}; SameSite=Lax`;
          if (typeof window !== 'undefined') {
            localStorage.setItem('calm_wms_user_role', 'admin');
          }
          router.push('/dashboard');
          return;
        } catch (createErr: any) {
          console.error("Admin auto-create fallback failed:", createErr);
        }
      }

      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        setError(t('auth.invalidCredentials'));
      } else {
        setError(t('auth.loginError'));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpEmail || !otpEmail.includes('@')) {
      setOtpError('يرجى كتابة بريد إلكتروني صحيح.');
      return;
    }

    setOtpLoading(true);
    setOtpError('');
    setOtpSuccess('');

    try {
      // 1. Send real OTP email via configured Gmail SMTP API
      const res = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: otpEmail })
      });
      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error || 'تعذر إرسال رمز التحقق');

      // Also trigger background Firebase reset link as secondary backup
      sendPasswordResetEmail(auth, otpEmail).catch(() => {});

      setOtpSuccess(resData.message || (language === 'ar' ? 'تم إرسال رمز التحقق (OTP) إلى بريدك بنجاح.' : 'OTP sent to your email.'));
      setOtpStep(2);
    } catch (apiErr: any) {
      console.warn('send-otp API error, trying Firebase direct link:', apiErr);
      try {
        await sendPasswordResetEmail(auth, otpEmail);
        setOtpSuccess(
          language === 'ar'
            ? 'تم إرسال رابط استعادة وتعيين كلمة المرور بنجاح إلى بريدك الإلكتروني! تفقد صندوق الوارد أو البريد غير الهام (Spam).'
            : 'Password reset link sent successfully to your email!'
        );
      } catch (firebaseErr: any) {
        setOtpError(
          firebaseErr.code === 'auth/user-not-found'
            ? (language === 'ar' ? 'هذا البريد الإلكتروني غير مسجل بالنظام.' : 'User not found.')
            : (apiErr.message || firebaseErr.message || 'تعذر إرسال الرمز. يرجى المحاولة ثانية.')
        );
      }
    } finally {
      setOtpLoading(false);
    }
  };

  const handleVerifyOtpAndReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpCode || otpCode.length < 6) {
      setOtpError('يرجى إدخال رمز التحقق المكون من 6 أرقام.');
      return;
    }
    if (!newOtpPassword || newOtpPassword.length < 6) {
      setOtpError('يجب ألا تقل كلمة المرور الجديدة عن 6 أحرف.');
      return;
    }

    setOtpLoading(true);
    setOtpError('');
    setOtpSuccess('');

    try {
      // 1. Try Next.js API Route
      const res = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: otpEmail, otp: otpCode, newPassword: newOtpPassword })
      });
      const resData = await res.json();

      if (!res.ok) {
        throw new Error(resData.error || 'رمز التحقق غير صحيح');
      }

      setFormData(prev => ({ ...prev, email: otpEmail, password: newOtpPassword }));
      setCustomSuccessMsg('تم استعادة كلمة المرور بنجاح. يمكنك الآن تسجيل الدخول مباشرة.');
      setShowOtpModal(false);
      setOtpStep(1);
      setOtpCode('');
      setNewOtpPassword('');
    } catch (apiErr: any) {
      // 2. Fallback to Cloud Function
      try {
        const verifyOtpFn = httpsCallable<{ email: string; otp: string; newPassword?: string }, { success: boolean; message: string }>(functions, 'verifyPasswordResetOtp');
        const res = await verifyOtpFn({
          email: otpEmail,
          otp: otpCode,
          newPassword: newOtpPassword
        });

        setFormData(prev => ({ ...prev, email: otpEmail, password: newOtpPassword }));
        setCustomSuccessMsg(res.data.message || 'تم استعادة كلمة المرور بنجاح. يمكنك الآن تسجيل الدخول مباشرة.');
        setShowOtpModal(false);
        setOtpStep(1);
        setOtpCode('');
        setNewOtpPassword('');
      } catch (fnErr: any) {
        console.error(fnErr);
        setOtpError(apiErr.message || fnErr.message || 'رمز التحقق غير صحيح أو منتهي الصلاحية.');
      }
    } finally {
      setOtpLoading(false);
    }
  };

  return (
    <div className="flex-center animate-fade-in auth-page-wrapper" style={{ width: '100%', minHeight: '100vh', padding: '1rem', position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
      {/* Top Floating Controls */}
      <div className="auth-top-controls" style={{ position: 'absolute', top: '1.25rem', [isRTL ? 'left' : 'right']: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem', zIndex: 50 }}>
        <span style={{ fontSize: '0.75rem', fontWeight: 800, background: '#099A7520', color: '#00DF8F', border: '1px solid #099A75', padding: '0.25rem 0.5rem', borderRadius: '10px' }}>
          v2.2 Live
        </span>
        <button
          onClick={toggleLanguage}
          className="btn-icon glass-panel"
          title={t('nav.switchLanguage')}
          style={{ padding: '0.4rem 0.65rem', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', gap: '0.35rem', border: '1px solid var(--border-light)', background: 'var(--bg-glass)', cursor: 'pointer', color: 'var(--text-secondary)' }}
        >
          <Globe size={16} />
          <span style={{ fontSize: '0.78rem', fontWeight: 700 }}>{language.toUpperCase()}</span>
        </button>
        <ThemeToggle />
      </div>

      <div className="glass-panel auth-card-container" style={{ width: '100%', maxWidth: '850px', display: 'flex', boxShadow: 'var(--shadow-lg)', borderRadius: 'var(--radius-xl)', overflow: 'hidden' }}>
        
        {/* Left Side: Information & Branding */}
        <div className="auth-branding-section" style={{ flex: '1', background: 'linear-gradient(135deg, var(--bg-secondary), var(--bg-primary))', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', position: 'relative' }}>
          
          {/* Logo Brand Element */}
          <div className="brand-logo-wrapper" style={{ marginBottom: '1.5rem' }}>
            <BrandLogo size="lg" showSubtitle={true} />
          </div>

          {/* Heading */}
          <h2 className="heading-lg auth-heading" style={{ marginBottom: '1rem', textAlign: 'center', fontWeight: 800, color: 'var(--text-primary)', lineHeight: '1.4' }}>
            {t('auth.welcomeBack')}
          </h2>

          {/* Secure Badge */}
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.45rem 1rem', background: 'rgba(9, 154, 117, 0.12)', borderRadius: '12px', border: '1px solid rgba(9, 154, 117, 0.3)', color: '#099A75' }}>
            <ShieldCheck size={18} />
            <span style={{ fontSize: '0.82rem', fontWeight: 700 }}>{t('auth.secureAuth')}</span>
          </div>

        </div>

        {/* Right Side: Form */}
        <div className="auth-form-section" style={{ flex: '1.2', background: 'var(--bg-glass)', width: '100%' }}>
          <h3 className="heading-md" style={{ marginBottom: '0.5rem' }}>{t('auth.loginTitle')}</h3>
          <p className="text-muted" style={{ marginBottom: '1.5rem' }}>{t('auth.loginSubtitle')}</p>
          
          {displaySuccessMsg && (
            <div style={{ padding: '0.85rem 1rem', background: 'var(--accent-success-glass)', color: 'var(--accent-success)', borderRadius: 'var(--radius-md)', marginBottom: '1.25rem', border: '1px solid rgba(16, 185, 129, 0.3)', fontSize: '0.9rem' }}>
              {displaySuccessMsg}
            </div>
          )}

          {error && (
            <div style={{ padding: '0.85rem 1rem', background: 'var(--accent-danger-glass)', color: 'var(--accent-danger)', borderRadius: 'var(--radius-md)', marginBottom: '1.25rem', border: '1px solid rgba(239, 68, 68, 0.3)', fontSize: '0.9rem' }}>
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', width: '100%' }}>
            
            {/* Email */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', width: '100%' }}>
              <label className="text-secondary" style={{ fontSize: '0.9rem', fontWeight: 600 }}>{t('auth.emailOrPhone')}</label>
              <div style={{ position: 'relative', width: '100%' }}>
                <Mail size={18} style={{ position: 'absolute', [isRTL ? 'right' : 'left']: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  type="email"
                  required
                  placeholder="name@company.com"
                  value={formData.email}
                  onChange={e => setFormData({...formData, email: e.target.value.trim()})}
                  style={{
                    width: '100%',
                    minHeight: '48px',
                    fontSize: '16px',
                    padding: '0.75rem 1rem',
                    paddingRight: isRTL ? '2.75rem' : '1rem',
                    paddingLeft: isRTL ? '1rem' : '2.75rem',
                    background: 'var(--bg-tertiary)',
                    border: '1px solid var(--border-light)',
                    borderRadius: 'var(--radius-md)',
                    color: 'var(--text-primary)',
                    outline: 'none',
                    textAlign: 'left'
                  }}
                  dir="ltr"
                />
              </div>
            </div>

            {/* Password */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <div className="flex-between">
                <label className="text-secondary" style={{ fontSize: '0.9rem', fontWeight: 500 }}>{t('auth.password')}</label>
                <button
                  type="button"
                  onClick={() => {
                    setOtpEmail(formData.email);
                    setOtpError('');
                    setOtpSuccess('');
                    setShowOtpModal(true);
                  }}
                  style={{ background: 'none', border: 'none', fontSize: '0.8rem', color: 'var(--accent-primary)', fontWeight: 600, cursor: 'pointer', padding: 0 }}
                >
                  {t('auth.forgotPassword')}
                </button>
              </div>
              <div style={{ position: 'relative' }}>
                <Lock size={18} style={{ position: 'absolute', [isRTL ? 'right' : 'left']: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={e => setFormData({...formData, password: e.target.value})}
                  style={{
                    width: '100%',
                    minHeight: '48px',
                    fontSize: '16px',
                    padding: '0.75rem 2.75rem',
                    paddingRight: isRTL ? '2.75rem' : '2.75rem',
                    paddingLeft: isRTL ? '2.75rem' : '2.75rem',
                    background: 'var(--bg-tertiary)',
                    border: '1px solid var(--border-light)',
                    borderRadius: 'var(--radius-md)',
                    color: 'var(--text-primary)',
                    outline: 'none',
                    textAlign: 'left'
                  }}
                  dir="ltr"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    [isRTL ? 'left' : 'right']: '1rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                    padding: 0
                  }}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading} className="btn btn-primary" style={{ width: '100%', minHeight: '48px', fontSize: '1rem', marginTop: '1rem', padding: '0.85rem 1rem', background: '#099A75', borderColor: '#099A75', color: '#ffffff', fontWeight: 800 }}>
              {loading ? t('auth.loggingIn') : t('auth.loginBtn')}
            </button>
            
            <p className="text-center text-muted" style={{ fontSize: '0.9rem', marginTop: '1rem' }}>
              {t('auth.noAccount')} <Link href="/register" style={{ color: 'var(--accent-primary)', fontWeight: 600 }}>{t('auth.registerNow')}</Link>
            </p>
          </form>
        </div>
      </div>

      <style jsx global>{`
        .auth-page-wrapper {
          padding-top: 4.5rem !important;
          padding-bottom: 2rem !important;
        }
        .auth-card-container {
          flex-direction: row;
        }
        .auth-branding-section {
          padding: 3rem 2.5rem;
        }
        .auth-form-section {
          padding: 3rem;
        }
        @media (max-width: 768px) {
          .auth-page-wrapper {
            padding: 3.5rem 0.75rem 2rem 0.75rem !important;
            justify-content: flex-start !important;
          }
          .auth-top-controls {
            top: 0.75rem !important;
            left: 0.75rem !important;
            right: 0.75rem !important;
            width: calc(100% - 1.5rem) !important;
            justify-content: space-between !important;
          }
          .auth-card-container {
            flex-direction: column !important;
            width: 100% !important;
            max-width: 100% !important;
            margin-top: 0.5rem !important;
            border-radius: var(--radius-lg) !important;
          }
          .auth-branding-section {
            padding: 1.5rem 1rem !important;
            border-bottom: 1px solid var(--border-light);
          }
          .brand-logo-wrapper {
            margin-bottom: 0.75rem !important;
          }
          .auth-heading {
            font-size: 1.25rem !important;
            margin-bottom: 0.5rem !important;
          }
          .auth-form-section {
            padding: 1.5rem 1rem !important;
            width: 100% !important;
          }
          .auth-form-section h3 {
            font-size: 1.25rem !important;
          }
          .auth-form-section p {
            margin-bottom: 1rem !important;
            font-size: 0.85rem !important;
          }
        }
      `}</style>

      {/* OTP Password Reset Modal */}
      {showOtpModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15, 23, 42, 0.75)', backdropFilter: 'blur(6px)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div className="glass-panel animate-scale-up" style={{ width: '100%', maxWidth: '480px', padding: '2rem', borderRadius: '16px', background: 'var(--bg-secondary)', border: '1px solid var(--border-light)', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)', position: 'relative' }}>
            
            {/* Close button */}
            <button
              onClick={() => setShowOtpModal(false)}
              style={{ position: 'absolute', top: '1.25rem', [isRTL ? 'left' : 'right']: '1.25rem', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
            >
              <X size={20} />
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
              <div style={{ padding: '0.6rem', borderRadius: '12px', background: 'rgba(9, 154, 117, 0.15)', color: '#099A75' }}>
                <KeyRound size={24} />
              </div>
              <div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)' }}>استعادة كلمة المرور عبر OTP</h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>رمز أمان يصل إلى بريدك الإلكتروني المعتمد</p>
              </div>
            </div>

            {otpError && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1rem', background: 'var(--accent-danger-glass)', color: 'var(--accent-danger)', borderRadius: '8px', fontSize: '0.85rem', marginBottom: '1rem', border: '1px solid rgba(239,68,68,0.3)' }}>
                <AlertCircle size={16} />
                <span>{otpError}</span>
              </div>
            )}

            {otpSuccess && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1rem', background: 'var(--accent-success-glass)', color: 'var(--accent-success)', borderRadius: '8px', fontSize: '0.85rem', marginBottom: '1rem', border: '1px solid rgba(16,185,129,0.3)' }}>
                <CheckCircle2 size={16} />
                <span>{otpSuccess}</span>
              </div>
            )}

            {otpStep === 1 ? (
              <form onSubmit={handleSendOtp} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>البريد الإلكتروني المسجل</label>
                  <input
                    type="email"
                    required
                    placeholder="user@thecalmeg.com أو user@gmail.com"
                    value={otpEmail}
                    onChange={e => setOtpEmail(e.target.value.trim())}
                    style={{ width: '100%', padding: '0.75rem 1rem', background: 'var(--bg-tertiary)', border: '1px solid var(--border-light)', borderRadius: '8px', color: 'var(--text-primary)', outline: 'none', textAlign: 'left' }}
                    dir="ltr"
                  />
                </div>

                <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                  <button
                    type="submit"
                    disabled={otpLoading}
                    className="btn btn-primary"
                    style={{ flex: 1, padding: '0.8rem', background: '#099A75', borderColor: '#099A75', color: '#fff', fontWeight: 700 }}
                  >
                    {otpLoading ? 'جارِ الإرسال...' : 'إرسال رمز التحقق OTP'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowOtpModal(false)}
                    className="btn"
                    style={{ padding: '0.8rem 1.25rem', border: '1px solid var(--border-light)', background: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}
                  >
                    إلغاء
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleVerifyOtpAndReset} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>رمز التحقق OTP (6 أرقام)</label>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    placeholder="123456"
                    value={otpCode}
                    onChange={e => setOtpCode(e.target.value.trim())}
                    style={{ width: '100%', padding: '0.75rem 1rem', background: 'var(--bg-tertiary)', border: '1px solid var(--border-light)', borderRadius: '8px', color: 'var(--text-primary)', outline: 'none', textAlign: 'center', letterSpacing: '6px', fontSize: '1.25rem', fontWeight: 900 }}
                    dir="ltr"
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>كلمة المرور الجديدة</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      required
                      placeholder="••••••••"
                      value={newOtpPassword}
                      onChange={e => setNewOtpPassword(e.target.value)}
                      style={{ width: '100%', padding: '0.75rem 2.5rem 0.75rem 1rem', background: 'var(--bg-tertiary)', border: '1px solid var(--border-light)', borderRadius: '8px', color: 'var(--text-primary)', outline: 'none', textAlign: 'left' }}
                      dir="ltr"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      style={{ position: 'absolute', [isRTL ? 'left' : 'right']: '0.75rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                    >
                      {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                  <button
                    type="submit"
                    disabled={otpLoading}
                    className="btn btn-primary"
                    style={{ flex: 1, padding: '0.8rem', background: '#099A75', borderColor: '#099A75', color: '#fff', fontWeight: 700 }}
                  >
                    {otpLoading ? 'جارِ التحقق والتحديث...' : 'تأكيد وحفظ كلمة المرور'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setOtpStep(1)}
                    className="btn"
                    style={{ padding: '0.8rem 1rem', border: '1px solid var(--border-light)', background: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}
                  >
                    إعادة إرسال
                  </button>
                </div>
              </form>
            )}

          </div>
        </div>
      )}

    </div>
  );
}

export default function LoginPage() {
  const { t } = useLanguage();
  return (
    <Suspense fallback={<div className="flex-center" style={{ minHeight: '80vh' }}>{t('common.loading')}</div>}>
      <LoginForm />
    </Suspense>
  );
}
