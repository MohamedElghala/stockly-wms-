
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword, connectAuthEmulator } from 'firebase/auth';

const app = initializeApp({
  projectId: 'demo-calm-wms',
  apiKey: 'demo-api-key',
  authDomain: 'demo-calm-wms.firebaseapp.com'
});
const auth = getAuth(app);
connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });

async function run() {
  try {
    const cred = await signInWithEmailAndPassword(auth, 'admin@calm.com', 'password123');
    console.log('Success:', cred.user.uid);
  } catch (e) {
    console.error('Error:', e.code, e.message);
  }
}
run();

