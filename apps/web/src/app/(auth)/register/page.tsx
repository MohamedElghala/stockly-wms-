'use client';

import React, { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { auth, db, storage } from '@/lib/firebase';
import { 
  ShieldCheck, 
  User, 
  Mail, 
  Lock, 
  Phone, 
  Camera, 
  Building, 
  Briefcase, 
  Eye, 
  EyeOff, 
  Globe,
  Layers,
  Sparkles,
  CheckCircle2,
  Trash2,
  CheckSquare,
  Square
} from 'lucide-react';
import Link from 'next/link';
import { useLanguage } from '@/contexts/LanguageContext';
import { ThemeToggle } from '@/components/ThemeToggle';
import BrandLogo from '@/components/common/BrandLogo';
import { ALL_WAREHOUSE_DEPARTMENTS, normalizeCategory } from '@/types/inventory';
import toast from 'react-hot-toast';

export default function RegisterPage() {
  const router = useRouter();
  const { t, language, toggleLanguage } = useLanguage();
  const isRTL = language === 'ar';
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [formData, setFormData] = useState({
    userType: 'internal', // 'internal' | 'company'
    companyName: '',
    name: '',
    email: '',
    password: '',
    role: 'TECHNICIAN',
    phone: '',
  });

  // Selected Departments Array (Multi-select)
  const [selectedDepartments, setSelectedDepartments] = useState<string[]>(['أدوات كهربائية']);
  
  const [profilePic, setProfilePic] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const roles = [
    { value: 'CHAIRMAN', label: t('auth.roles.chairman') },
    { value: 'EXECUTIVE', label: t('auth.roles.ceo') },
    { value: 'SUPPLY_CHAIN_DIRECTOR', label: t('auth.roles.supplyChainDirector') },
    { value: 'WAREHOUSE_MANAGER', label: t('auth.roles.whManager') },
    { value: 'INVENTORY_CONTROLLER', label: t('auth.roles.inventoryController') },
    { value: 'INBOUND_SUPERVISOR', label: t('auth.roles.inboundSupervisor') },
    { value: 'OUTBOUND_SUPERVISOR', label: t('auth.roles.outboundSupervisor') },
    { value: 'QC_INSPECTOR', label: t('auth.roles.qcInspector') },
    { value: 'STOREKEEPER', label: t('auth.roles.storekeeper') },
    { value: 'PROJECT_MANAGER', label: t('auth.roles.projectManager') },
    { value: 'DEPARTMENT_SUPERVISOR', label: t('auth.roles.supervisor') },
    { value: 'HELP_DESK', label: t('auth.roles.helpDesk') },
    { value: 'TECHNICIAN', label: t('auth.roles.technician') },
    { value: 'WORKER', label: t('auth.roles.worker') },
  ];

  // All Available Departments in the Warehouse (Official 16 Categories 100-115)
  const availableDepartments = [...ALL_WAREHOUSE_DEPARTMENTS];

  // Toggle Department Selection
  const toggleDepartment = (dept: string) => {
    setSelectedDepartments(prev => {
      if (prev.includes(dept)) {
        if (prev.length === 1) return prev; // Keep at least one
        return prev.filter(d => d !== dept);
      } else {
        return [...prev, dept];
      }
    });
  };

  const selectAllDepartments = () => {
    if (selectedDepartments.length === availableDepartments.length) {
      setSelectedDepartments(['أدوات كهربائية']);
    } else {
      setSelectedDepartments([...ALL_WAREHOUSE_DEPARTMENTS]);
    }
  };
  
  // Password Strength Logic
  const calculateStrength = (pwd: string) => {
    let score = 0;
    if (pwd.length >= 6) score += 1;
    if (pwd.length >= 8) score += 1;
    if (/[A-Z]/.test(pwd) || /[a-z]/.test(pwd)) score += 1;
    if (/[0-9]/.test(pwd)) score += 1;
    if (/[^A-Za-z0-9]/.test(pwd)) score += 1;
    return score; // 0 to 5
  };
  
  const pwdScore = calculateStrength(formData.password);
  
  const getStrengthColor = () => {
    if (pwdScore === 0) return 'var(--border-light)';
    if (pwdScore <= 2) return '#ef4444';
    if (pwdScore <= 3) return '#f59e0b';
    return '#10b981';
  };
  
  const getStrengthLabel = () => {
    if (pwdScore === 0) return '';
    if (pwdScore <= 2) return t('auth.strengthVeryWeak');
    if (pwdScore <= 3) return t('auth.strengthMedium');
    return t('auth.strengthStrong');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setProfilePic(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleRemovePhoto = () => {
    setProfilePic(null);
    setPreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (formData.password.length < 6) {
        throw new Error(language === 'ar' ? 'كلمة المرور يجب ألا تقل عن 6 خانات' : 'Password must be at least 6 characters');
      }

      if (selectedDepartments.length === 0) {
        throw new Error(language === 'ar' ? 'يرجى تحديد قسم واحد على الأقل' : 'Please select at least one department');
      }

      // 1. Create User in Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(auth, formData.email.trim(), formData.password);
      const user = userCredential.user;

      // 2. Upload Profile Picture if provided
      let photoURL = '';
      if (profilePic) {
        try {
          const storageRef = ref(storage, `users/${user.uid}/avatar_${Date.now()}`);
          await uploadBytes(storageRef, profilePic);
          photoURL = await getDownloadURL(storageRef);
        } catch (storageErr) {
          console.warn("Storage upload fallback in register:", storageErr);
        }
      }

      // 3. Update Firebase Auth Profile
      await updateProfile(user, {
        displayName: formData.name.trim(),
        photoURL: photoURL || undefined
      });

      const cleanEmail = formData.email.trim().toLowerCase();
      const isAdmin = cleanEmail === 'mohamedalghala@gmail.com' || cleanEmail === 'stockly.system.app@gmail.com' || cleanEmail.startsWith('admin');
      const isManagementRole = ['PROJECT_MANAGER', 'SUPPLY_CHAIN_DIRECTOR', 'WAREHOUSE_MANAGER', 'INVENTORY_CONTROLLER', 'FACILITY_TEAM_LEADER'].includes(formData.role);

      const normalizedDepts = selectedDepartments.map(d => normalizeCategory(d)).filter(Boolean);
      const isAllSelected = normalizedDepts.length === availableDepartments.length;
      const finalDepts = isAllSelected ? [...ALL_WAREHOUSE_DEPARTMENTS] : normalizedDepts;
      const primaryCategory = isAllSelected || isManagementRole ? 'كافة الأقسام' : (finalDepts[0] || 'عام');

      // 4. Save User Record in Firestore `users` collection with Multi-Departments
      await setDoc(doc(db, 'users', user.uid), {
        uid: user.uid,
        name: formData.name.trim(),
        email: cleanEmail,
        phone: formData.phone.trim() || '',
        userType: formData.userType,
        companyName: formData.userType === 'company' ? formData.companyName.trim() : '',
        role: isAdmin ? 'admin' : (isManagementRole ? 'management' : 'pending'),
        roleClass: isAdmin ? 'role-admin' : (isManagementRole ? 'role-management' : 'role-user'),
        jobTitle: formData.role,
        department: isAdmin ? 'الإدارة العليا' : primaryCategory,
        category: isAdmin ? 'الإدارة العليا' : primaryCategory,
        departments: finalDepts,
        photoURL: photoURL || '',
        status: (isAdmin || isManagementRole) ? 'active' : 'pending',
        createdAt: Date.now()
      }, { merge: true });

      if (isAdmin) {
        const maxAge = 60 * 60 * 24 * 30;
        document.cookie = `userRole=admin; path=/; max-age=${maxAge}; SameSite=Lax`;
        document.cookie = `roleClass=role-admin; path=/; max-age=${maxAge}; SameSite=Lax`;
        if (typeof window !== 'undefined') {
          localStorage.setItem('calm_wms_user_role', 'admin');
        }
        toast.success(language === 'ar' ? '🎉 مرحباً بك يا مدير النظام! جاري الدخول للوحة التحكم...' : '🎉 Welcome Super Admin! Entering dashboard...');
        router.push('/dashboard');
        return;
      }

      toast.success(
        language === 'ar' 
          ? '🎉 تم إنشاء الحساب بنجاح وهو الآن قيد المراجعة والاعتماد من قبل الإدارة!' 
          : '🎉 Account created successfully! Awaiting administrator activation.',
        { duration: 7000 }
      );

      // Redirect to login page with pending notification
      router.push('/login?pending=true');

    } catch (err: any) {
      console.error("Registration error:", err);
      let msg = err.message || 'Error creating account';
      if (err.code === 'auth/email-already-in-use') {
        msg = language === 'ar' ? 'هذا البريد الإلكتروني مسجل بالفعل!' : 'This email address is already in use!';
      } else if (err.code === 'auth/invalid-email') {
        msg = language === 'ar' ? 'صيغة البريد الإلكتروني غير صحيحة!' : 'Invalid email format!';
      } else if (err.code === 'auth/weak-password') {
        msg = language === 'ar' ? 'كلمة المرور ضعيفة جداً!' : 'Password is too weak!';
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div 
      className="flex-center" 
      style={{ 
        minHeight: '100vh', 
        padding: '2rem 1rem', 
        position: 'relative', 
        background: 'radial-gradient(circle at 50% 10%, rgba(9, 154, 117, 0.15), transparent 70%), var(--bg-primary)',
        direction: isRTL ? 'rtl' : 'ltr'
      }}
    >
      {/* Top Navbar Controls */}
      <div style={{ position: 'absolute', top: '1.5rem', [isRTL ? 'left' : 'right']: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem', zIndex: 10 }}>
        <span style={{ fontSize: '0.75rem', fontWeight: 800, background: '#099A7520', color: '#00DF8F', border: '1px solid #099A75', padding: '0.3rem 0.65rem', borderRadius: '12px' }}>
          v2.2 Live
        </span>
        <ThemeToggle />
        <button
          onClick={toggleLanguage}
          className="btn btn-glass"
          style={{ padding: '0.45rem 0.85rem', borderRadius: 'var(--radius-full)', display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-primary)', fontSize: '0.85rem', fontWeight: 700 }}
        >
          <Globe size={16} color="var(--accent-primary)" />
          <span>{language.toUpperCase()}</span>
        </button>
      </div>

      {/* Main Container */}
      <div 
        className="enterprise-card animate-fade-in register-card-container" 
        style={{ 
          display: 'flex', 
          flexDirection: 'row', 
          maxWidth: '1080px', 
          width: '100%', 
          borderRadius: '24px', 
          overflow: 'hidden', 
          background: 'var(--bg-secondary)', 
          border: '1px solid var(--border-light)', 
          boxShadow: '0 25px 60px rgba(0,0,0,0.5)'
        }}
      >
        {/* Left Side: Brand Visual Card */}
        <div 
          className="hide-on-mobile register-brand-side"
          style={{ 
            flex: '0.8', 
            padding: '3rem 2.5rem', 
            background: 'linear-gradient(135deg, rgba(9, 154, 117, 0.2), rgba(12, 213, 159, 0.05)), var(--bg-tertiary)', 
            borderRight: isRTL ? 'none' : '1px solid var(--border-light)', 
            borderLeft: isRTL ? '1px solid var(--border-light)' : 'none', 
            display: 'flex', 
            flexDirection: 'column', 
            justifyContent: 'space-between'
          }}
        >
          <div>
            {/* Stockly WMS Unified Brand Logo */}
            <div style={{ marginBottom: '2.5rem' }}>
              <BrandLogo size="lg" showSubtitle={true} />
            </div>

            <h2 style={{ margin: '0 0 1rem 0', fontSize: '1.45rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: '1.4' }}>
              {language === 'ar' ? 'منظومة إدارة سلاسل الإمداد ومخازن المرافق' : 'Enterprise Facility Warehouse Platform'}
            </h2>
            <p style={{ margin: '0 0 2rem 0', fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: '1.7' }}>
              {language === 'ar' 
                ? 'تحكم متكامل في الأرصدة، وأذونات الصرف والوارد، ومراقبة العهد مع عزل دقيق لصلاحيات كل قسم.' 
                : 'Enterprise inventory control, multi-department access, and smart requisition workflow.'}
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ padding: '0.5rem', background: 'rgba(9, 154, 117, 0.15)', color: '#099A75', borderRadius: '10px' }}>
                  <ShieldCheck size={20} />
                </div>
                <div>
                  <strong style={{ fontSize: '0.88rem', color: 'var(--text-primary)', display: 'block' }}>{t('auth.secureAuth')}</strong>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{t('auth.secureAuthDesc')}</span>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ padding: '0.5rem', background: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6', borderRadius: '10px' }}>
                  <Layers size={20} />
                </div>
                <div>
                  <strong style={{ fontSize: '0.88rem', color: 'var(--text-primary)', display: 'block' }}>{t('auth.roleIsolation')}</strong>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{t('auth.roleIsolationDesc')}</span>
                </div>
              </div>
            </div>
          </div>

          <div style={{ borderTop: '1px solid var(--border-light)', paddingTop: '1.25rem', marginTop: '2rem' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{t('auth.haveAccount')} </span>
            <Link href="/login" style={{ color: '#099A75', fontWeight: 800, textDecoration: 'none' }}>
              {t('auth.loginLink')}
            </Link>
          </div>
        </div>

        {/* Right Side: Registration Form */}
        <div style={{ flex: '1.2', padding: '2.5rem 3rem', background: 'var(--bg-secondary)', overflowY: 'auto' }}>
          
          <div style={{ marginBottom: '1.5rem' }}>
            <h3 style={{ margin: '0 0 0.35rem 0', fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)' }}>
              {t('auth.registerTitle')}
            </h3>
            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              {t('auth.registerSubtitle')}
            </p>
          </div>

          {error && (
            <div style={{ padding: '0.85rem 1.25rem', background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', borderRadius: '10px', marginBottom: '1.5rem', fontSize: '0.88rem', fontWeight: 600, border: '1px solid rgba(239, 68, 68, 0.3)' }}>
              {error}
            </div>
          )}

          <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            
            {/* 1. Account Type Selector Tabs */}
            <div>
              <label style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '0.4rem' }}>
                {t('auth.userTypeLabel')}
              </label>
              <div style={{ display: 'flex', gap: '0.5rem', background: 'var(--bg-tertiary)', padding: '0.3rem', borderRadius: '12px', border: '1px solid var(--border-light)' }}>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, userType: 'internal' })}
                  className={`btn ${formData.userType === 'internal' ? 'btn-primary' : 'btn-outline'}`}
                  style={{ flex: 1, padding: '0.55rem', fontSize: '0.85rem', fontWeight: 700, border: 'none', background: formData.userType === 'internal' ? '#099A75' : 'transparent', color: formData.userType === 'internal' ? '#fff' : 'var(--text-muted)' }}
                >
                  <User size={15} style={{ marginLeft: isRTL ? '5px' : 0, marginRight: isRTL ? 0 : '5px' }} />
                  <span>{t('auth.internalEmployee')}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, userType: 'company' })}
                  className={`btn ${formData.userType === 'company' ? 'btn-primary' : 'btn-outline'}`}
                  style={{ flex: 1, padding: '0.55rem', fontSize: '0.85rem', fontWeight: 700, border: 'none', background: formData.userType === 'company' ? '#099A75' : 'transparent', color: formData.userType === 'company' ? '#fff' : 'var(--text-muted)' }}
                >
                  <Building size={15} style={{ marginLeft: isRTL ? '5px' : 0, marginRight: isRTL ? 0 : '5px' }} />
                  <span>{t('auth.externalCompany')}</span>
                </button>
              </div>
            </div>

            {/* If External Company -> Company Name Field */}
            {formData.userType === 'company' && (
              <div className="form-group animate-fade-in">
                <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.35rem', display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <Building size={15} color="#3b82f6" />
                  <span>{t('auth.companyName')}</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.companyName}
                  onChange={e => setFormData({ ...formData, companyName: e.target.value })}
                  placeholder="مثال: شركة النصر للمقاولات"
                  className="input-field"
                  style={{ width: '100%', fontWeight: 600 }}
                />
              </div>
            )}

            {/* Profile Avatar Upload Box */}
            <div style={{ background: 'var(--bg-tertiary)', padding: '1rem', borderRadius: '14px', border: '1px solid var(--border-light)', display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
              <div style={{ width: '60px', height: '60px', borderRadius: '50%', overflow: 'hidden', border: '2px solid #099A75', background: 'var(--bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                {previewUrl ? (
                  <img src={previewUrl} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <User size={28} color="var(--text-muted)" />
                )}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', flex: 1 }}>
                <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  {t('auth.profilePhoto')}
                </span>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileChange} 
                  accept="image/*" 
                  style={{ display: 'none' }} 
                />
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="btn btn-outline"
                    style={{ padding: '0.3rem 0.75rem', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}
                  >
                    <Camera size={13} />
                    <span>{previewUrl ? t('auth.changePhotoBtn') : t('auth.uploadPhotoBtn')}</span>
                  </button>

                  {previewUrl && (
                    <button
                      type="button"
                      onClick={handleRemovePhoto}
                      className="btn btn-outline"
                      style={{ padding: '0.3rem 0.75rem', fontSize: '0.78rem', color: '#ef4444', borderColor: 'rgba(239,68,68,0.4)', fontWeight: 600 }}
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Full Name & Phone */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
              <div className="form-group">
                <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.35rem', display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <User size={15} color="#099A75" />
                  <span>{t('auth.fullName')}</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="مثال: أحمد محمد علي"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  className="input-field"
                  style={{ width: '100%', fontWeight: 600 }}
                />
              </div>

              <div className="form-group">
                <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.35rem', display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <Phone size={15} color="#3b82f6" />
                  <span>{t('auth.phone')}</span>
                </label>
                <input
                  type="tel"
                  placeholder="010XXXXXXXX"
                  value={formData.phone}
                  onChange={e => setFormData({ ...formData, phone: e.target.value })}
                  className="input-field"
                  style={{ width: '100%', direction: 'ltr', textAlign: isRTL ? 'right' : 'left' }}
                />
              </div>
            </div>

            {/* Job Role / Title */}
            <div className="form-group">
              <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.35rem', display: 'flex', alignItems: 'center', gap: '5px' }}>
                <Briefcase size={15} color="#ea580c" />
                <span>{t('auth.jobTitleLabel')}</span>
              </label>
              <select
                value={formData.role}
                onChange={e => setFormData({ ...formData, role: e.target.value })}
                className="input-field"
                style={{ width: '100%', fontWeight: 600 }}
              >
                {roles.map(r => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
            </div>

            {/* Multi-Department Selection Checkboxes Grid */}
            <div style={{ background: 'var(--bg-tertiary)', padding: '1.25rem', borderRadius: '14px', border: '1px solid var(--border-light)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '5px', margin: 0 }}>
                  <Layers size={16} color="#8b5cf6" />
                  <span>{t('auth.departmentsTitle')}: ({selectedDepartments.length})</span>
                </label>

                <button
                  type="button"
                  onClick={selectAllDepartments}
                  className="btn btn-outline"
                  style={{ padding: '0.2rem 0.6rem', fontSize: '0.72rem', color: '#8b5cf6', borderColor: 'rgba(139, 92, 246, 0.4)', fontWeight: 700 }}
                >
                  {selectedDepartments.length === availableDepartments.length ? t('auth.deselectAllDepts') : t('auth.selectAllDepts')}
                </button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.5rem', maxHeight: '180px', overflowY: 'auto', paddingRight: '0.25rem' }}>
                {availableDepartments.map(dept => {
                  const isChecked = selectedDepartments.includes(dept);
                  return (
                    <div
                      key={dept}
                      onClick={() => toggleDepartment(dept)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '0.5rem 0.75rem',
                        borderRadius: '8px',
                        background: isChecked ? 'rgba(9, 154, 117, 0.12)' : 'var(--bg-secondary)',
                        border: isChecked ? '1.5px solid #099A75' : '1px solid var(--border-light)',
                        color: isChecked ? '#099A75' : 'var(--text-secondary)',
                        cursor: 'pointer',
                        fontSize: '0.82rem',
                        fontWeight: isChecked ? 700 : 500,
                        transition: 'all 0.2s'
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {}}
                        style={{ accentColor: '#099A75', cursor: 'pointer' }}
                      />
                      <span style={{ lineHeight: 1.2 }}>{dept}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Email */}
            <div className="form-group">
              <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.35rem', display: 'flex', alignItems: 'center', gap: '5px' }}>
                <Mail size={15} color="#099A75" />
                <span>{t('auth.emailOrPhone')}</span>
              </label>
              <input
                type="email"
                required
                placeholder="name@company.com"
                value={formData.email}
                onChange={e => setFormData({ ...formData, email: e.target.value.trim() })}
                className="input-field"
                style={{ width: '100%', direction: 'ltr', textAlign: 'left' }}
                dir="ltr"
              />
            </div>

            {/* Password with Strength Meter */}
            <div className="form-group">
              <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.35rem', display: 'flex', alignItems: 'center', gap: '5px' }}>
                <Lock size={15} color="#f59e0b" />
                <span>{t('auth.createPassword')}</span>
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={e => setFormData({ ...formData, password: e.target.value })}
                  className="input-field"
                  style={{ width: '100%', direction: 'ltr', textAlign: 'left', paddingRight: isRTL ? '1rem' : '2.5rem', paddingLeft: isRTL ? '2.5rem' : '1rem' }}
                  dir="ltr"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    [isRTL ? 'left' : 'right']: '0.75rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                    padding: 0
                  }}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>

              {/* Strength indicator bar */}
              {formData.password && (
                <div style={{ marginTop: '0.4rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.74rem', marginBottom: '0.2rem' }}>
                    <span style={{ color: 'var(--text-muted)' }}>{t('auth.passwordStrength')}</span>
                    <span style={{ color: getStrengthColor(), fontWeight: 700 }}>{getStrengthLabel()}</span>
                  </div>
                  <div style={{ height: '4px', background: 'var(--bg-tertiary)', borderRadius: '2px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${(pwdScore / 5) * 100}%`, background: getStrengthColor(), transition: 'all 0.3s ease' }} />
                  </div>
                </div>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary"
              style={{ width: '100%', padding: '0.85rem', fontSize: '1rem', fontWeight: 800, marginTop: '0.5rem', background: '#099A75', borderColor: '#099A75', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
            >
              {loading ? (
                <span>{t('auth.registering')}</span>
              ) : (
                <>
                  <Sparkles size={18} />
                  <span>{t('auth.registerBtn')}</span>
                </>
              )}
            </button>

            <div className="show-on-mobile-only" style={{ textAlign: 'center', marginTop: '1rem', fontSize: '0.85rem' }}>
              <span style={{ color: 'var(--text-muted)' }}>{t('auth.haveAccount')} </span>
              <Link href="/login" style={{ color: '#099A75', fontWeight: 800 }}>
                {t('auth.loginLink')}
              </Link>
            </div>

          </form>
        </div>

      </div>

      <style jsx global>{`
        .register-card-container {
          flex-direction: row;
        }
        .show-on-mobile-only {
          display: none;
        }
        @media (max-width: 768px) {
          .register-card-container {
            flex-direction: column !important;
            margin-top: 3.5rem !important;
            border-radius: var(--radius-lg) !important;
            width: 100% !important;
          }
          .hide-on-mobile {
            display: none !important;
          }
          .show-on-mobile-only {
            display: block !important;
          }
        }
      `}</style>
    </div>
  );
}
