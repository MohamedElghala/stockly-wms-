'use client';

import React, { useState, useEffect } from 'react';
import { collection, query, onSnapshot, orderBy, doc, updateDoc, deleteDoc, setDoc } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { 
  Check, 
  X, 
  Shield, 
  UserCog, 
  Ban, 
  Trash2, 
  Unlock, 
  Search, 
  Printer, 
  Edit3, 
  Layers, 
  User, 
  Phone, 
  Mail, 
  Building, 
  Briefcase,
  CheckSquare,
  Square,
  Sparkles
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import PrintHeader from '@/components/print/PrintHeader';
import PrintSignatures from '@/components/print/PrintSignatures';
import toast from 'react-hot-toast';
import { ALL_WAREHOUSE_DEPARTMENTS, normalizeCategory } from '@/types/inventory';

const AVAILABLE_ROLES = [
  { value: 'CHAIRMAN', label: 'رئيس مجلس الإدارة (Chairman of the Board)', systemRole: 'admin', roleClass: 'role-admin' },
  { value: 'EXECUTIVE', label: 'المدير التنفيذي (CEO / Executive Director)', systemRole: 'admin', roleClass: 'role-admin' },
  { value: 'PROJECT_MANAGER', label: 'مدير المشروع (Project Manager)', systemRole: 'management', roleClass: 'role-management' },
  { value: 'FACILITY_TEAM_LEADER', label: 'قائد فريق المرافق (Facility Team Leader)', systemRole: 'management', roleClass: 'role-management' },
  { value: 'STOREKEEPER', label: 'أمين / مدير المخازن (Storekeeper / WH Manager)', systemRole: 'supervisor', roleClass: 'role-supervisor' },
  { value: 'IRRIGATION_ENGINEER', label: 'مهندس الري (Irrigation Engineer)', systemRole: 'supervisor', roleClass: 'role-supervisor' },
  { value: 'DEPARTMENT_SUPERVISOR', label: 'مشرف قسم (Department Supervisor)', systemRole: 'supervisor', roleClass: 'role-supervisor' },
  { value: 'CLEANING_SUPERVISOR', label: 'مشرف خدمات ونظافة (Cleaning Supervisor)', systemRole: 'supervisor', roleClass: 'role-supervisor' },
  { value: 'HELP_DESK', label: 'مكتب المساعدة والدعم الفني (Help Desk)', systemRole: 'user', roleClass: 'role-user' },
  { value: 'TECHNICIAN', label: 'فني صيانة وتشغيل (Technician)', systemRole: 'user', roleClass: 'role-user' },
  { value: 'WORKER', label: 'عامل مخزن (Worker)', systemRole: 'user', roleClass: 'role-user' }
];

export default function UsersManagementPage() {
  const { userData } = useAuth();
  const { t } = useLanguage();
  const router = useRouter();
  
  const [usersList, setUsersList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');

  // Modal State for Reviewing & Editing User Permissions
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [editJobRole, setEditJobRole] = useState<string>('TECHNICIAN');
  const [editDepartments, setEditDepartments] = useState<string[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // ──── Roles ────
  const isAdmin = userData?.role === 'admin' || userData?.email === 'mohamedalghala@gmail.com';

  useEffect(() => {
    if (userData && !isAdmin) {
      router.push('/dashboard');
      return;
    }
  }, [userData, isAdmin, router]);

  useEffect(() => {
    const q = query(collection(db, 'users'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snapshot) => {
      setUsersList(snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() })));
      setLoading(false);
    });
    return () => unsub();
  }, []);

  // Open Approval / Permissions Modal
  const openPermissionsModal = (user: any) => {
    setSelectedUser(user);
    let userRole = user.jobTitle || user.role || 'TECHNICIAN';
    if (userRole === 'SITE_ENGINEER') userRole = 'IRRIGATION_ENGINEER';
    setEditJobRole(userRole);
    
    // Extract existing departments or fallback to category
    let depts: string[] = [];
    if (Array.isArray(user.departments) && user.departments.length > 0) {
      depts = user.departments
        .map((d: string) => normalizeCategory(d))
        .filter((d: string) => ALL_WAREHOUSE_DEPARTMENTS.includes(d as any));
    } else if (user.category && user.category !== 'عام' && user.category !== 'all' && user.category !== 'كافة الأقسام') {
      const norm = normalizeCategory(user.category);
      if (ALL_WAREHOUSE_DEPARTMENTS.includes(norm as any)) depts = [norm];
    } else if (user.department && user.department !== 'عام' && user.department !== 'all' && user.department !== 'كافة الأقسام') {
      const norm = normalizeCategory(user.department);
      if (ALL_WAREHOUSE_DEPARTMENTS.includes(norm as any)) depts = [norm];
    }

    if (
      depts.length === 0 ||
      userRole === 'FACILITY_TEAM_LEADER' ||
      user.role === 'management' ||
      user.category === 'كافة الأقسام' ||
      user.category === 'all' ||
      user.department === 'كافة الأقسام' ||
      (Array.isArray(user.departments) && user.departments.length >= 15)
    ) {
      depts = [...ALL_WAREHOUSE_DEPARTMENTS];
    }

    setEditDepartments(depts);
    setIsModalOpen(true);
  };

  // Toggle Department in Modal
  const toggleModalDept = (dept: string) => {
    setEditDepartments(prev => {
      if (prev.includes(dept)) {
        if (prev.length === 1) return prev; // Keep at least one
        return prev.filter(d => d !== dept);
      } else {
        return [...prev, dept];
      }
    });
  };

  const selectAllModalDepts = () => {
    if (editDepartments.length === ALL_WAREHOUSE_DEPARTMENTS.length) {
      setEditDepartments(['أدوات كهربائية']);
    } else {
      setEditDepartments([...ALL_WAREHOUSE_DEPARTMENTS]);
    }
  };

  // Save / Approve User Permissions
  const handleSavePermissions = async () => {
    if (!selectedUser) return;
    setProcessing(selectedUser.uid);

    try {
      const selectedRoleObj = AVAILABLE_ROLES.find(r => r.value === editJobRole) || AVAILABLE_ROLES[1];
      const normalizedDepts = editDepartments.map(d => normalizeCategory(d)).filter(Boolean);
      const isAllDepts = normalizedDepts.length === ALL_WAREHOUSE_DEPARTMENTS.length;
      const finalDepts = isAllDepts ? [...ALL_WAREHOUSE_DEPARTMENTS] : normalizedDepts;
      const primaryCategory = isAllDepts || selectedRoleObj.systemRole === 'management' ? 'كافة الأقسام' : (finalDepts[0] || 'عام');

      const userDocRef = doc(db, 'users', selectedUser.uid);
      await updateDoc(userDocRef, {
        role: selectedRoleObj.systemRole,
        roleClass: selectedRoleObj.roleClass,
        jobTitle: editJobRole,
        department: primaryCategory,
        category: primaryCategory,
        departments: finalDepts,
        status: 'active',
        approvedAt: Date.now(),
        approvedBy: userData?.email || 'admin'
      });

      // Also invoke Cloud Function if present as a fallback
      try {
        const updateRoleFn = httpsCallable(functions, 'updateUserRole');
        await updateRoleFn({ uid: selectedUser.uid, newRole: selectedRoleObj.systemRole });
      } catch (fnErr) {
        console.warn("Cloud function update role fallback:", fnErr);
      }

      toast.success(`✅ تم اعتماد وتحديث صلاحيات المستخدم [${selectedUser.name}] بنجاح!`);
      setIsModalOpen(false);
      setSelectedUser(null);
    } catch (err: any) {
      console.error(err);
      toast.error('حدث خطأ أثناء حفظ الصلاحيات: ' + (err.message || 'Error'));
    } finally {
      setProcessing(null);
    }
  };

  const handleUpdateRole = async (uid: string, newRole: string) => {
    if (!window.confirm(`${t('users.confirmRoleChange')}${newRole}?`)) return;
    setProcessing(uid);
    try {
      const userDocRef = doc(db, 'users', uid);
      await updateDoc(userDocRef, {
        role: newRole,
        roleClass: newRole === 'admin' ? 'role-admin' : newRole === 'management' ? 'role-management' : newRole === 'supervisor' ? 'role-supervisor' : 'role-user',
        status: newRole === 'blocked' ? 'suspended' : 'active'
      });
      toast.success('تم تحديث الصلاحية بنجاح');
    } catch (e: any) {
      toast.error(t('alerts.error') + ' ' + (e.message || 'Error'));
    } finally {
      setProcessing(null);
    }
  };

  const handleDeleteUser = async (uid: string) => {
    if (!window.confirm(t('users.confirmDeleteUser'))) return;
    setProcessing(uid);
    try {
      await deleteDoc(doc(db, 'users', uid));
      toast.success(t('users.userDeleteSuccess'));
    } catch (e: any) {
      toast.error(t('alerts.error') + ' ' + (e.message || 'Error'));
    } finally {
      setProcessing(null);
    }
  };

  if (!isAdmin) return null;

  const filteredUsersList = usersList.filter(u => {
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      return (
        u.name?.toLowerCase().includes(term) ||
        u.email?.toLowerCase().includes(term) ||
        u.phone?.includes(term) ||
        u.category?.toLowerCase().includes(term) ||
        u.jobTitle?.toLowerCase().includes(term) ||
        (Array.isArray(u.departments) && u.departments.some((d: string) => d.toLowerCase().includes(term)))
      );
    }
    return true;
  });

  const pendingUsers = filteredUsersList.filter(u => u.role === 'pending' || u.status === 'pending');
  const activeUsers = filteredUsersList.filter(u => ['user', 'admin', 'management', 'supervisor'].includes(u.role) && u.status !== 'pending');
  const blockedUsers = filteredUsersList.filter(u => u.role === 'blocked' || u.status === 'suspended');

  const getRoleLabel = (role: string, jobTitle?: string) => {
    let effectiveTitle = jobTitle;
    if (effectiveTitle === 'SITE_ENGINEER') effectiveTitle = 'IRRIGATION_ENGINEER';
    if (effectiveTitle) {
      const match = AVAILABLE_ROLES.find(r => r.value === effectiveTitle);
      if (match) return match.label;
    }
    switch (role) {
      case 'admin': return t('users.roleAdmin');
      case 'management': return t('users.roleManagement');
      case 'supervisor': return t('users.roleSupervisor');
      default: return t('users.roleUser');
    }
  };

  return (
    <div className="animate-fade-in" style={{ paddingBottom: '2rem' }}>
      
      <div className="hide-on-print">
        <header className="dashboard-header flex-between glass-card" style={{ padding: '1.5rem 2rem', marginBottom: '2.5rem', borderRadius: 'var(--radius-xl)' }}>
          <div>
            <h1 style={{ margin: '0 0 0.25rem 0', fontSize: '2rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.5px' }}>{t('users.title')}</h1>
            <p className="text-muted" style={{ margin: 0 }}>مراجعة واعتماد المستخدمين وتخصيص صلاحيات وأقسام العمل بدقة</p>
          </div>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <div style={{ position: 'relative' }}>
              <Search size={18} style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input 
                type="text" 
                placeholder="بحث بالاسم، البريد، القسم، الهاتف..." 
                className="input-field"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ paddingRight: '2.5rem', minWidth: '280px' }}
              />
            </div>
            <button onClick={() => window.print()} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Printer size={16} /> طباعة قائمة المستخدمين
            </button>
          </div>
        </header>
      </div>

      {loading ? (
         <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>{t('common.loading')}</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '3rem' }}>
          
          {/* ──── 1. Pending Approval Requests ──── */}
          {pendingUsers.length > 0 && (
            <section className="hide-on-print">
              <h2 className="heading-lg" style={{ marginBottom: '1.5rem', color: '#f59e0b', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <UserCog size={24} /> طلبات التسجيل قيد المراجعة والاعتماد ({pendingUsers.length})
              </h2>
              <div className="table-container glass-card" style={{ padding: 0 }}>
                <table className="wms-table">
                  <thead>
                    <tr>
                      <th>المستخدم</th>
                      <th>البريد الإلكتروني</th>
                      <th>الدور المطلوب</th>
                      <th>الأقسام المختارة</th>
                      <th>الهاتف</th>
                      <th style={{ width: '280px' }}>إجراء الاعتماد</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pendingUsers.map(user => (
                      <tr key={user.uid}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{ width: '32px', height: '32px', borderRadius: '50%', overflow: 'hidden', background: '#099A75', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.85rem' }}>
                              {user.photoURL ? (
                                <img src={user.photoURL} alt={user.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                              ) : (
                                (user.name || 'U').charAt(0).toUpperCase()
                              )}
                            </div>
                            <span style={{ fontWeight: 700 }}>{user.name}</span>
                          </div>
                        </td>
                        <td style={{ color: 'var(--text-muted)' }}>{user.email}</td>
                        <td>
                          <span className="badge badge-warning" style={{ fontWeight: 700 }}>
                            {getRoleLabel(user.role, user.jobTitle)}
                          </span>
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', maxWidth: '280px' }}>
                            {Array.isArray(user.departments) && user.departments.length >= 15 ? (
                              <span className="badge badge-primary" style={{ fontSize: '0.78rem', padding: '0.2rem 0.55rem', background: 'rgba(9, 154, 117, 0.2)', color: '#099A75', fontWeight: 800 }}>
                                🌟 كافة الأقسام ({user.departments.length} قسم)
                              </span>
                            ) : Array.isArray(user.departments) && user.departments.length > 0 ? (
                              user.departments.map((d: string) => (
                                <span key={d} className="badge badge-outline" style={{ fontSize: '0.72rem', padding: '0.15rem 0.45rem' }}>{d}</span>
                              ))
                            ) : (
                              <span className="badge badge-outline">{user.category || '—'}</span>
                            )}
                          </div>
                        </td>
                        <td>{user.phone || '—'}</td>
                        <td>
                          <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button 
                              onClick={() => openPermissionsModal(user)} 
                              className="btn btn-primary" 
                              style={{ fontSize: '0.8rem', padding: '0.4rem 0.85rem', display: 'flex', alignItems: 'center', gap: '4px', background: '#099A75', borderColor: '#099A75' }}
                            >
                              <Shield size={14} />
                              <span>مراجعة واعتماد الأقسام 🛡️</span>
                            </button>
                            
                            <button 
                              disabled={processing === user.uid} 
                              onClick={() => handleDeleteUser(user.uid)} 
                              className="btn btn-danger" 
                              style={{ fontSize: '0.8rem', padding: '0.4rem 0.7rem' }}
                              title="رفض وحذف الطلب"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* ──── 2. Active Users (Printable) ──── */}
          <section className="official-document-paper" style={{ padding: '1rem' }}>
            
            <PrintHeader 
              title="تقرير المستخدمين والصلاحيات"
              subtitle="قائمة بجميع المستخدمين النشطين على النظام وتوزيع الأقسام"
              category="الإدارة العامة"
            />

            <h2 className="heading-lg hide-on-print" style={{ marginBottom: '1.5rem', color: 'var(--accent-success)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Shield size={24} /> {t('users.activeUsers')} ({activeUsers.length})
            </h2>
            
            {activeUsers.length === 0 ? (
               <div className="glass-card" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>لا يوجد مستخدمين</div>
            ) : (
              <div className="table-container glass-card" style={{ padding: 0 }}>
                <table className="wms-table official-print-table">
                  <thead>
                    <tr>
                      <th>المستخدم</th>
                      <th>البريد الإلكتروني</th>
                      <th>الأقسام المصرح بها</th>
                      <th>الهاتف</th>
                      <th>المسمى الوظيفي والصلاحية</th>
                      <th className="hide-on-print" style={{ width: '260px' }}>الإجراءات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeUsers.map(user => (
                      <tr key={user.uid}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{ width: '32px', height: '32px', borderRadius: '50%', overflow: 'hidden', background: '#099A75', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.85rem' }}>
                              {user.photoURL ? (
                                <img src={user.photoURL} alt={user.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                              ) : (
                                (user.name || 'U').charAt(0).toUpperCase()
                              )}
                            </div>
                            <span style={{ fontWeight: 700 }}>{user.name}</span>
                          </div>
                        </td>
                        <td style={{ color: 'var(--text-muted)' }}>{user.email}</td>
                        <td>
                          <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', maxWidth: '300px' }}>
                            {Array.isArray(user.departments) && user.departments.length >= 15 ? (
                              <span className="badge badge-primary" style={{ fontSize: '0.78rem', padding: '0.2rem 0.55rem', background: 'rgba(9, 154, 117, 0.2)', color: '#099A75', fontWeight: 800 }}>
                                🌟 كافة الأقسام ({user.departments.length} قسم)
                              </span>
                            ) : Array.isArray(user.departments) && user.departments.length > 0 ? (
                              user.departments.map((d: string) => (
                                <span key={d} className="badge badge-primary" style={{ fontSize: '0.72rem', padding: '0.15rem 0.45rem', background: 'rgba(9, 154, 117, 0.15)', color: '#099A75' }}>{d}</span>
                              ))
                            ) : (
                              <span className="badge badge-outline">{user.category || 'عام'}</span>
                            )}
                          </div>
                        </td>
                        <td>{user.phone || '—'}</td>
                        <td>
                          <span className={`badge role-${user.role} hide-on-print`} style={{ fontWeight: 700 }}>
                            {getRoleLabel(user.role, user.jobTitle)}
                          </span>
                          <span className="show-on-print-only" style={{ fontWeight: 'bold' }}>
                            {getRoleLabel(user.role, user.jobTitle)}
                          </span>
                        </td>
                        <td className="hide-on-print">
                          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                            <button
                              onClick={() => openPermissionsModal(user)}
                              className="btn btn-outline"
                              style={{ fontSize: '0.78rem', padding: '0.35rem 0.75rem', display: 'flex', alignItems: 'center', gap: '4px', color: '#099A75', borderColor: '#099A75', fontWeight: 600 }}
                              title="تعديل الأقسام والصلاحيات"
                            >
                              <Edit3 size={13} />
                              <span>تعديل الأقسام ✏️</span>
                            </button>

                            <button 
                              disabled={processing === user.uid || user.uid === userData?.uid} 
                              onClick={() => handleUpdateRole(user.uid, 'blocked')} 
                              className="btn btn-outline" 
                              style={{ fontSize: '0.78rem', padding: '0.35rem 0.6rem', borderColor: 'var(--accent-danger)', color: 'var(--accent-danger)' }}
                              title={t('users.blockBtn')}
                            >
                              <Ban size={14} />
                            </button>

                            <button 
                              disabled={processing === user.uid || user.uid === userData?.uid} 
                              onClick={() => handleDeleteUser(user.uid)} 
                              className="btn btn-outline" 
                              style={{ fontSize: '0.78rem', padding: '0.35rem 0.6rem', borderColor: '#ef4444', color: '#ef4444' }}
                              title="حذف المستخدم"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            
            <div className="show-on-print-only" style={{ marginTop: '2rem' }}>
              <PrintSignatures documentTitle="تقرير المستخدمين وتوزيع الصلاحيات" />
            </div>

          </section>

          {/* ──── 3. Blocked Users (Hidden on print) ──── */}
          {blockedUsers.length > 0 && (
            <section className="hide-on-print">
              <h2 className="heading-lg" style={{ marginBottom: '1.5rem', color: 'var(--accent-danger)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Ban size={24} /> الحسابات الموقوفة ({blockedUsers.length})
              </h2>
              <div className="table-container glass-card" style={{ padding: 0 }}>
                <table className="wms-table">
                  <thead>
                    <tr>
                      <th>{t('users.name')}</th>
                      <th>{t('users.email')}</th>
                      <th>{t('users.specialization')}</th>
                      <th>{t('users.action')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {blockedUsers.map(user => (
                      <tr key={user.uid}>
                        <td style={{ fontWeight: 600 }}>{user.name}</td>
                        <td style={{ color: 'var(--text-muted)' }}>{user.email}</td>
                        <td>{user.category || '—'}</td>
                        <td>
                          <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button disabled={processing === user.uid} onClick={() => handleUpdateRole(user.uid, 'user')} className="btn btn-outline" style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem', borderColor: 'var(--accent-success)', color: 'var(--accent-success)' }}>
                              <Unlock size={14} /> {t('users.unblockBtn')}
                            </button>
                            <button disabled={processing === user.uid} onClick={() => handleDeleteUser(user.uid)} className="btn btn-danger" style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem' }}>
                              <Trash2 size={14} /> {t('users.deleteBtn')}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

        </div>
      )}

      {/* ──── MODAL: Review & Adjust User Permissions & Departments ──── */}
      {isModalOpen && selectedUser && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(5px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '1rem' }}>
          <div className="glass-card animate-fade-in" style={{ width: '100%', maxWidth: '650px', maxHeight: '90vh', overflowY: 'auto', borderRadius: '20px', padding: '2rem', background: 'var(--bg-secondary)', border: '1px solid var(--border-light)', boxShadow: '0 25px 50px rgba(0,0,0,0.5)' }}>
            
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-light)', paddingBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ padding: '0.5rem', background: 'rgba(9, 154, 117, 0.15)', color: '#099A75', borderRadius: '10px' }}>
                  <Shield size={22} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                    مراجعة واعتماد صلاحيات وأقسام المستخدم
                  </h3>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                    حدد أو عدل الأقسام التابع لها هذا الموظف قبل التفعيل
                  </span>
                </div>
              </div>

              <button onClick={() => setIsModalOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                <X size={22} />
              </button>
            </div>

            {/* User Details Summary Box */}
            <div style={{ background: 'var(--bg-tertiary)', padding: '1rem 1.25rem', borderRadius: '14px', marginBottom: '1.5rem', border: '1px solid var(--border-light)', display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ width: '52px', height: '52px', borderRadius: '50%', overflow: 'hidden', background: '#099A75', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '1.2rem', flexShrink: 0 }}>
                {selectedUser.photoURL ? (
                  <img src={selectedUser.photoURL} alt={selectedUser.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  (selectedUser.name || 'U').charAt(0).toUpperCase()
                )}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', flex: 1 }}>
                <strong style={{ fontSize: '1.05rem', color: 'var(--text-primary)' }}>{selectedUser.name}</strong>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{selectedUser.email} {selectedUser.phone ? `• ${selectedUser.phone}` : ''}</span>
                {selectedUser.companyName && (
                  <span style={{ fontSize: '0.82rem', color: '#3b82f6', fontWeight: 700 }}>🏢 {selectedUser.companyName}</span>
                )}
              </div>
            </div>

            {/* Role / Job Title Selector */}
            <div className="form-group" style={{ marginBottom: '1.5rem' }}>
              <label style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.4rem', display: 'flex', alignItems: 'center', gap: '5px' }}>
                <Briefcase size={16} color="#ea580c" />
                <span>المسمى الوظيفي والدور بالمنظومة:</span>
              </label>
              <select
                value={editJobRole}
                onChange={(e) => setEditJobRole(e.target.value)}
                className="input-field"
                style={{ width: '100%', fontWeight: 700, padding: '0.65rem 1rem' }}
              >
                {AVAILABLE_ROLES.map(r => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
            </div>

            {/* Department Selection Checkboxes */}
            <div style={{ marginBottom: '2rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <label style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '5px', margin: 0 }}>
                  <Layers size={16} color="#8b5cf6" />
                  <span>الأقسام المعتمدة والمصرح بها للمستخدم: ({editDepartments.length})</span>
                </label>

                <button
                  type="button"
                  onClick={selectAllModalDepts}
                  className="btn btn-outline"
                  style={{ padding: '0.2rem 0.6rem', fontSize: '0.74rem', color: '#8b5cf6', borderColor: 'rgba(139, 92, 246, 0.4)', fontWeight: 700 }}
                >
                  {editDepartments.length === ALL_WAREHOUSE_DEPARTMENTS.length ? 'إلغاء التحديد' : 'تحديد كافة الأقسام'}
                </button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.5rem', maxHeight: '220px', overflowY: 'auto', paddingRight: '0.25rem', background: 'var(--bg-tertiary)', padding: '0.75rem', borderRadius: '12px', border: '1px solid var(--border-light)' }}>
                {ALL_WAREHOUSE_DEPARTMENTS.map(dept => {
                  const isChecked = editDepartments.includes(dept);
                  return (
                    <div
                      key={dept}
                      onClick={() => toggleModalDept(dept)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '0.5rem 0.75rem',
                        borderRadius: '8px',
                        background: isChecked ? 'rgba(9, 154, 117, 0.15)' : 'var(--bg-secondary)',
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

            {/* Modal Actions */}
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', borderTop: '1px solid var(--border-light)', paddingTop: '1.25rem' }}>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="btn btn-outline"
                style={{ padding: '0.7rem 1.5rem', fontWeight: 600 }}
              >
                إلغاء
              </button>

              <button
                type="button"
                disabled={processing === selectedUser.uid}
                onClick={handleSavePermissions}
                className="btn btn-primary"
                style={{ padding: '0.7rem 1.5rem', fontWeight: 800, background: '#099A75', borderColor: '#099A75', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <Sparkles size={18} />
                <span>{selectedUser.status === 'pending' ? '✅ اعتماد وتفعيل المستخدم' : '💾 حفظ التعديلات'}</span>
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
