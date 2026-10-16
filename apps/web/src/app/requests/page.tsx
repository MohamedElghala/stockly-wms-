'use client';
import toast from 'react-hot-toast';

import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Package, Check, X, Plus, Trash2, Search, Filter, ShieldCheck, Box, Printer } from 'lucide-react';
import PrintHeader from '@/components/print/PrintHeader';
import PrintSignatures from '@/components/print/PrintSignatures';
import { ALL_WAREHOUSE_DEPARTMENTS, normalizeCategory } from '@/types/inventory';

const CATEGORIES = [...ALL_WAREHOUSE_DEPARTMENTS];

function RequestsContent() {
  const { userData, user } = useAuth();
  const { t, language } = useLanguage();
  const searchParams = useSearchParams();
  
  const [activeTab, setActiveTab] = useState<'CREATE' | 'PENDING' | 'ARCHIVE'>('PENDING');
  const [requests, setRequests] = useState<any[]>([]);
  const [usersMap, setUsersMap] = useState<Record<string, string>>({});
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const cleanEmail = (userData?.email || user?.email || '').toLowerCase();
  const role = userData?.role || 'user';
  const jobTitle = userData?.jobTitle || '';
  const isAdmin = role === 'admin' || cleanEmail === 'mohamedalghala@gmail.com' || cleanEmail.startsWith('admin');
  const isManagement = role === 'management' || ['PROJECT_MANAGER', 'FACILITY_MANAGER', 'MAINTENANCE_MANAGER', 'FACILITY_TEAM_LEADER'].includes(jobTitle);
  const isSupervisor = role === 'supervisor';
  const isUser = role === 'user';

  const rawDepts = userData?.departments || [];
  const isAllDepts = isAdmin || isManagement || rawDepts.length >= 15 || rawDepts.includes('all') || rawDepts.includes('كافة الأقسام') || userData?.category === 'all' || userData?.category === 'كافة الأقسام';
  const isRestrictedUser = !isAllDepts;

  const userAuthorizedDepts = useMemo(() => {
    if (isAllDepts) return [];
    if (userData?.departments && Array.isArray(userData.departments) && userData.departments.length > 0) {
      return userData.departments.map((d: string) => normalizeCategory(d));
    }
    if (userData?.category && userData.category !== 'all' && userData.category !== 'كافة الأقسام' && userData.category !== 'الكل' && userData.category !== 'عام') {
      return [normalizeCategory(userData.category)];
    }
    return [];
  }, [userData, isAllDepts]);
  const userCategory = userData?.category || '';

  const [createForm, setCreateForm] = useState({
    dept: isAdmin || isManagement || isSupervisor ? CATEGORIES[0] : userCategory,
    emergency: 'عادي' as string,
    location: '',
    installationLocation: '',
    notes: '',
    isSupplierRequest: false
  });
  const [createItems, setCreateItems] = useState([{ itemId: '', qty: 1 }]);
  const [submitting, setSubmitting] = useState(false);

  // Pre-fill item from URL query param if navigated from inventory
  useEffect(() => {
    const paramItemId = searchParams?.get('itemId');
    const paramDept = searchParams?.get('dept');
    if (paramItemId) {
      setActiveTab('CREATE');
      setCreateItems([{ itemId: paramItemId, qty: 1 }]);
      if (paramDept) {
        setCreateForm(prev => ({ ...prev, dept: paramDept }));
      }
    }
  }, [searchParams]);

  // Print Specific Item State
  const [printItem, setPrintItem] = useState<any>(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [selectedDept, setSelectedDept] = useState('all');

  useEffect(() => {
    if (!isAdmin && !isManagement && !isSupervisor && userCategory && !createForm.dept) {
      setCreateForm(prev => ({ ...prev, dept: userCategory }));
    }
  }, [userCategory, isAdmin, isManagement, isSupervisor, createForm.dept]);

  useEffect(() => {
    const qItems = query(collection(db, 'items'), orderBy('category'));
    const unsubItems = onSnapshot(qItems, (snap) => {
      setItems(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as any)).filter((item: any) => item.name && item.name.trim() !== ''));
    });

    const qReqs = query(collection(db, 'materialRequests'), orderBy('createdAt', 'desc'));
    const unsubReqs = onSnapshot(qReqs, (snap) => {
      const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      list.sort((a: any, b: any) => b.createdAt - a.createdAt);
      setRequests(list);
      setLoading(false);
    });

    const unsubUsers = onSnapshot(collection(db, 'users'), (snap) => {
      const map: Record<string, string> = {};
      snap.docs.forEach(doc => {
        const d = doc.data();
        map[doc.id] = d.name || d.email || 'مستخدم غير معروف';
      });
      setUsersMap(map);
    });

    return () => { unsubItems(); unsubReqs(); unsubUsers(); };
  }, []);

  const handleAddItem = () => setCreateItems([...createItems, { itemId: '', qty: 1 }]);
  const handleRemoveItem = (index: number) => setCreateItems(createItems.filter((_, i) => i !== index));
  const handleItemChange = (index: number, field: string, val: string | number) => {
    const newItems = [...createItems];
    newItems[index] = { ...newItems[index], [field]: val };
    setCreateItems(newItems);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.location) {
      toast(t('requests.locationRequired'));
      return;
    }
    const validItems = createItems.filter(item => item.itemId && item.qty > 0);
    if (validItems.length === 0) {
      toast(t('requests.selectItemRequired'));
      return;
    }

    setSubmitting(true);
    const createReqFn = httpsCallable(functions, 'createMaterialRequest');
    const reqIdBase = `REQ-${Date.now()}`;
    
    try {
      await Promise.all(validItems.map(item => createReqFn({
        ...createForm,
        jobTitle: userData?.jobTitle || '',
        companyName: userData?.companyName || '',
        reqId: reqIdBase,
        itemId: item.itemId,
        qty: Number(item.qty)
      })));

      toast.success(t('requests.sendSuccess'));
      setCreateForm({ ...createForm, location: '', notes: '', isSupplierRequest: false });
      setCreateItems([{ itemId: '', qty: 1 }]);
      setActiveTab('PENDING');
    } catch (error: any) {
      toast.error(t('requests.sendError') + error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSupervisorApprove = async (id: string) => {
    if (!window.confirm(t('requests.confirmSupervisorApprove'))) return;
    try {
      const approveFn = httpsCallable(functions, 'approveBySupervisor');
      await approveFn({ id });
      toast.success(t('requests.supervisorApproveSuccess'));
    } catch (e: any) { toast(e.message); }
  };

  const handleConfirmReceipt = async (id: string) => {
    if (!window.confirm('هل أنت متأكد من استلام هذه المواد وتسجيل الاعتماد الرقمي للاستلام؟')) return;
    try {
      const confirmFn = httpsCallable(functions, 'confirmReceipt');
      const res = await confirmFn({ id });
      toast.success((res.data as any).message);
    } catch (e: any) { toast.error(e.message); }
  };

  const handleApprove = async (id: string) => {
    if (!window.confirm(t('requests.confirmManagementApprove'))) return;
    try {
      const approveFn = httpsCallable(functions, 'approveByManagement');
      await approveFn({ id });
      toast.success(t('requests.managementApproveSuccess'));
    } catch (e: any) { toast(e.message); }
  };

  const handleIssue = async (id: string) => {
    if (!window.confirm(t('requests.confirmIssue'))) return;
    try {
      const issueFn = httpsCallable(functions, 'issueMaterialRequest');
      await issueFn({ id });
      toast.success(t('requests.issueSuccess'));
    } catch (e: any) { toast(e.message); }
  };

  const handleReject = async (id: string) => {
    if (!window.confirm(t('requests.confirmReject'))) return;
    try {
      const rejectFn = httpsCallable(functions, 'rejectMaterialRequest');
      await rejectFn({ id });
    } catch (e: any) { toast(e.message); }
  };

  // Filters based on Role and Filter State
  const filteredRequests = requests.filter(r => {
    // Role and department check
    if (isRestrictedUser && userAuthorizedDepts.length > 0) {
      const c = normalizeCategory(r.category);
      const d = normalizeCategory(r.dept);
      if (!userAuthorizedDepts.includes(d) && !userAuthorizedDepts.includes(c)) return false;
    }
    
    // Dept Filter
    if (selectedDept !== 'all' && normalizeCategory(r.dept) !== normalizeCategory(selectedDept)) return false;
    
    // Date Filter
    if (dateFilter) {
      const rDate = new Date(typeof r.createdAt === 'number' ? r.createdAt : Date.now()).toISOString().split('T')[0];
      if (rDate !== dateFilter) return false;
    }
    
    // Search Term
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      if (!r.reqId?.toLowerCase().includes(term) && !r.userName?.toLowerCase().includes(term) && !r.location?.toLowerCase().includes(term)) {
        return false;
      }
    }
    return true;
  });

  const pendingRequests = filteredRequests.filter(r => {
    if (r.status === 'rejected') return false;
    if (r.status === 'completed') return false;
    if (r.status === 'issued' && r.isApprovedByManagement) return false;
    if (r.status === 'archived') return false;
    return true;
  });
  const archivedRequests = filteredRequests.filter(r => {
    if (r.status === 'rejected') return true;
    if (r.status === 'completed') return true;
    if (r.status === 'issued' && r.isApprovedByManagement) return true;
    if (r.status === 'archived') return true;
    return false;
  });

  const groupRequests = (reqs: any[]) => {
    const groups: Record<string, any> = {};
    reqs.forEach(req => {
      if (!groups[req.reqId]) {
        groups[req.reqId] = {
          reqId: req.reqId,
          userName: req.userName,
          dept: req.dept,
          location: req.location,
          createdAt: req.createdAt,
          notes: req.notes,
          emergency: req.emergency,
          isSupplierRequest: req.isSupplierRequest,
          items: []
        };
      }
      groups[req.reqId].items.push(req);
    });
    return Object.values(groups).sort((a, b) => b.createdAt - a.createdAt);
  };

  const groupedPending = groupRequests(pendingRequests);
  const groupedArchive = groupRequests(archivedRequests);

  const getStatusDisplay = (req: any) => {
    switch (req.status) {
      case 'pending': return { text: language === 'ar' ? 'معلق بانتظار المشرف' : 'Pending Supervisor', badgeClass: 'badge-outline', color: 'var(--accent-warning)' };
      case 'supervisor_approved': return { text: language === 'ar' ? 'معتمد من المشرف (بانتظار المهندس)' : 'Supervisor Approved', badgeClass: 'badge-info', color: '#3b82f6' };
      case 'management_approved': return { text: language === 'ar' ? 'معتمد من الإدارة (جاهز للصرف)' : 'Management Approved', badgeClass: 'badge-info', color: '#8b5cf6' };
      case 'emergency_issued_pending_management': return { text: language === 'ar' ? 'صرف طوارئ (معلق لاعتماد المهندس)' : 'Emergency Issued (Pending Mgmt)', badgeClass: 'badge-warning', color: '#ea580c' };
      case 'issued': return { text: t('requests.statusIssued'), badgeClass: 'badge-success', color: 'var(--accent-success)' };
      case 'completed': return { text: language === 'ar' ? 'تم الاستلام والتأكيد' : 'Completed & Received', badgeClass: 'badge-success', color: '#10b981' };
      case 'supplier_pending_disbursement': return { text: t('requests.statusSupplierPending'), badgeClass: 'badge-info', color: '#3b82f6' };
      case 'rejected': return { text: t('requests.statusRejected'), badgeClass: 'badge-danger', color: 'var(--accent-danger)' };
      default: return { text: req.status, badgeClass: 'badge-outline', color: 'gray' };
    }
  };

  return (
    <div className="animate-fade-in" style={{ paddingBottom: '2rem' }}>
      
      <div className={printItem ? "hide-on-print" : ""}>
        <header className="dashboard-header flex-between glass-card" style={{ padding: '1.5rem 2rem', marginBottom: '2.5rem', borderRadius: 'var(--radius-xl)' }}>
          <div>
            <h1 style={{ margin: '0 0 0.25rem 0', fontSize: '2rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.5px' }}>{t('requests.title')}</h1>
            <p className="text-muted" style={{ margin: 0 }}>{t('requests.subtitle')}</p>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', background: 'var(--bg-tertiary)', padding: '0.5rem', borderRadius: 'var(--radius-lg)' }}>
            <button onClick={() => setActiveTab('CREATE')} className={`btn ${activeTab === 'CREATE' ? 'btn-primary' : 'btn-glass'}`} style={{ borderRadius: 'var(--radius-md)', padding: '0.5rem 1.5rem' }}>
               {t('requests.tabCreate')}
            </button>
            <button onClick={() => setActiveTab('PENDING')} className={`btn ${activeTab === 'PENDING' ? 'btn-primary' : 'btn-glass'}`} style={{ borderRadius: 'var(--radius-md)', padding: '0.5rem 1.5rem' }}>
               {t('requests.tabPending')} ({groupedPending.length})
            </button>
            <button onClick={() => setActiveTab('ARCHIVE')} className={`btn ${activeTab === 'ARCHIVE' ? 'btn-primary' : 'btn-glass'}`} style={{ borderRadius: 'var(--radius-md)', padding: '0.5rem 1.5rem' }}>
               {t('requests.tabArchive')}
            </button>
          </div>
        </header>

        {/* Global Filters for Pending and Archive Tabs */}
        {(activeTab === 'PENDING' || activeTab === 'ARCHIVE') && (
          <div className="flex-between glass-card animate-fade-in" style={{ marginBottom: '1.5rem', padding: '1rem 2rem', flexWrap: 'wrap', gap: '1rem' }}>
            <h2 className="heading-md">{activeTab === 'PENDING' ? t('requests.tabPending') : t('requests.tabArchive')}</h2>
            
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <div style={{ position: 'relative' }}>
                <Search size={18} style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input 
                  type="text" 
                  placeholder="بحث بالرقم، الاسم، أو الموقع..." 
                  className="input-field"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{ paddingRight: '2.5rem', minWidth: '220px' }}
                />
              </div>
              
              <div style={{ position: 'relative' }}>
                <Filter size={18} style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                <select 
                  className="input-field"
                  value={selectedDept}
                  onChange={(e) => setSelectedDept(e.target.value)}
                  style={{ paddingRight: '2.5rem', minWidth: '150px' }}
                >
                  <option value="all">كافة الإدارات</option>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              <div style={{ position: 'relative' }}>
                <input 
                  type="date" 
                  className="input-field"
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                />
              </div>

              <button onClick={() => { setPrintItem(null); setTimeout(() => window.print(), 100); }} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Printer size={16} /> طباعة الكل (تقرير شامل)
              </button>
            </div>
          </div>
        )}
      </div>

      {/* CREATE TAB */}
      {activeTab === 'CREATE' && (
        <div className="hide-on-print glass-card animate-fade-in" style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem' }}>
              <div className="form-group">
                <label>{t('requests.dept')}</label>
                <select className="input-field" value={createForm.dept} onChange={e => setCreateForm({...createForm, dept: e.target.value})} disabled={isUser && !!userCategory}>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>{t('requests.priority')}</label>
                <select className="input-field" value={createForm.emergency} onChange={e => setCreateForm({...createForm, emergency: e.target.value})}>
                  <option value="عادي">{t('requests.priorityNormal')}</option>
                  <option value="عاجل">{t('requests.priorityUrgent')}</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem' }}>
              <div className="form-group">
                <label>{language === 'ar' ? 'الجهة الطالبة (الشركة / القسم / المهندس)' : 'Requesting Party / Department'}</label>
                <input 
                  required 
                  type="text" 
                  className="input-field" 
                  placeholder={language === 'ar' ? 'مثال: شركة Line FM / الصيانة العامة / م. أحمد' : 'e.g. Line FM / General Maintenance'} 
                  value={createForm.location} 
                  onChange={e => setCreateForm({...createForm, location: e.target.value})} 
                />
              </div>
              <div className="form-group">
                <label>{language === 'ar' ? 'مكان / موقع التركيب والوجهة' : 'Installation Location / Destination'}</label>
                <input 
                  required 
                  type="text" 
                  className="input-field" 
                  placeholder={language === 'ar' ? 'مثال: عمارة 12 - شقة 4 / فيلا 15 - المطبخ الرئيسي' : 'e.g. Building 12 - Apt 4 / Villa 15'} 
                  value={createForm.installationLocation} 
                  onChange={e => setCreateForm({...createForm, installationLocation: e.target.value})} 
                />
              </div>
            </div>

            <div>
              <div className="flex-between" style={{ marginBottom: '1rem' }}>
                <label style={{ margin: 0 }}>{t('requests.requestedItems')}</label>
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {createItems.map((item, index) => (
                  <div key={index} style={{ display: 'grid', gridTemplateColumns: '1fr 120px 50px', gap: '1rem', alignItems: 'center' }}>
                    <select required className="input-field" value={item.itemId} onChange={e => handleItemChange(index, 'itemId', e.target.value)}>
                      <option value="">{t('requests.selectItemPrompt')}</option>
                      {items.filter(i => (isAdmin || isManagement) ? true : i.category === userCategory).map(i => (
                        <option key={i.id} value={i.id}>
                          {i.name} ({i.code})
                        </option>
                      ))}
                    </select>
                    <input required type="number" min="1" className="input-field" value={item.qty} onChange={e => handleItemChange(index, 'qty', e.target.value)} />
                    {createItems.length > 1 && (
                      <button type="button" onClick={() => handleRemoveItem(index)} className="btn btn-danger" style={{ padding: '0.6rem' }}><X size={18} /></button>
                    )}
                  </div>
                ))}
              </div>
              <button type="button" onClick={handleAddItem} className="btn btn-outline" style={{ marginTop: '1rem', width: '100%', borderStyle: 'dashed' }}>
                <Plus size={18} /> {t('requests.addAnotherItem')}
              </button>
            </div>

            <div className="form-group">
              <label>{t('requests.notesOptional')}</label>
              <textarea className="input-field" rows={3} placeholder={t('requests.notesPlaceholder')} value={createForm.notes} onChange={e => setCreateForm({...createForm, notes: e.target.value})}></textarea>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
              <button type="submit" disabled={submitting} className="btn btn-primary" style={{ padding: '0.8rem 2.5rem', fontSize: '1.1rem' }}>
                {submitting ? t('requests.sending') : t('requests.sendBtn')}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* PENDING / ARCHIVE (Printable Document) */}
      {(activeTab === 'PENDING' || activeTab === 'ARCHIVE') && (
        <div className={`glass-card animate-fade-in ${printItem ? 'hide-on-print' : ''}`} style={{ padding: '1.5rem' }}>
          
          <PrintHeader 
            title={activeTab === 'PENDING' ? "تقرير الطلبات المعلقة والمرفوضة" : "تقرير أرشيف الطلبات المنصرفة"}
            subtitle="قائمة بطلبات صرف المواد من المخازن"
            category={selectedDept === 'all' ? 'كافة الإدارات' : selectedDept}
          />

          {loading ? (
            <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>{t('common.loading')}</div>
          ) : (activeTab === 'PENDING' ? groupedPending : groupedArchive).length === 0 ? (
            <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-lg)' }}>
              {activeTab === 'PENDING' ? t('requests.noPendingRequests') : t('requests.noArchiveRequests')}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
              {(activeTab === 'PENDING' ? groupedPending : groupedArchive).map((group: any) => (
                <div key={group.reqId} className="glass-card" style={{ padding: 0, overflow: 'hidden', border: '2px solid var(--border-light)' }}>
                  
                  <div className="flex-between" style={{ padding: '1.5rem', background: 'var(--bg-tertiary)', borderBottom: '2px solid var(--border-light)' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
                        <h3 className="heading-lg" style={{ margin: 0 }}>{group.reqId}</h3>
                        {group.emergency === 'عاجل' && <span className="badge badge-danger" style={{ display: 'inline-block' }}>{t('requests.priorityUrgent')}</span>}
                      </div>
                      <div style={{ display: 'flex', gap: '1.5rem', fontSize: '0.85rem', color: 'var(--text-muted)', flexWrap: 'wrap' }}>
                        <span><strong>{t('requests.requester')}:</strong> {group.userName}</span>
                        <span><strong>{t('requests.dept')}:</strong> {group.dept}</span>
                        <span><strong>{t('requests.workLocation')}:</strong> {group.location}</span>
                        <span><strong>{t('common.date')}:</strong> {new Date(typeof group.createdAt === 'number' ? group.createdAt : Date.now()).toLocaleString(language === 'ar' ? 'ar-EG' : 'en-GB')}</span>
                      </div>
                    </div>
                    <div className="hide-on-print">
                      <button 
                        onClick={() => { setPrintItem(group); setTimeout(() => window.print(), 100); }} 
                        className="btn btn-outline" 
                        style={{ padding: '0.5rem 1rem', color: 'var(--accent-primary)', borderColor: 'var(--border-light)' }}
                        title="طباعة إذن صرف مخصص لهذا الطلب"
                      >
                        <Printer size={18} style={{ display: 'inline', marginRight: '6px' }} /> طباعة الطلب
                      </button>
                    </div>
                  </div>

                  <div className="table-container" style={{ padding: '1.5rem', overflowX: 'auto' }}>
                    <table className="wms-table official-print-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right' }}>
                        <thead>
                          <tr>
                            <th>{t('common.item')}</th>
                            <th>{t('common.code')}</th>
                            <th>{t('common.quantity')}</th>
                            <th className="show-on-print-only">الجهة الطالبة (المستلم)</th>
                            <th className="show-on-print-only">الاعتمادات (مسؤول الصرف)</th>
                            <th>{t('common.status')}</th>
                            {activeTab === 'PENDING' && <th className="hide-on-print" style={{ width: '350px' }}>{t('common.actions')}</th>}
                          </tr>
                        </thead>
                      <tbody>
                        {group.items.map((item: any) => {
                          const sd = getStatusDisplay(item);
                          return (
                            <tr key={item.id}>
                              <td style={{ fontWeight: 500 }}>{item.itemName}</td>
                              <td style={{ color: 'var(--text-muted)' }}>{item.itemCode}</td>
                              <td><strong style={{ fontSize: '1.1rem' }}>{item.qty}</strong></td>
                              <td className="show-on-print-only" style={{ fontSize: '0.85rem' }}>
                                {item.companyName ? (
                                  <>
                                    <strong>الشركة: </strong> {item.companyName} <br />
                                    <strong>المهندس: </strong> {item.userName}
                                  </>
                                ) : (
                                  <>
                                    {item.userName}<br/>
                                    <span style={{ color: '#666' }}>({item.dept})</span>
                                  </>
                                )}
                                {item.installationLocation && (
                                  <div style={{ marginTop: '4px', fontSize: '0.8rem', color: '#0056b3' }}>
                                    موقع التركيب: {item.installationLocation}
                                  </div>
                                )}
                              </td>
                              <td className="show-on-print-only" style={{ fontSize: '0.8rem', color: '#444' }}>
                                {item.managementResolvedBy ? `إدارة: ${usersMap[item.managementResolvedBy] || 'معتمد'}` : (item.supervisorResolvedBy ? `مشرف: ${usersMap[item.supervisorResolvedBy] || 'معتمد'}` : '-')}
                                {item.adminDisbursedBy && <div>صرف: {usersMap[item.adminDisbursedBy] || 'أمين المخزن'}</div>}
                              </td>
                              <td>
                                <span className={`badge ${sd.badgeClass} hide-on-print`} style={{ background: `${sd.color}20`, color: sd.color, border: `1px solid ${sd.color}40` }}>
                                  {sd.text}
                                </span>
                                <span className="show-on-print-only" style={{ fontWeight: 'bold' }}>{sd.text}</span>
                              </td>
                              {activeTab === 'PENDING' && (
                                <td className="hide-on-print">
                                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                    
                                    {/* 1. Supervisor Approval: Only visible to Supervisor */}
                                    {!item.isApprovedBySupervisor && isSupervisor && (
                                      <button className="btn" style={{ padding: '0.5rem', flex: 1, background: 'var(--accent-info-glass)', color: 'var(--accent-info)', fontSize: '0.8rem' }} onClick={() => handleSupervisorApprove(item.id)}>
                                        <ShieldCheck size={14} style={{ display: 'inline', marginRight: '4px' }} /> {t('requests.actionSupervisorApprove')}
                                      </button>
                                    )}

                                    {/* 2. Management Approval: Only visible to Management (Facility/Maintenance Engineer) */}
                                    {!item.isApprovedByManagement && isManagement && (item.isApprovedBySupervisor || item.isDisbursedByAdmin) && (
                                      <button className="btn" style={{ padding: '0.5rem', flex: 1, background: 'var(--accent-primary-glass)', color: 'var(--accent-primary)', fontSize: '0.8rem' }} onClick={() => handleApprove(item.id)}>
                                        <ShieldCheck size={14} style={{ display: 'inline', marginRight: '4px' }} /> {item.isDisbursedByAdmin ? (language === 'ar' ? 'اعتماد لاحق (طوارئ)' : 'Post-Approve (Emergency)') : t('requests.actionManagementApprove')}
                                      </button>
                                    )}

                                    {/* 3. Warehouse Disbursement: Visible to Admin ONLY after Management approval, OR immediately for Emergency requests */}
                                    {!item.isDisbursedByAdmin && isAdmin && (item.isApprovedByManagement || item.emergency === 'عاجل') && (
                                      <button 
                                        className="btn" 
                                        style={{ 
                                          padding: '0.5rem', 
                                          flex: 1, 
                                          background: item.emergency === 'عاجل' && !item.isApprovedByManagement ? '#ea580c20' : 'var(--accent-success-glass)', 
                                          color: item.emergency === 'عاجل' && !item.isApprovedByManagement ? '#ea580c' : 'var(--accent-success)', 
                                          border: item.emergency === 'عاجل' && !item.isApprovedByManagement ? '1px solid #ea580c' : undefined,
                                          fontSize: '0.8rem' 
                                        }} 
                                        onClick={() => handleIssue(item.id)}
                                      >
                                        <Box size={14} style={{ display: 'inline', marginRight: '4px' }} /> 
                                        {item.emergency === 'عاجل' && !item.isApprovedByManagement 
                                          ? (language === 'ar' ? 'صرف طوارئ (معلق للاعتماد)' : 'Emergency Issue (Pending Mgmt)') 
                                          : t('requests.actionIssue')}
                                      </button>
                                    )}

                                    {/* 4. Requester Receipt Confirmation */}
                                    {item.isDisbursedByAdmin && !item.isReceivedByRequester && (item.userId === user?.uid || isAdmin) && (
                                      <button className="btn" style={{ padding: '0.5rem', flex: 1, background: '#10b98120', color: '#10b981', fontSize: '0.8rem', border: '1px solid #10b981' }} onClick={() => handleConfirmReceipt(item.id)}>
                                        <Check size={14} style={{ display: 'inline', marginRight: '4px' }} /> {language === 'ar' ? 'تأكيد استلام المواد' : 'Confirm Receipt'}
                                      </button>
                                    )}

                                    {/* 5. Reject Request */}
                                    {(!item.isDisbursedByAdmin) && (isManagement || isSupervisor || (isUser && item.userId === user?.uid)) && (
                                      <button className="btn" style={{ padding: '0.5rem', background: 'var(--accent-danger-glass)', color: 'var(--accent-danger)' }} onClick={() => handleReject(item.id)} title={t('requests.actionReject')}>
                                        <X size={16} />
                                      </button>
                                    )}

                                  </div>
                                </td>
                              )}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                </div>
              ))}
            </div>
          )}

          <PrintSignatures documentTitle="إذن وطلب صرف مهمات" />
        </div>
      )}

      {/* ──── SINGLE ITEM PRINT LAYOUT ──── */}
      {printItem && (
        <div className="show-on-print-only official-document-paper" style={{ padding: '2rem' }}>
          <PrintHeader 
            title="إذن / طلب صرف مهمات"
            subtitle={`طلب رقم: ${printItem.reqId}`}
            category={printItem.dept}
          />
          <div style={{ margin: '3rem 0', display: 'flex', flexDirection: 'column', gap: '1.5rem', fontSize: '1.2rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div><strong style={{ color: 'var(--text-muted)' }}>التاريخ:</strong> {new Date(typeof printItem.createdAt === 'number' ? printItem.createdAt : Date.now()).toLocaleString('ar-EG')}</div>
              <div><strong style={{ color: 'var(--text-muted)' }}>مقدم الطلب:</strong> {printItem.userName}</div>
              <div><strong style={{ color: 'var(--text-muted)' }}>موقع العمل / الوجهة:</strong> {printItem.location}</div>
              <div>
                <strong style={{ color: 'var(--text-muted)' }}>حالة الطلب:</strong>{' '}
                {printItem.emergency === 'عاجل' ? <span style={{ color: 'var(--accent-danger)' }}>طوارئ (عاجل)</span> : 'عادي'}
              </div>
            </div>
            
            <table className="wms-table official-print-table" style={{ marginTop: '2rem', borderCollapse: 'collapse', width: '100%' }}>
              <thead>
                <tr>
                  <th>الكود</th>
                  <th>الصنف المطلوبة</th>
                  <th>الكمية</th>
                  <th>الملاحظات</th>
                </tr>
              </thead>
              <tbody>
                {printItem.items.map((item: any, idx: number) => (
                  <tr key={idx}>
                    <td>{item.itemCode}</td>
                    <td style={{ fontWeight: 600 }}>{item.itemName}</td>
                    <td><strong style={{ fontSize: '1.3rem' }}>{item.qty}</strong></td>
                    <td>{printItem.notes || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <PrintSignatures 
            requesterName={printItem.companyName ? `${printItem.companyName} / ${printItem.userName}` : printItem.userName}
            supervisorName={usersMap[printItem.supervisorResolvedBy] || (printItem.isApprovedBySupervisor ? 'معتمد تلقائياً / مسار إداري' : '')}
            managementName={usersMap[printItem.managementResolvedBy] || (printItem.isApprovedByManagement ? 'معتمد تلقائياً / إداري' : '')}
            adminName={usersMap[printItem.adminDisbursedBy] || ''}
          />
        </div>
      )}

    </div>
  );
}

export default function RequestsPage() {
  return (
    <React.Suspense fallback={<div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>جاري التحميل...</div>}>
      <RequestsContent />
    </React.Suspense>
  );
}
