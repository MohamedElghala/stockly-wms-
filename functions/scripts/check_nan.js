
const { initializeApp, getApps } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

if (!getApps().length) {
  initializeApp({ projectId: 'demo-calm-wms' });
}
const db = getFirestore();
db.settings({ host: '127.0.0.1:8080', ssl: false });

async function run() {
  const snap = await db.collection('items').get();
  let errors = 0;
  snap.forEach(doc => {
    const data = doc.data();
    if (isNaN(data.stock) || isNaN(data.openingBalance) || isNaN(data.totalIn) || isNaN(data.totalOut)) {
      console.log('NaN found in doc:', doc.id, data);
      errors++;
    }
  });
  console.log('Total docs with NaN:', errors);
}
run();

