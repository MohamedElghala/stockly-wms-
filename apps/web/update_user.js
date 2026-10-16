const admin = require('firebase-admin');

process.env.FIREBASE_AUTH_EMULATOR_HOST = '127.0.0.1:9099';
process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080';

admin.initializeApp({
  projectId: 'demo-wms'
});

async function run() {
  try {
    const email = 'mohamedalghala@gmail.com';
    const userRecord = await admin.auth().getUserByEmail(email);
    
    // 1. Verify Email
    await admin.auth().updateUser(userRecord.uid, {
      emailVerified: true
    });
    console.log('User email verified in Auth!');

    // 2. Activate in Firestore & Make CEO
    const db = admin.firestore();
    await db.collection('users').doc(userRecord.uid).update({
      status: 'active',
      role: 'CEO'
    });
    console.log('User status updated to active and role to CEO in Firestore!');
    
    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

run();
