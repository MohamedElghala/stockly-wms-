import * as logger from 'firebase-functions/logger';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore } from 'firebase-admin/firestore';
import { Disbursement, Item } from '@stockly/domain';

export const recordDisbursement = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'User must be logged in.');
  }

  const data = request.data as Partial<Disbursement>;
  if (!data.itemId || !data.qty || data.qty <= 0) {
    throw new HttpsError('invalid-argument', 'Missing required fields or invalid quantity.');
  }

  const db = getFirestore();
  const itemRef = db.collection('items').doc(data.itemId);
  const disbursementRef = db.collection('disbursements').doc();

  try {
    await db.runTransaction(async (t) => {
      const itemDoc = await t.get(itemRef);
      if (!itemDoc.exists) {
        throw new HttpsError('not-found', `Item ${data.itemId} not found.`);
      }
      
      const itemData = itemDoc.data() as Item;
      
      if ((itemData.stock || 0) < data.qty!) {
        throw new HttpsError('failed-precondition', `الرصيد الحالي (${itemData.stock}) لا يكفي للكمية المطلوبة (${data.qty}).`);
      }

      // Fix Double Deduction: Check and update source request if linked
      let reqRef: FirebaseFirestore.DocumentReference | null = null;
      if (data.sourceRequestId) {
        reqRef = db.collection('materialRequests').doc(data.sourceRequestId);
        const reqDoc = await t.get(reqRef);
        if (reqDoc.exists) {
          const reqData = reqDoc.data();
          if (reqData?.isDisbursedByAdmin) {
            throw new HttpsError('failed-precondition', `هذا الطلب تم صرفه مسبقاً!`);
          }
        }
      }

      const newTotalOut = (itemData.totalOut || 0) + data.qty!;
      const newStock = (itemData.stock || 0) - data.qty!;
      
      const newStatus = newStock <= 0 ? 'نفذ الصنف' : newStock < (itemData.alertLimit || 10) ? 'الصنف ناقص' : 'آمن';

      // Update Item
      t.update(itemRef, {
        totalOut: newTotalOut,
        stock: newStock,
        status: newStatus,
        updatedAt: Date.now()
      });

      // Update source request if linked
      if (reqRef) {
        t.update(reqRef, {
           isDisbursedByAdmin: true,
           adminDisbursedBy: request.auth?.uid,
           adminDisbursedAt: Date.now(),
           status: 'archived' // simplify state if disbursed manually
        });
      }

      // Insert Disbursement
      const newDisbursement: Disbursement = {
        id: disbursementRef.id,
        date: data.date || new Date().toISOString(),
        invoiceNo: data.invoiceNo || '',
        destination: data.destination || '',
        itemId: itemData.code,
        itemCode: itemData.code,
        itemName: itemData.name,
        unit: itemData.unit,
        qty: data.qty!,
        notes: data.notes || '',
        receiver: data.receiver || '',
        category: itemData.category,
        sourceRequestId: data.sourceRequestId || '',
        createdBy: request.auth?.uid || '',
        createdAt: Date.now()
      };
      
      t.set(disbursementRef, newDisbursement);
    });
    
    logger.info(`Disbursement recorded for item ${data.itemId} by ${request.auth.uid}`);
    return { success: true, message: 'تم تسجيل المنصرف بنجاح وخصم الرصيد' };
  } catch (error: any) {
    logger.error('Error recording disbursement:', error);
    throw new HttpsError(error.code || 'internal', error.message || 'Error recording disbursement');
  }
});
