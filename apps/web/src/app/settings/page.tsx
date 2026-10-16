'use client';

import React, { useState, useEffect, useRef } from 'react';
import { EmailAuthProvider, reauthenticateWithCredential, updatePassword, updateProfile } from 'firebase/auth';
import { doc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { auth, db, storage } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { 
  Key, 
  Save, 
  ShieldCheck, 
  User, 
  Mail, 
  Phone, 
  Camera, 
  Trash2, 
  CheckCircle2, 
  Lock,
  Building2,
  BadgeCheck,
  BookOpen,
  Sparkles,
  HelpCircle,
  Layers,
  Boxes,
  Workflow,
  ArrowRight,
  Activity,
  AlertTriangle,
  FileText,
  Wrench,
  PackageCheck,
  ClipboardCheck,
  ArrowRightLeft,
  ShieldAlert,
  Cpu,
  ChevronDown,
  Check,
  Archive
} from 'lucide-react';

export default function SettingsPage() {
  const { userData } = useAuth();
  const { t, language } = useLanguage();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Navigation Tabs State (Profile vs System Guide)
  const [activeTab, setActiveTab] = useState<'PROFILE' | 'GUIDE'>('PROFILE');
  const [activeGuideSection, setActiveGuideSection] = useState<'LIFECYCLE' | 'PACKAGING' | 'HEALTH' | 'SIGNATURES'>('LIFECYCLE');

  // Profile Info State
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [photoURL, setPhotoURL] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewURL, setPreviewURL] = useState<string>('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileSuccessMsg, setProfileSuccessMsg] = useState(false);

  // Password State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loadingPassword, setLoadingPassword] = useState(false);
  const [passwordSuccessMsg, setPasswordSuccessMsg] = useState(false);

  // Sync initial user data
  useEffect(() => {
    if (userData) {
      setName(userData.name || '');
      setPhone(userData.phone || '');
      setPhotoURL(userData.photoURL || '');
      setPreviewURL(userData.photoURL || '');
    }
  }, [userData]);

  // Handle Photo File Selection
  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      const objectUrl = URL.createObjectURL(file);
      setPreviewURL(objectUrl);
    }
  };

  // Remove Photo
  const handleRemovePhoto = () => {
    setSelectedFile(null);
    setPreviewURL('');
    setPhotoURL('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Save Profile Changes
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    const user = auth.currentUser;
    if (!user) {
      alert(t('settings.accountNotFound'));
      return;
    }

    setSavingProfile(true);
    setProfileSuccessMsg(false);

    try {
      let finalPhotoURL = photoURL;

      // Upload file to Firebase Storage if a new file was chosen
      if (selectedFile) {
        try {
          const storageRef = ref(storage, `profile_pictures/${user.uid}_${Date.now()}`);
          await uploadBytes(storageRef, selectedFile);
          finalPhotoURL = await getDownloadURL(storageRef);
        } catch (storageErr) {
          console.warn("Storage upload fallback:", storageErr);
          // If storage is offline, convert to base64 data URL
          finalPhotoURL = previewURL;
        }
      } else if (!previewURL) {
        finalPhotoURL = '';
      }

      // 1. Update Auth Profile
      await updateProfile(user, {
        displayName: name,
        photoURL: finalPhotoURL || ''
      });

      // 2. Update Firestore User Document
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        name: name,
        phone: phone,
        photoURL: finalPhotoURL || ''
      });

      setPhotoURL(finalPhotoURL);
      setSelectedFile(null);
      setProfileSuccessMsg(true);
      setTimeout(() => setProfileSuccessMsg(false), 4000);
    } catch (err: any) {
      console.error("Error updating profile:", err);
      alert(t('settings.profileUpdateError') + err.message);
    } finally {
      setSavingProfile(false);
    }
  };

  // Password Strength Indicator Logic
  const getPasswordStrength = () => {
    let score = 0;
    if (newPassword.length > 7) score += 1;
    if (newPassword.length > 10) score += 1;
    if (/[A-Z]/.test(newPassword)) score += 1;
    if (/[0-9]/.test(newPassword)) score += 1;
    if (/[^A-Za-z0-9]/.test(newPassword)) score += 1;
    
    if (newPassword.length === 0) return { label: '', color: 'transparent', width: '0%' };
    if (score <= 2) return { label: t('settings.weak'), color: '#ef4444', width: '33%' };
    if (score === 3 || score === 4) return { label: t('settings.medium'), color: '#eab308', width: '66%' };
    return { label: t('settings.strong'), color: '#10b981', width: '100%' };
  };

  const strength = getPasswordStrength();

  // Handle Password Update
  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      alert(t('settings.passwordMismatch'));
      return;
    }
    if (newPassword.length < 6) {
      alert(t('settings.passwordTooShort'));
      return;
    }

    const user = auth.currentUser;
    if (!user || !user.email) {
      alert(t('settings.accountNotFound'));
      return;
    }

    setLoadingPassword(true);
    setPasswordSuccessMsg(false);
    try {
      // Re-authenticate
      const credential = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(user, credential);
      
      // Update Password
      await updatePassword(user, newPassword);
      
      setPasswordSuccessMsg(true);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setPasswordSuccessMsg(false), 4000);
    } catch (error: any) {
      console.error(error);
      if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        alert(t('settings.wrongCurrentPassword'));
      } else {
        alert(t('settings.updatePasswordError') + error.message);
      }
    } finally {
      setLoadingPassword(false);
    }
  };

  const getRoleBadgeLabel = (role?: string) => {
    switch (role) {
      case 'admin': return t('users.roleAdmin');
      case 'management': return t('users.roleManagement');
      case 'supervisor': return t('users.roleSupervisor');
      case 'user': return t('users.roleUser');
      default: return t('auth.accountPending');
    }
  };

  const getInitials = (n?: string) => {
    if (!n) return 'U';
    const parts = n.trim().split(' ');
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return parts[0].substring(0, 2).toUpperCase();
  };

  return (
    <div className="settings-page-container">
      
      {/* ──── HEADER ──── */}
      <header className="flex-between animate-fade-in" style={{ padding: '0 0 1.5rem 0', marginBottom: '1.75rem', flexWrap: 'wrap', gap: '1rem', borderBottom: '1px solid var(--border-light)' }}>
        <div>
          <h1 style={{ margin: '0 0 0.25rem 0', fontSize: '2rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.5px' }}>
            {t('settings.title')}
          </h1>
          <p className="text-secondary" style={{ fontSize: '0.95rem', margin: 0, fontWeight: 500 }}>
            {t('settings.subtitle')}
          </p>
        </div>
      </header>

      {/* ──── TABS NAVIGATION: PROFILE VS SYSTEM GUIDE ──── */}
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.75rem', borderBottom: '2px solid var(--border-light)', paddingBottom: '0.85rem', flexWrap: 'wrap' }}>
        <button
          type="button"
          onClick={() => setActiveTab('PROFILE')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.65rem',
            padding: '0.75rem 1.5rem',
            borderRadius: '12px',
            fontWeight: 800,
            fontSize: '0.95rem',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            background: activeTab === 'PROFILE' ? 'var(--accent-primary)' : 'var(--bg-secondary)',
            color: activeTab === 'PROFILE' ? '#ffffff' : 'var(--text-secondary)',
            border: activeTab === 'PROFILE' ? '1px solid var(--accent-primary)' : '1px solid var(--border-light)',
            boxShadow: activeTab === 'PROFILE' ? '0 4px 14px rgba(9, 154, 117, 0.35)' : 'none'
          }}
        >
          <User size={18} />
          <span>{language === 'ar' ? 'الملف الشخصي والأمان' : 'Profile & Security'}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('GUIDE')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.65rem',
            padding: '0.75rem 1.5rem',
            borderRadius: '12px',
            fontWeight: 800,
            fontSize: '0.95rem',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            background: activeTab === 'GUIDE' ? '#3b82f6' : 'var(--bg-secondary)',
            color: activeTab === 'GUIDE' ? '#ffffff' : 'var(--text-secondary)',
            border: activeTab === 'GUIDE' ? '1px solid #3b82f6' : '1px solid var(--border-light)',
            boxShadow: activeTab === 'GUIDE' ? '0 4px 14px rgba(59, 130, 246, 0.35)' : 'none'
          }}
        >
          <BookOpen size={18} />
          <span>{language === 'ar' ? 'دليل استخدام النظام والآلية الذكية' : 'System Guide & Architecture'}</span>
          <span style={{
            fontSize: '0.75rem',
            padding: '2px 8px',
            borderRadius: '8px',
            fontWeight: 800,
            background: activeTab === 'GUIDE' ? 'rgba(255, 255, 255, 0.25)' : 'rgba(59, 130, 246, 0.15)',
            color: activeTab === 'GUIDE' ? '#ffffff' : '#3b82f6'
          }}>
            تفاعلي ✨
          </span>
        </button>
      </div>

      {/* ──── TAB 1: PROFILE & ACCOUNT SETTINGS ──── */}
      {activeTab === 'PROFILE' && (
        <div className="settings-grid" style={{ display: 'grid', gap: '1.75rem' }}>
        
        {/* ──── 1. PROFILE & AVATAR EDITING PANEL ──── */}
        <div className="enterprise-card animate-fade-in delay-100" style={{ padding: '1.75rem', display: 'flex', flexDirection: 'column', height: '100%' }}>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.75rem' }}>
            <div style={{ padding: '0.55rem', background: 'rgba(9, 154, 117, 0.12)', borderRadius: '10px', color: '#099A75', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <User size={24} />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                {t('settings.accountInfo')}
              </h2>
            </div>
          </div>

          {/* Success Banner */}
          {profileSuccessMsg && (
            <div style={{ marginBottom: '1.25rem', padding: '0.85rem 1.25rem', borderRadius: '8px', background: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16, 185, 129, 0.4)', color: '#10b981', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600, fontSize: '0.9rem' }}>
              <CheckCircle2 size={18} />
              <span>{t('settings.profileUpdateSuccess')}</span>
            </div>
          )}

          <form onSubmit={handleSaveProfile} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', flex: 1, justifyContent: 'space-between' }}>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              
              {/* Profile Picture Upload Section */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', background: 'var(--bg-tertiary)', padding: '1.25rem', borderRadius: '12px', border: '1px solid var(--border-light)' }}>
                
                {/* Avatar Preview */}
                <div style={{ position: 'relative', width: '76px', height: '76px', borderRadius: '50%', flexShrink: 0, overflow: 'hidden', border: '3px solid var(--accent-primary)', background: 'var(--bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {previewURL ? (
                    <img 
                      src={previewURL} 
                      alt="Avatar" 
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                    />
                  ) : (
                    <span style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--accent-primary)' }}>
                      {getInitials(name || userData?.name)}
                    </span>
                  )}
                </div>

                {/* Upload & Action Buttons */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={handlePhotoSelect} 
                    accept="image/*" 
                    style={{ display: 'none' }} 
                  />
                  
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="btn btn-outline"
                      style={{ padding: '0.4rem 0.85rem', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '5px', fontWeight: 600 }}
                    >
                      <Camera size={14} />
                      <span>{t('settings.changePhoto')}</span>
                    </button>

                    {previewURL && (
                      <button
                        type="button"
                        onClick={handleRemovePhoto}
                        className="btn btn-outline"
                        style={{ padding: '0.4rem 0.85rem', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '5px', color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.4)', fontWeight: 600 }}
                      >
                        <Trash2 size={14} />
                        <span>{t('settings.removePhoto')}</span>
                      </button>
                    )}
                  </div>
                  
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    JPG, PNG, WebP (Max. 5MB)
                  </span>
                </div>

              </div>

              {/* Full Name Field */}
              <div className="form-group">
                <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.4rem', display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <User size={14} color="var(--accent-primary)" />
                  <span>{t('settings.name')}</span>
                </label>
                <input 
                  type="text" 
                  required
                  className="input-field" 
                  placeholder={t('settings.namePlaceholder')}
                  value={name}
                  onChange={e => setName(e.target.value)}
                  style={{ width: '100%', fontWeight: 600 }}
                />
              </div>

              {/* Phone Number Field */}
              <div className="form-group">
                <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.4rem', display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <Phone size={14} color="#3b82f6" />
                  <span>{t('settings.phone')}</span>
                </label>
                <input 
                  type="tel" 
                  className="input-field" 
                  placeholder={t('settings.phonePlaceholder')}
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  style={{ width: '100%', fontWeight: 600, direction: 'ltr', textAlign: language === 'ar' ? 'right' : 'left' }}
                />
              </div>

              {/* Email Address (Read-only) */}
              <div className="form-group">
                <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.4rem', display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <Mail size={14} color="var(--text-muted)" />
                  <span>{t('settings.email')}</span>
                </label>
                <input 
                  type="email" 
                  disabled 
                  className="input-field" 
                  value={userData?.email || ''}
                  style={{ width: '100%', opacity: 0.75, cursor: 'not-allowed', background: 'var(--bg-tertiary)' }}
                />
              </div>

              {/* Current Role Badge */}
              <div style={{ background: 'var(--bg-tertiary)', padding: '0.85rem 1.15rem', borderRadius: '10px', border: '1px solid var(--border-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.82rem', fontWeight: 600 }}>
                  {t('settings.currentRole')}
                </span>
                <span className={`badge role-${userData?.role}`} style={{ fontSize: '0.85rem', padding: '0.35rem 0.75rem' }}>
                  {getRoleBadgeLabel(userData?.role)}
                </span>
              </div>

            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid var(--border-light)' }}>
              <button 
                type="submit" 
                className="btn btn-primary" 
                disabled={savingProfile} 
                style={{ padding: '0.75rem 1.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700 }}
              >
                <Save size={18} /> 
                <span>{savingProfile ? t('settings.savingProfile') : t('settings.saveProfileBtn')}</span>
              </button>
            </div>

          </form>
        </div>

        {/* ──── 2. CHANGE PASSWORD & SECURITY PANEL ──── */}
        <div className="enterprise-card animate-fade-in delay-200" style={{ padding: '1.75rem', display: 'flex', flexDirection: 'column', height: '100%' }}>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.75rem' }}>
            <div style={{ padding: '0.55rem', background: 'rgba(59, 130, 246, 0.12)', borderRadius: '10px', color: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Lock size={24} />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                {t('settings.changePassword')}
              </h2>
            </div>
          </div>

          {/* Success Banner */}
          {passwordSuccessMsg && (
            <div style={{ marginBottom: '1.25rem', padding: '0.85rem 1.25rem', borderRadius: '8px', background: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16, 185, 129, 0.4)', color: '#10b981', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600, fontSize: '0.9rem' }}>
              <CheckCircle2 size={18} />
              <span>{t('settings.updateSuccess')}</span>
            </div>
          )}

          <form onSubmit={handleUpdatePassword} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', flex: 1, justifyContent: 'space-between' }}>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              
              {/* Current Password */}
              <div className="form-group">
                <label style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.4rem', display: 'block' }}>
                  {t('settings.currentPassword')}
                </label>
                <input 
                  type="password" 
                  required 
                  className="input-field" 
                  placeholder={t('settings.currentPasswordPlaceholder')}
                  value={currentPassword}
                  onChange={e => setCurrentPassword(e.target.value)}
                  style={{ width: '100%' }}
                />
              </div>
              
              {/* New Password */}
              <div className="form-group">
                <label style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.4rem', display: 'block' }}>
                  {t('settings.newPassword')}
                </label>
                <input 
                  type="password" 
                  required 
                  className="input-field" 
                  placeholder={t('settings.newPasswordPlaceholder')}
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  style={{ width: '100%' }}
                />
                
                {/* Strength Indicator */}
                {newPassword.length > 0 && (
                  <div style={{ marginTop: '0.6rem' }}>
                    <div style={{ height: '6px', background: 'var(--bg-tertiary)', borderRadius: '3px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: strength.width, background: strength.color, transition: 'all 0.3s' }}></div>
                    </div>
                    <div style={{ fontSize: '0.8rem', color: strength.color, marginTop: '0.35rem', fontWeight: 600 }}>
                      {strength.label}
                    </div>
                  </div>
                )}
              </div>

              {/* Confirm Password */}
              <div className="form-group">
                <label style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.4rem', display: 'block' }}>
                  {t('settings.confirmPassword')}
                </label>
                <input 
                  type="password" 
                  required 
                  className="input-field" 
                  placeholder={t('settings.confirmPasswordPlaceholder')}
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  style={{ width: '100%' }}
                />
              </div>

            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid var(--border-light)' }}>
              <button 
                type="submit" 
                className="btn btn-primary" 
                disabled={loadingPassword} 
                style={{ padding: '0.75rem 1.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700 }}
              >
                <Save size={18} /> 
                <span>{loadingPassword ? t('settings.updating') : t('settings.updatePasswordBtn')}</span>
              </button>
            </div>

          </form>
        </div>

      </div>
      )}

      {/* ──── TAB 2: INTERACTIVE LUXURY SYSTEM GUIDE & ARCHITECTURE ──── */}
      {activeTab === 'GUIDE' && (
        <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* Executive Hero Banner */}
          <div 
            className="enterprise-card"
            style={{
              padding: '1.75rem 2rem',
              borderRadius: '16px',
              background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.12) 0%, rgba(9, 154, 117, 0.08) 100%)',
              border: '1px solid rgba(59, 130, 246, 0.3)',
              position: 'relative',
              overflow: 'hidden'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 12px', borderRadius: '20px', background: 'rgba(0, 223, 143, 0.2)', color: '#00DF8F', fontSize: '0.78rem', fontWeight: 800, marginBottom: '0.65rem' }}>
                  <Sparkles size={14} /> Stockly WMS • دليل التشغيل الشامل
                </div>
                <h2 style={{ margin: '0 0 0.5rem 0', fontSize: '1.5rem', fontWeight: 900, color: 'var(--text-primary)' }}>
                  دليل الاستخدام والآلية الهندسية لإدارة المخازن
                </h2>
                <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-secondary)', maxWidth: '750px', lineHeight: 1.6 }}>
                  شرح تفصيلي لدورة حركة المواد وسلاسل الإمداد وإدارة المستودعات، ومنطق الحزم واللفات الذكية، وآلية احتساب العجز الحرج، وحوكمة اعتمادات اللجان الرسمية بنظام الباركود.
                </p>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                <span style={{ padding: '6px 14px', borderRadius: '8px', background: 'var(--bg-secondary)', border: '1px solid var(--border-light)', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)' }}>
                  🏢 ستون رزيدنس
                </span>
                <span style={{ padding: '6px 14px', borderRadius: '8px', background: 'var(--bg-secondary)', border: '1px solid var(--border-light)', fontSize: '0.8rem', fontWeight: 700, color: 'var(--accent-primary)' }}>
                  ⚡ شركة ذا كالم
                </span>
              </div>
            </div>
          </div>

          {/* Guide Sub-Sections Switcher */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem' }}>
            <button
              type="button"
              onClick={() => setActiveGuideSection('LIFECYCLE')}
              style={{
                padding: '0.85rem 1rem',
                borderRadius: '12px',
                border: activeGuideSection === 'LIFECYCLE' ? '2px solid #099A75' : '1px solid var(--border-light)',
                background: activeGuideSection === 'LIFECYCLE' ? 'rgba(9, 154, 117, 0.12)' : 'var(--bg-secondary)',
                color: activeGuideSection === 'LIFECYCLE' ? 'var(--accent-primary)' : 'var(--text-secondary)',
                fontWeight: 800,
                fontSize: '0.88rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                justifyContent: 'center',
                transition: 'all 0.2s'
              }}
            >
              <Workflow size={17} />
              <span>1. دورة الحركة المخزنية</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveGuideSection('PACKAGING')}
              style={{
                padding: '0.85rem 1rem',
                borderRadius: '12px',
                border: activeGuideSection === 'PACKAGING' ? '2px solid #3b82f6' : '1px solid var(--border-light)',
                background: activeGuideSection === 'PACKAGING' ? 'rgba(59, 130, 246, 0.12)' : 'var(--bg-secondary)',
                color: activeGuideSection === 'PACKAGING' ? '#3b82f6' : 'var(--text-secondary)',
                fontWeight: 800,
                fontSize: '0.88rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                justifyContent: 'center',
                transition: 'all 0.2s'
              }}
            >
              <Boxes size={17} />
              <span>2. الحزم واللفات الذكية</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveGuideSection('HEALTH')}
              style={{
                padding: '0.85rem 1rem',
                borderRadius: '12px',
                border: activeGuideSection === 'HEALTH' ? '2px solid #ea580c' : '1px solid var(--border-light)',
                background: activeGuideSection === 'HEALTH' ? 'rgba(234, 88, 12, 0.12)' : 'var(--bg-secondary)',
                color: activeGuideSection === 'HEALTH' ? '#ea580c' : 'var(--text-secondary)',
                fontWeight: 800,
                fontSize: '0.88rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                justifyContent: 'center',
                transition: 'all 0.2s'
              }}
            >
              <ShieldAlert size={17} />
              <span>3. تقييم المخاطر والعجز</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveGuideSection('SIGNATURES')}
              style={{
                padding: '0.85rem 1rem',
                borderRadius: '12px',
                border: activeGuideSection === 'SIGNATURES' ? '2px solid #8b5cf6' : '1px solid var(--border-light)',
                background: activeGuideSection === 'SIGNATURES' ? 'rgba(139, 92, 246, 0.12)' : 'var(--bg-secondary)',
                color: activeGuideSection === 'SIGNATURES' ? '#8b5cf6' : 'var(--text-secondary)',
                fontWeight: 800,
                fontSize: '0.88rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                justifyContent: 'center',
                transition: 'all 0.2s'
              }}
            >
              <ClipboardCheck size={17} />
              <span>4. حوكمة اللجان والتوقيعات</span>
            </button>
          </div>

          {/* ──── SECTION 1: SUPPLY CHAIN LIFECYCLE ──── */}
          {activeGuideSection === 'LIFECYCLE' && (
            <div className="enterprise-card animate-fade-in" style={{ padding: '1.75rem' }}>
              <h3 style={{ margin: '0 0 1.25rem 0', fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Workflow size={20} color="#099A75" />
                دورة حياة الحركة المخزنية (5 مراحل تشغيلية متتابعة)
              </h3>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
                
                {/* Step 1 */}
                <div style={{ padding: '1.25rem', borderRadius: '12px', background: 'var(--bg-secondary)', border: '1px solid var(--border-light)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                    <span style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#0284c7', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.85rem' }}>1</span>
                    <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#0284c7' }}>الفحص الفني والاستلام</h4>
                  </div>
                  <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                    عند وصول التوريدات لموقع ستون رزيدنس، تقوم اللجنة الفنية بمعاينة البنود، اختبار العينات، وتوليد <strong>محضر الفحص الفني المعتمد</strong> للتأكد من خلو الأصناف من العيوب ومطابقتها لأمر التوريد.
                  </p>
                </div>

                {/* Step 2 */}
                <div style={{ padding: '1.25rem', borderRadius: '12px', background: 'var(--bg-secondary)', border: '1px solid var(--border-light)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                    <span style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#10b981', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.85rem' }}>2</span>
                    <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#10b981' }}>الإضافة المخزنية السحابية</h4>
                  </div>
                  <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                    يقوم أمين المخزن بإصدار <strong>إذن إضافة رسمي</strong> موثق بالرقم والتاريخ واسم المورد. يتم ربط الحركة بكود الصنف الموحد لتحديث الرصيد الحي فورياً في قواعد بيانات Firestore.
                  </p>
                </div>

                {/* Step 3 */}
                <div style={{ padding: '1.25rem', borderRadius: '12px', background: 'var(--bg-secondary)', border: '1px solid var(--border-light)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                    <span style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#f59e0b', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.85rem' }}>3</span>
                    <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#f59e0b' }}>طلب المواد الإلكتروني</h4>
                  </div>
                  <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                    يقدم فنيو ومشاريع الأقسام طلب صرف مواد عبر التطبيق. يمر الطلب بسلسلة موافقات إلكترونية (طلب قيد المراجعة $\leftarrow$ اعتماد المشرف $\leftarrow$ اعتماد مدير المشروع) قبل التوجه لصرفها.
                  </p>
                </div>

                {/* Step 4 */}
                <div style={{ padding: '1.25rem', borderRadius: '12px', background: 'var(--bg-secondary)', border: '1px solid var(--border-light)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                    <span style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#8b5cf6', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.85rem' }}>4</span>
                    <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#8b5cf6' }}>الصرف والتشغيل الميداني</h4>
                  </div>
                  <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                    صرف الخامات وتوثيق <strong>إذن الصرف</strong> وجهة الصرف المحددة (الصيانة لاين، ري خاص، مسطحات مائية...). يُخصم الرصيد تلقائياً ويتم إرسال إشعار لحظي باكتمال الصرف.
                  </p>
                </div>

                {/* Step 5 */}
                <div style={{ padding: '1.25rem', borderRadius: '12px', background: 'var(--bg-secondary)', border: '1px solid var(--border-light)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                    <span style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#ec4899', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.85rem' }}>5</span>
                    <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#ec4899' }}>التصفية وإنهاء الأعمال</h4>
                  </div>
                  <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                    إغلاق أمر الشغل عبر <strong>محضر إنهاء وتسوية الخامات</strong>، حصر ما تم تركيبه فعلياً بالموقع، واسترجاع الخامات الفائضة أو تسوية التوالف لإبقاء الرصيد مطابقاً 100%.
                  </p>
                </div>

              </div>
            </div>
          )}

          {/* ──── SECTION 2: SMART PACKAGING ENGINE ──── */}
          {activeGuideSection === 'PACKAGING' && (
            <div className="enterprise-card animate-fade-in" style={{ padding: '1.75rem' }}>
              <h3 style={{ margin: '0 0 1.25rem 0', fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Boxes size={20} color="#3b82f6" />
                محرك الحزم والأعواد واللفات القياسية (Smart Packaging Engine)
              </h3>

              <div style={{ padding: '1rem 1.25rem', borderRadius: '12px', background: 'rgba(59, 130, 246, 0.08)', border: '1px solid rgba(59, 130, 246, 0.3)', marginBottom: '1.5rem', fontSize: '0.88rem', color: 'var(--text-primary)', lineHeight: 1.6 }}>
                💡 <strong>فلسفة النظام:</strong> يتم الصرف والإضافة بالمتر الفعلي العادي دون أي قيود، ولكن النظام يقوم رياضياً بتجميع الأمتار تلقائياً في صورة <strong>حزم مكتملة (أعواد ولفات)</strong> ليعكس الرصيد الحجم الفعلي على أرفف المخزن بدلاً من الأعداد الرقمية الضخمة المجردة.
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
                
                {/* Komar */}
                <div style={{ padding: '1.25rem', borderRadius: '12px', background: 'var(--bg-secondary)', border: '1px solid var(--border-light)' }}>
                  <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#3b82f6', marginBottom: '4px' }}>أدوات سباكة وشبكات</div>
                  <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary)' }}>مواسير كومر (Komar)</h4>
                  <div style={{ padding: '6px 12px', borderRadius: '6px', background: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6', fontWeight: 800, fontSize: '0.82rem', marginBottom: '0.75rem', display: 'inline-block' }}>
                    القاعدة: كل 6 متر = 1 عود كامل
                  </div>
                  <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
                    مثال حي: رصيد ماسورة 32 مم كومر (120 متر) يُحسب في لوحة التحكم كـ <strong>20 عود مكتمل</strong> (انكماش بمقدار 100 وحدة من العداد العام).
                  </p>
                </div>

                {/* Poly PPR */}
                <div style={{ padding: '1.25rem', borderRadius: '12px', background: 'var(--bg-secondary)', border: '1px solid var(--border-light)' }}>
                  <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#10b981', marginBottom: '4px' }}>أدوات سباكة وشبكات</div>
                  <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary)' }}>مواسير بولي بروبلين (PPR)</h4>
                  <div style={{ padding: '6px 12px', borderRadius: '6px', background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', fontWeight: 800, fontSize: '0.82rem', marginBottom: '0.75rem', display: 'inline-block' }}>
                    القاعدة: كل 4 متر = 1 عود كامل
                  </div>
                  <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
                    مثال حي: رصيد ماسورة 32 مم بولي (27 متر) يُحسب كـ <strong>6 أعواد مكتملة + 3 متر كسر قيد الاستهلاك</strong>.
                  </p>
                </div>

                {/* Castle */}
                <div style={{ padding: '1.25rem', borderRadius: '12px', background: 'var(--bg-secondary)', border: '1px solid var(--border-light)' }}>
                  <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#f59e0b', marginBottom: '4px' }}>أدوات سباكة وشبكات</div>
                  <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary)' }}>مواسير كاسل (Castle)</h4>
                  <div style={{ padding: '6px 12px', borderRadius: '6px', background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', fontWeight: 800, fontSize: '0.82rem', marginBottom: '0.75rem', display: 'inline-block' }}>
                    القاعدة: كل 3 متر = 1 عود كامل
                  </div>
                  <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
                    مواسير كاسل تصنع وتورد بطول 3 أمتار للعود الواحد، ويتم تجميع أمتارها وفق مضاعفات الـ 3 أمتار.
                  </p>
                </div>

                {/* Wires */}
                <div style={{ padding: '1.25rem', borderRadius: '12px', background: 'var(--bg-secondary)', border: '1px solid var(--border-light)' }}>
                  <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#8b5cf6', marginBottom: '4px' }}>أدوات كهربائية</div>
                  <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary)' }}>أسلاك وكابلات (ترمو وسويدي)</h4>
                  <div style={{ padding: '6px 12px', borderRadius: '6px', background: 'rgba(139, 92, 246, 0.15)', color: '#8b5cf6', fontWeight: 800, fontSize: '0.82rem', marginBottom: '0.75rem', display: 'inline-block' }}>
                    القاعدة: كل 100 متر = 1 لفة كاملة
                  </div>
                  <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
                    مثال حي: رصيد سلك ترمو 3*3 (200 متر) يُحسب كـ <strong>2 لفة مكتملة</strong> (انكماش بمقدار 198 وحدة!).
                  </p>
                </div>

                {/* Irrigation Hoses */}
                <div style={{ padding: '1.25rem', borderRadius: '12px', background: 'var(--bg-secondary)', border: '1px solid var(--border-light)' }}>
                  <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#06b6d4', marginBottom: '4px' }}>خامات وشبكات الري</div>
                  <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary)' }}>خراطيم ري سادة 400م</h4>
                  <div style={{ padding: '6px 12px', borderRadius: '6px', background: 'rgba(0, 182, 212, 0.15)', color: '#06b6d4', fontWeight: 800, fontSize: '0.82rem', marginBottom: '0.75rem', display: 'inline-block' }}>
                    القاعدة: كل 400 متر = 1 لفة كاملة
                  </div>
                  <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
                    فقط خراطيم الري السادة الـ 400 متر هي التي تحتسب لفتها 400م، وباقي الخراطيم تظل بحساباتها الفردية.
                  </p>
                </div>

                {/* Bags & Packaging */}
                <div style={{ padding: '1.25rem', borderRadius: '12px', background: 'var(--bg-secondary)', border: '1px solid var(--border-light)' }}>
                  <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#ec4899', marginBottom: '4px' }}>لوازم ومستهلكات</div>
                  <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary)' }}>لوازم الري 16 مم (أكياس 50 قطعة)</h4>
                  <div style={{ padding: '6px 12px', borderRadius: '6px', background: 'rgba(236, 72, 153, 0.15)', color: '#ec4899', fontWeight: 800, fontSize: '0.82rem', marginBottom: '0.75rem', display: 'inline-block' }}>
                    القاعدة: كل 50 قطعة = 1 كيس
                  </div>
                  <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
                    التيات والكيعان والوصل 16 مم حُوّلت لأكياس (109 كيس حالياً بدلاً من 5,463 قطعة) مما وفّر 5,354 وحدة بالمخزن.
                  </p>
                </div>

              </div>
            </div>
          )}

          {/* ──── SECTION 3: RISK & HEALTH LOGIC ──── */}
          {activeGuideSection === 'HEALTH' && (
            <div className="enterprise-card animate-fade-in" style={{ padding: '1.75rem' }}>
              <h3 style={{ margin: '0 0 1.25rem 0', fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <ShieldAlert size={20} color="#ea580c" />
                محرك تحليل المخاطر والعجز الحرج والركود (FSN Analytics)
              </h3>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
                
                <div style={{ padding: '1.25rem', borderRadius: '12px', background: 'rgba(234, 88, 12, 0.08)', border: '1px solid rgba(234, 88, 12, 0.3)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    <AlertTriangle size={18} color="#ea580c" />
                    <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#ea580c' }}>العجز الحرج (Critical Low)</h4>
                  </div>
                  <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                    <strong>المعيار:</strong> الصنف الذي يقل رصيده عن حد الأمان (10 وحدات أو أقل) <strong>وله طلب نشط ومستمر</strong> (سحب خلال آخر 60-90 يوماً). هذا هو الخطر التشغيلي الأهم الذي يتطلب أمر شراء فوري.
                  </p>
                </div>

                <div style={{ padding: '1.25rem', borderRadius: '12px', background: 'rgba(59, 130, 246, 0.08)', border: '1px solid rgba(59, 130, 246, 0.3)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    <Archive size={18} color="#3b82f6" />
                    <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#3b82f6' }}>المخزون الراكد (Stagnant Stock)</h4>
                  </div>
                  <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                    <strong>المعيار:</strong> صنف له رصيد إيجابي بالمخزن لكنه <strong>لم يشهد حركة سحب واحدة منذ أكثر من 90 يوماً</strong>. يبرزه السيستم لترشيد الشراء وتدوير الخامات في مواقع أخرى.
                  </p>
                </div>

                <div style={{ padding: '1.25rem', borderRadius: '12px', background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    <ShieldCheck size={18} color="#10b981" />
                    <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#10b981' }}>الأصول الثابتة المعزولة (41 صنفاً)</h4>
                  </div>
                  <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                    <strong>المعيار:</strong> مواتير المياه، الكمبروسرات، الشاشات، أجهزة الـ IT، الأثاث المكتبي. يتم عزلها برمجياً عن تقارير النقص والعجز لأن توريدها استراتيجي بالطلب ولا يُعامل كمستهلكات.
                  </p>
                </div>

              </div>
            </div>
          )}

          {/* ──── SECTION 4: COMMITTEE SIGNATURES & GOVERNANCE ──── */}
          {activeGuideSection === 'SIGNATURES' && (
            <div className="enterprise-card animate-fade-in" style={{ padding: '1.75rem' }}>
              <h3 style={{ margin: '0 0 1.25rem 0', fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <ClipboardCheck size={20} color="#8b5cf6" />
                حوكمة التقارير واعتمادات اللجان الرسمية الثلاثية
              </h3>

              <div style={{ padding: '1.25rem', borderRadius: '12px', background: 'var(--bg-secondary)', border: '1px solid var(--border-light)', marginBottom: '1.5rem' }}>
                <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                  الديباجة الرسمية المعتمدة في كافة تقارير ومحاضر المشروع (A4 Print Standard):
                </h4>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '1rem', background: 'var(--bg-primary)', borderRadius: '8px', border: '1px dashed var(--border-light)', fontSize: '0.85rem', flexWrap: 'wrap', gap: '1rem' }}>
                  <div>
                    <div style={{ fontWeight: 800, color: 'var(--text-primary)' }}>منظومة ستوكلي لإدارة المستودعات</div>
                    <div style={{ color: 'var(--text-muted)' }}>المستودع الرئيسي اللوجستي وسلاسل الإمداد</div>
                  </div>
                  <div style={{ textAlign: 'left', fontWeight: 700, color: 'var(--accent-primary)' }}>
                    Stockly Intelligent Warehouse Management<br />Enterprise Supply Chain System
                  </div>
                </div>
              </div>

              <h4 style={{ margin: '0 0 0.85rem 0', fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                اللجنة الثلاثية المعتمدة لتدقيق واعتماد المحاضر:
              </h4>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
                
                <div style={{ padding: '1.25rem', borderRadius: '12px', background: 'var(--bg-secondary)', border: '1px solid var(--border-light)', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 700, marginBottom: '4px' }}>الطرف الأول</div>
                  <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#3b82f6', marginBottom: '2px' }}>المعاين والفاحص الفني</div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>مشرف التخصص المعتمد بالمشروع</div>
                  <div style={{ marginTop: '0.75rem', padding: '4px 10px', borderRadius: '6px', background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', fontSize: '0.75rem', fontWeight: 700 }}>
                    فحص مطابقة الجودة والمواصفة
                  </div>
                </div>

                <div style={{ padding: '1.25rem', borderRadius: '12px', background: 'var(--bg-secondary)', border: '1px solid var(--border-light)', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 700, marginBottom: '4px' }}>الطرف الثاني</div>
                  <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#10b981', marginBottom: '2px' }}>أمين المخازن</div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>أ / محمد حلمي</div>
                  <div style={{ marginTop: '0.75rem', padding: '4px 10px', borderRadius: '6px', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', fontSize: '0.75rem', fontWeight: 700 }}>
                    الاستلام والتحقق العددي والإيداع
                  </div>
                </div>

                <div style={{ padding: '1.25rem', borderRadius: '12px', background: 'var(--bg-secondary)', border: '1px solid var(--border-light)', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 700, marginBottom: '4px' }}>الاعتماد والموافقة</div>
                  <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#8b5cf6', marginBottom: '2px' }}>قائد الفريق والمشرف المعتمد</div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Team Leader & Supervisor (وليس مدير المشروع أو Facility Manager)</div>
                  <div style={{ marginTop: '0.75rem', padding: '4px 10px', borderRadius: '6px', background: 'rgba(139, 92, 246, 0.1)', color: '#8b5cf6', fontSize: '0.75rem', fontWeight: 700 }}>
                    يعتمد / الاعتماد التشغيلي والفني المباشر
                  </div>
                </div>

              </div>
            </div>
          )}

        </div>
      )}

    </div>
  );
}
