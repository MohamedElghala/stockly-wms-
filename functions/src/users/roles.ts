import * as logger from 'firebase-functions/logger';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

export const updateUserRole = onCall(async (request) => {
  if (!request.auth || request.auth.token.role !== 'admin') {
    throw new HttpsError('permission-denied', 'Only admins can update roles.');
  }

  const data = request.data as { uid: string; newRole: string };
  if (!data.uid || !data.newRole) {
    throw new HttpsError('invalid-argument', 'Missing uid or newRole.');
  }

  const validRoles = ['admin', 'management', 'user', 'pending', 'blocked'];
  if (!validRoles.includes(data.newRole)) {
    throw new HttpsError('invalid-argument', 'Invalid role provided.');
  }

  const db = getFirestore();
  const userRef = db.collection('users').doc(data.uid);

  try {
    // 1. Update Firestore
    await userRef.update({
      role: data.newRole,
      updatedAt: Date.now()
    });

    // 2. Update Custom Claims
    await getAuth().setCustomUserClaims(data.uid, {
      role: data.newRole
    });

    // If blocked, optionally revoke refresh tokens to force logout
    if (data.newRole === 'blocked') {
      await getAuth().revokeRefreshTokens(data.uid);
    }

    logger.info(`User ${data.uid} role updated to ${data.newRole} by admin ${request.auth.uid}`);
    return { success: true, message: `تم تحديث صلاحية المستخدم بنجاح` };
  } catch (error: any) {
    logger.error('Error updating user role:', error);
    throw new HttpsError('internal', error.message || 'Error updating user role');
  }
});

export const deleteUser = onCall(async (request) => {
  if (!request.auth || request.auth.token.role !== 'admin') {
    throw new HttpsError('permission-denied', 'Only admins can delete users.');
  }

  const data = request.data as { uid: string };
  if (!data.uid) {
    throw new HttpsError('invalid-argument', 'Missing uid.');
  }

  const db = getFirestore();
  const userRef = db.collection('users').doc(data.uid);

  try {
    // Delete from Firestore
    await userRef.delete();
    
    // Delete from Auth
    await getAuth().deleteUser(data.uid);

    logger.info(`User ${data.uid} deleted by admin ${request.auth.uid}`);
    return { success: true, message: 'تم حذف المستخدم نهائياً' };
  } catch (error: any) {
    logger.error('Error deleting user:', error);
    throw new HttpsError('internal', error.message || 'Error deleting user');
  }
});
