import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { getFunctions, connectFunctionsEmulator } from 'firebase/functions';
import { getStorage, connectStorageEmulator } from 'firebase/storage';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "stockly-wms.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "stockly-wms",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "stockly-wms.appspot.com",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "",
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || ""
};

const apps = getApps();
export const app = apps.length === 0 ? initializeApp(firebaseConfig) : apps[0];
export const db = getFirestore(app);
export const auth = getAuth(app);
export const functions = getFunctions(app);
export const storage = getStorage(app);

// Connect to emulators only when explicitly using demo- prefix or when USE_FIREBASE_EMULATOR is true
const useEmulator = process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATOR === 'true' || firebaseConfig.projectId.startsWith('demo-');

if (useEmulator && process.env.NODE_ENV !== 'production') {
  const host = typeof window !== 'undefined' && window.location.hostname ? window.location.hostname : '127.0.0.1';

  // Check if we are already connected to prevent warnings on hot-reload
  if (!(db as any)._settingsFrozen) {
    try {
      connectFirestoreEmulator(db, host, 8080);
    } catch (e) {}
  }
  
  if (!(auth as any).emulatorConfig) {
    try {
      connectAuthEmulator(auth, `http://${host}:9099`, { disableWarnings: true });
    } catch (e) {}
  }

  // Add functions emulator
  try {
    connectFunctionsEmulator(functions, host, 5001);
  } catch(e) {}
  
  // Add storage emulator
  try {
    connectStorageEmulator(storage, host, 9199);
  } catch(e) {}
}
