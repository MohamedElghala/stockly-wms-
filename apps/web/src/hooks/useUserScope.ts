'use client';

import { useMemo } from 'react';
import { useAuth, UserData } from '@/contexts/AuthContext';
import { normalizeCategory } from '@/types/inventory';

export interface UserScope {
  user: any;
  userData: UserData | null;
  loading: boolean;
  isAdmin: boolean;
  isManagement: boolean;
  isSupervisor: boolean;
  isUser: boolean;
  isRestricted: boolean;
  authorizedDepartments: string[];
  departmentLabel: string;
  formattedTitle: string;
  roleBadgeText: string;
  filterItems: <T extends { category?: string }>(items: T[]) => T[];
  filterDisbursements: <T extends { department?: string; category?: string }>(disbursements: T[]) => T[];
  filterRequests: <T extends { dept?: string; category?: string }>(requests: T[]) => T[];
  canAccessPage: (pathname: string) => boolean;
}

const JOB_TITLE_MAP: Record<string, string> = {
  'CHAIRMAN': 'رئيس مجلس الإدارة',
  'EXECUTIVE': 'المدير التنفيذي (CEO)',
  'PROJECT_MANAGER': 'مدير المشروع',
  'FACILITY_TEAM_LEADER': 'قائد فريق المرافق',
  'STOREKEEPER': 'أمين المخازن',
  'IRRIGATION_ENGINEER': 'مهندس الري',
  'SITE_ENGINEER': 'مهندس الري',
  'DEPARTMENT_SUPERVISOR': 'مشرف قسم',
  'CLEANING_SUPERVISOR': 'مشرف خدمات ونظافة',
  'HELP_DESK': 'مكتب المساعدة والدعم الفني (Help Desk)',
  'TECHNICIAN': 'فني صيانة وتشغيل',
  'WORKER': 'عامل مخزن',
  'SUPER_ADMIN': 'أمين المخازن',
};

export function formatJobTitle(jobTitle?: string, role?: string): string {
  if (jobTitle && JOB_TITLE_MAP[jobTitle]) return JOB_TITLE_MAP[jobTitle];
  if (jobTitle) return jobTitle;
  if (role === 'admin') return 'أمين المخازن';
  if (role === 'management') return 'مدير إدارة المرافق';
  if (role === 'supervisor') return 'مشرف قسم';
  return 'فني / مستخدم';
}

export function useUserScope(): UserScope {
  const { user, userData, loading } = useAuth();

  const role = userData?.role || 'user';
  const jobTitle = userData?.jobTitle || '';
  const email = (userData?.email || user?.email || '').toLowerCase();

  const isAdmin = role === 'admin' || email === 'mohamedalghala@gmail.com' || email.startsWith('admin');
  const isManagement = role === 'management' || ['PROJECT_MANAGER', 'FACILITY_MANAGER', 'MAINTENANCE_MANAGER', 'FACILITY_TEAM_LEADER'].includes(jobTitle);
  const isSupervisor = role === 'supervisor';
  const isUser = role === 'user';

  const rawDepts = userData?.departments || [];
  const isAllDepartments = isAdmin || isManagement || rawDepts.length >= 15 || rawDepts.includes('all') || rawDepts.includes('كافة الأقسام') || userData?.category === 'all' || userData?.category === 'كافة الأقسام';

  const isRestricted = !isAllDepartments;

  // Single Source of Truth for Authorized Departments
  const authorizedDepartments = useMemo<string[]>(() => {
    if (isAllDepartments) return [];
    if (userData?.departments && Array.isArray(userData.departments) && userData.departments.length > 0) {
      return userData.departments.map(d => normalizeCategory(d));
    }
    if (userData?.category && userData.category !== 'all' && userData.category !== 'كافة الأقسام' && userData.category !== 'الكل' && userData.category !== 'عام') {
      return [normalizeCategory(userData.category)];
    }
    if (userData?.department && userData.department !== 'all' && userData.department !== 'كافة الأقسام' && userData.department !== 'الكل' && userData.department !== 'عام') {
      return [normalizeCategory(userData.department)];
    }
    return [];
  }, [userData, isAllDepartments]);

  const departmentLabel = useMemo(() => {
    if (isAllDepartments) return 'كافة الأقسام';
    if (authorizedDepartments.length > 0) return authorizedDepartments.join(' • ');
    return 'كافة الأقسام';
  }, [isAllDepartments, authorizedDepartments]);

  const jobTitleText = formatJobTitle(userData?.jobTitle, role);

  const formattedTitle = useMemo(() => {
    const name = userData?.name || 'المستخدم';
    if (isAllDepartments) {
      return `${name} | ${jobTitleText}`;
    }
    return `${name} | ${jobTitleText} (${departmentLabel})`;
  }, [userData, isAllDepartments, jobTitleText, departmentLabel]);

  const roleBadgeText = useMemo(() => {
    if (isAdmin) return 'أمين المخازن';
    if (isManagement) return 'مدير إدارة المرافق';
    if (isSupervisor) return `مشرف قسم (${departmentLabel})`;
    return `فني (${departmentLabel})`;
  }, [isAdmin, isManagement, isSupervisor, departmentLabel]);

  // Filtering helpers
  const filterItems = <T extends { category?: string }>(items: T[]): T[] => {
    if (!isRestricted || authorizedDepartments.length === 0) return items;
    return items.filter(item => {
      const cat = normalizeCategory(item.category);
      return authorizedDepartments.includes(cat);
    });
  };

  const filterDisbursements = <T extends { department?: string; category?: string }>(disbursements: T[]): T[] => {
    if (!isRestricted || authorizedDepartments.length === 0) return disbursements;
    return disbursements.filter(d => {
      const dept = normalizeCategory(d.department);
      const cat = normalizeCategory(d.category);
      return authorizedDepartments.includes(dept) || authorizedDepartments.includes(cat);
    });
  };

  const filterRequests = <T extends { dept?: string; category?: string }>(requests: T[]): T[] => {
    if (!isRestricted || authorizedDepartments.length === 0) return requests;
    return requests.filter(r => {
      const dept = normalizeCategory(r.dept);
      const cat = normalizeCategory(r.category);
      return authorizedDepartments.includes(dept) || authorizedDepartments.includes(cat);
    });
  };

  // Route permission checker
  const canAccessPage = (pathname: string): boolean => {
    if (pathname === '/item-ledger') {
      return isAdmin;
    }
    if (pathname === '/inventory-sheets') {
      return isAdmin || isManagement;
    }
    if (pathname === '/users') {
      return isAdmin || isManagement;
    }
    return true;
  };

  return {
    user,
    userData,
    loading,
    isAdmin,
    isManagement,
    isSupervisor,
    isUser,
    isRestricted,
    authorizedDepartments,
    departmentLabel,
    formattedTitle,
    roleBadgeText,
    filterItems,
    filterDisbursements,
    filterRequests,
    canAccessPage
  };
}
