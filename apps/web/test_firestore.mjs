
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator, doc, getDoc } from 'firebase/firestore';

const app = initializeApp({
  projectId: 'demo-calm-wms',
  apiKey: 'demo-api-key',
  authDomain: 'demo-calm-wms.firebaseapp.com'
});
const auth = getAuth(app);
connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });

const db = getFirestore(app);
connectFirestoreEmulator(db, '127.0.0.1', 8080);

async function run() {
  try {
    const cred = await signInWithEmailAndPassword(auth, 'admin@calm.com', 'password123');
    console.log('Logged in:', cred.user.uid);
    const userRef = doc(db, 'users', cred.user.uid);
    const snapshot = await getDoc(userRef);
    console.log('Doc exists:', snapshot.exists());
    if (snapshot.exists()) {
      console.log('Data:', snapshot.data());
    }
  } catch (e) {
    console.error('Error:', e.code, e.message);
  }
}
run();

