
const { initializeApp, getApps } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

if (!getApps().length) {
  initializeApp({ projectId: 'demo-calm-wms' });
}
const db = getFirestore();
db.settings({
    host: '127.0.0.1:8080',
    ssl: false
});

async function run() {
  try {
    const snap = await db.collection('items').get();
    console.log('Total items in DB:', snap.size);
  } catch(e) {
    console.error('Error:', e);
  }
}
run();

