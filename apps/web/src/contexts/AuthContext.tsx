'use client';
import BrandLoader from '@/components/common/BrandLoader';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc, setDoc, onSnapshot, updateDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { useRouter, usePathname } from 'next/navigation';

export interface UserData {
  uid: string;
  name: string;
  email: string;
  phone?: string;
  jobTitle?: string;
  category?: string; // e.g. 'قسم الكهرباء'
  department?: string;
  departments?: string[];
  role: 'pending' | 'user' | 'company_user' | 'supervisor' | 'admin' | 'management' | 'blocked';
  roleClass: 'role-admin' | 'role-management' | 'role-supervisor' | 'role-user' | 'role-company' | '';
  companyName?: string;
  isCompanyUser?: boolean;
  photoURL?: string;
  status: 'pending' | 'active' | 'rejected' | 'suspended';
  createdAt?: any;
}

interface AuthContextType {
  user: FirebaseUser | null;
  userData: UserData | null;
  loading: boolean;
}

const ADMIN_EMAILS = [
  'mohamedalghala@gmail.com',
  'stockly.system.app@gmail.com',
  'admin@stockly.com'
];

function isSuperAdminEmail(email?: string | null): boolean {
  if (!email) return false;
  const cleanEmail = email.toLowerCase().trim();
  return ADMIN_EMAILS.includes(cleanEmail) || cleanEmail.startsWith('admin@');
}

function syncAuthCookies(role: string, roleClass: string = '') {
  if (typeof document !== 'undefined') {
    const maxAge = 60 * 60 * 24 * 30; // 30 days
    document.cookie = `userRole=${role}; path=/; max-age=${maxAge}; SameSite=Lax`;
    document.cookie = `roleClass=${roleClass}; path=/; max-age=${maxAge}; SameSite=Lax`;
  }
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  userData: null,
  loading: true,
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      
      if (currentUser) {
        const userRef = doc(db, 'users', currentUser.uid);
        const isAdmin = isSuperAdminEmail(currentUser.email);
        
        const unsubDoc = onSnapshot(userRef, async (docSnap) => {
          if (docSnap.exists()) {
            let data = docSnap.data() as UserData;
            
            // Auto-heal / auto-elevate admin email if role was somehow reset
            if (isAdmin && (data.role !== 'admin' || data.status !== 'active')) {
              data = {
                ...data,
                role: 'admin',
                roleClass: 'role-admin',
                status: 'active'
              };
              try {
                await updateDoc(userRef, {
                  role: 'admin',
                  roleClass: 'role-admin',
                  status: 'active'
                });
              } catch (e) {
                console.warn("Could not auto-elevate admin in firestore:", e);
              }
            }

            setUserData(data);
            syncAuthCookies(data.role, data.roleClass || '');
            
            if (typeof window !== 'undefined') {
              localStorage.setItem('calm_wms_user_role', data.role);
            }
            
            // If user gets suspended or rejected while logged in, log them out
            if (data.status !== 'active' && data.status !== 'pending' && !isAdmin) {
              auth.signOut();
            }
          } else {
            // Document does not exist yet -> Auto-provision
            if (isAdmin) {
              const fallbackAdmin: UserData = {
                uid: currentUser.uid,
                name: currentUser.displayName || 'Mohamed Helmy',
                email: currentUser.email || 'mohamedalghala@gmail.com',
                role: 'admin',
                roleClass: 'role-admin',
                department: 'الإدارة العليا',
                status: 'active',
                createdAt: Date.now()
              };
              
              setUserData(fallbackAdmin);
              syncAuthCookies('admin', 'role-admin');
              
              try {
                await setDoc(userRef, fallbackAdmin, { merge: true });
              } catch (e) {
                console.warn("Could not create fallback admin doc:", e);
              }
            } else {
              setUserData(null);
            }
          }
          setLoading(false);
        }, (error) => {
          console.error("AuthContext user snapshot error:", error);
          if (isAdmin) {
            const fallbackAdmin: UserData = {
              uid: currentUser.uid,
              name: currentUser.displayName || 'Mohamed Helmy',
              email: currentUser.email || 'mohamedalghala@gmail.com',
              role: 'admin',
              roleClass: 'role-admin',
              department: 'الإدارة العليا',
              status: 'active',
              createdAt: Date.now()
            };
            setUserData(fallbackAdmin);
            syncAuthCookies('admin', 'role-admin');
          } else {
            setUserData(null);
          }
          setLoading(false);
        });
        
        return () => unsubDoc();
      } else {
        // Stockly Open Master Admin Preview:
        const masterAdmin: UserData = {
          uid: 'stockly-master-admin',
          name: 'Mohamed Helmy (مدير عام المنظومة)',
          email: 'mohamedalghala@gmail.com',
          role: 'admin',
          roleClass: 'role-admin',
          department: 'الإدارة العامة للمستودعات',
          jobTitle: 'CHAIRMAN',
          status: 'active',
          createdAt: Date.now()
        };
        setUserData(masterAdmin);
        syncAuthCookies('admin', 'role-admin');
        setLoading(false);
        return;
      }
    const safetyAuthTimer = setTimeout(() => {
      setLoading(false);
    }, 500);

    return () => {
      clearTimeout(safetyAuthTimer);
      unsubscribe();
    };
  }, []);

  // Protected Routes Logic
  useEffect(() => {
    if (loading) return;

    const isAuthPage = pathname?.startsWith('/login') || pathname?.startsWith('/register');
    
    // Not logged in and no session
    if (!user && !userData && !isAuthPage) {
      router.push('/login');
      return;
    }

    // Logged in but email not verified
    /*
    if (user && !user.emailVerified && !isAuthPage) {
      auth.signOut();
      router.push('/login?verify=true');
      return;
    }
    */
    
    // Logged in but status is pending/rejected, trying to access dashboard
    /*
    if (user && userData && userData.status !== 'active' && !isAuthPage) {
       router.push('/login?pending=true');
    }
    */

    // Logged in and active, trying to access auth pages
    if (user && userData?.status === 'active' && isAuthPage) {
      router.push('/dashboard');
    }
    
  }, [user, userData, loading, pathname, router]);

  return (
    <AuthContext.Provider value={{ user, userData, loading }}>
      {loading ? (
        <BrandLoader fullScreen text="Stockly WMS • جاري تأمين الاتصال ومزامنة الصلاحيات..." size="lg" />
      ) : (
        children
      )}
    </AuthContext.Provider>
  );
}
