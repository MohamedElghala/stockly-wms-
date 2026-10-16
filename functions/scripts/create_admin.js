
const { initializeApp } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const { getFirestore } = require('firebase-admin/firestore');

initializeApp({ projectId: 'demo-calm-wms' });
const auth = getAuth();
const db = getFirestore();
db.settings({ host: '127.0.0.1:8080', ssl: false });

async function run() {
  try {
    const user = await auth.createUser({
      email: 'admin@calm.com',
      password: 'password123',
      displayName: '?????? ?????',
    });
    console.log('Created Auth user:', user.uid);
    await db.collection('users').doc(user.uid).set({
      email: 'admin@calm.com',
      name: '?????? ?????',
      jobTitle: '???? ??????',
      category: '?????',
      role: 'admin',
      roleClass: 'role-admin',
      createdAt: Date.now()
    });
    console.log('Created Firestore user document.');
  } catch (e) {
    console.log('Error (maybe already exists):', e.message);
  }
}
run();

