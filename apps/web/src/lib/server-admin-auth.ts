import { auth } from '@/lib/firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';

let isAuthenticating = false;

export async function ensureServerAdminAuth() {
  if (auth.currentUser && (auth.currentUser.email === 'mohamedalghala@gmail.com' || auth.currentUser.email === 'admin@calm.com')) {
    return auth.currentUser;
  }

  if (isAuthenticating) {
    await new Promise(resolve => setTimeout(resolve, 500));
    if (auth.currentUser) return auth.currentUser;
  }

  isAuthenticating = true;
  try {
    const adminEmail = process.env.SERVER_ADMIN_EMAIL || 'mohamedalghala@gmail.com';
    const adminPass = process.env.SERVER_ADMIN_PASSWORD || 'password123';
    const cred = await signInWithEmailAndPassword(auth, adminEmail, adminPass);
    return cred.user;
  } catch (err: any) {
    console.error('Failed to authenticate server admin session:', err.message);
    throw err;
  } finally {
    isAuthenticating = false;
  }
}
