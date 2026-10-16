const { initializeApp } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');

// Point to the local emulators
process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080';
process.env.FIREBASE_AUTH_EMULATOR_HOST = '127.0.0.1:9099';

initializeApp({
  projectId: 'demo-calm-wms'
});

async function makeAdmin(email) {
  try {
    const auth = getAuth();
    const db = getFirestore();

    console.log(`Looking for user with email: ${email}`);
    const userRecord = await auth.getUserByEmail(email);
    console.log(`Found user: ${userRecord.uid}`);

    // Update custom claims
    await auth.setCustomUserClaims(userRecord.uid, { role: 'admin' });
    console.log('Successfully updated custom claims to role: admin');

    // Update Firestore document
    const userRef = db.collection('users').doc(userRecord.uid);
    await userRef.set({
      email: email,
      role: 'admin',
      name: 'Mohamed Admin',
      createdAt: FieldValue.serverTimestamp()
    }, { merge: true });
    
    console.log('Successfully updated Firestore user document to role: admin');
    console.log('DONE! You can now refresh the page.');
    process.exit(0);
  } catch (error) {
    console.error('Error making user admin:', error);
    process.exit(1);
  }
}

makeAdmin('mohamedalghala@gmail.com');
