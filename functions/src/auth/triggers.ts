import { getFirestore } from 'firebase-admin/firestore';
import * as admin from 'firebase-admin';
import * as functionsV2 from 'firebase-functions/v2';
import * as logger from 'firebase-functions/logger';

admin.initializeApp();
const db = getFirestore();

export const beforeUserCreated = functionsV2.identity.beforeUserCreated(async (event) => {
  const user = event.data;

  if (!user || !user.email) {
    throw new functionsV2.identity.HttpsError('invalid-argument', 'Email is required');
  }
  
  const emailLower = user.email.toLowerCase();
  if (!emailLower.endsWith('@thecalmeg.com') && !emailLower.endsWith('@gmail.com')) {
    throw new functionsV2.identity.HttpsError('invalid-argument', 'Only @thecalmeg.com or @gmail.com emails are allowed.');
  }

  let initialRole = 'pending';
  if (emailLower === 'mohamedalghala@gmail.com') {
    initialRole = 'admin';
  }

  return {
    customClaims: {
      role: initialRole
    }
  };
});

export const beforeUserSignedIn = functionsV2.identity.beforeUserSignedIn(async (event) => {
  const user = event.data;
  if (!user) {
    throw new functionsV2.identity.HttpsError('unauthenticated', 'User is missing');
  }
  const uid = user.uid;

  const profileRef = db.collection('users').doc(uid);
  const profileSnap = await profileRef.get();

  if (!profileSnap.exists) {
    logger.warn(`User profile missing for uid: ${uid}`);
    return {
      customClaims: {
        role: 'pending'
      }
    };
  }

  const profile = profileSnap.data();
  const role = profile?.role || 'pending';

  if (role === 'blocked') {
    throw new functionsV2.identity.HttpsError('permission-denied', 'Account is blocked');
  }

  // To support legacy code temporarily if needed:
  const roleIds = role === 'admin' ? ['WAREHOUSE_MANAGER'] : role === 'management' ? ['MANAGEMENT'] : role === 'user' ? ['USER'] : [];

  return {
    customClaims: {
      role: role,
      roleIds: roleIds
    }
  };
});
