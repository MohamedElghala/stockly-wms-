import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import fs from 'fs';
import path from 'path';

const firebaseConfig = {
  apiKey: 'AIzaSyBov0NrvjGouy7iByl4qGb6CpRVWsEc9CM',
  authDomain: 'the-calm-wms.firebaseapp.com',
  projectId: 'the-calm-wms',
  storageBucket: 'the-calm-wms.firebasestorage.app',
  messagingSenderId: '126854098426',
  appId: '1:126854098426:web:e9ec91d278cc2d743f8843'
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

async function exportBackup() {
  console.log('Authenticating with Firebase Auth...');
  await signInWithEmailAndPassword(auth, 'mohamedalghala@gmail.com', 'password123');
  console.log('Authentication successful.');

  const collections = ['items', 'additions', 'disbursements', 'users', 'materialRequests', 'requests'];
  const fullBackup = {
    timestamp: new Date().toISOString(),
    collections: {}
  };

  for (const colName of collections) {
    try {
      console.log(`Exporting collection: ${colName}...`);
      const snap = await getDocs(collection(db, colName));
      const docs = [];
      snap.forEach(d => {
        docs.push({ id: d.id, ...d.data() });
      });
      fullBackup.collections[colName] = docs;
      console.log(`  Exported ${docs.length} documents from ${colName}.`);
    } catch (err) {
      console.log(`  Warning: Could not export ${colName}: ${err.message}`);
    }
  }

  const outPath = 'C:\\Users\\Mohamed Helmy\\.gemini\\antigravity\\brain\\4644325f-c2d1-44e5-8356-23b4b57cbdd3\\scratch\\live_firestore_backup_20261002.json';
  fs.writeFileSync(outPath, JSON.stringify(fullBackup, null, 2), 'utf-8');
  const stats = fs.statSync(outPath);
  console.log(`\nLIVE FIRESTORE BACKUP COMPLETED SUCCESSFULLY!`);
  console.log(`Saved to: ${outPath} (${(stats.size / 1024 / 1024).toFixed(2)} MB)`);
  process.exit(0);
}

exportBackup().catch(err => {
  console.error('Fatal backup error:', err);
  process.exit(1);
});
