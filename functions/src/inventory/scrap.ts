import * as logger from 'firebase-functions/logger';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore } from 'firebase-admin/firestore';
import { Scrap, Item } from '@stockly/domain';

export const recordScrap = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'User must be logged in.');
  }

  const data = request.data as Partial<Scrap>;
  if (!data.itemId || !data.qty || data.qty <= 0) {
    throw new HttpsError('invalid-argument', 'Missing required fields or invalid quantity.');
  }

  const db = getFirestore();
  const itemRef = db.collection('items').doc(data.itemId);
  const scrapRef = db.collection('scrap').doc();

  try {
    // We still use a transaction just to ensure the item exists and get its metadata consistently
    await db.runTransaction(async (t) => {
      const itemDoc = await t.get(itemRef);
      if (!itemDoc.exists) {
        throw new HttpsError('not-found', `Item ${data.itemId} not found.`);
      }
      
      const itemData = itemDoc.data() as Item;

      if ((itemData.stock || 0) < data.qty!) {
        throw new HttpsError('failed-precondition', `الكمية المتاحة (${itemData.stock}) أقل من الكمية المطلوبة إتلافها (${data.qty}).`);
      }

      const newTotalScrap = (itemData.totalScrap || 0) + data.qty!;
      const newStock = (itemData.stock || 0) - data.qty!;
      const newStatus = newStock <= 0 ? 'نفذ الصنف' : newStock < (itemData.alertLimit || 10) ? 'الصنف ناقص' : 'آمن';

      // Update Item Stock
      t.update(itemRef, {
        stock: newStock,
        totalScrap: newTotalScrap,
        alertLimit: itemData.alertLimit || 10,
        status: newStatus,
        updatedAt: Date.now()
      });

      const newScrap: Scrap = {
        id: scrapRef.id,
        date: data.date || new Date().toISOString(),
        itemId: itemData.code,
        itemCode: itemData.code,
        itemName: itemData.name,
        qty: data.qty!,
        reason: data.reason || 'تالف',
        category: itemData.category,
        createdBy: request.auth?.uid || '',
        createdAt: Date.now()
      };
      
      t.set(scrapRef, newScrap);
    });
    
    logger.info(`Scrap recorded for item ${data.itemId} by ${request.auth.uid}`);
    return { success: true, message: 'تم تسجيل الهالك بنجاح (وتم خصمه من الرصيد)' };
  } catch (error: any) {
    logger.error('Error recording scrap:', error);
    throw new HttpsError(error.code || 'internal', error.message || 'Error recording scrap');
  }
});
