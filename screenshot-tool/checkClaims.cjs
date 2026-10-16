const { initializeApp } = require('firebase/app');
const { getAuth, connectAuthEmulator, signInWithEmailAndPassword } = require('firebase/auth');

const firebaseConfig = {
  projectId: 'demo-calm-wms',
  apiKey: "demo-api-key",
  authDomain: "demo-calm-wms.firebaseapp.com",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });

async function checkClaims() {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, 'admin@calm.local', 'password123');
    const tokenResult = await userCredential.user.getIdTokenResult(true);
    console.log('Claims:', tokenResult.claims);
  } catch (error) {
    console.error('Error signing in:', error.message);
  } finally {
    process.exit(0);
  }
}

checkClaims();
