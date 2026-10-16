import * as logger from 'firebase-functions/logger';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore } from 'firebase-admin/firestore';
import { Addition, Item } from '@stockly/domain';

export const recordAddition = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'User must be logged in.');
  }

  const data = request.data as Partial<Addition>;
  if (!data.itemId || !data.qty || data.qty <= 0) {
    throw new HttpsError('invalid-argument', 'Missing required fields or invalid quantity.');
  }

  const db = getFirestore();
  const itemRef = db.collection('items').doc(data.itemId);
  const additionRef = db.collection('additions').doc();

  try {
    await db.runTransaction(async (t) => {
      const itemDoc = await t.get(itemRef);
      if (!itemDoc.exists) {
        throw new HttpsError('not-found', `Item ${data.itemId} not found.`);
      }
      
      const itemData = itemDoc.data() as Item;
      const newTotalIn = (itemData.totalIn || 0) + data.qty!;
      const newStock = (itemData.stock || 0) + data.qty!;
      
      const newStatus = newStock <= 0 ? 'نفذ الصنف' : newStock < (itemData.alertLimit || 10) ? 'الصنف ناقص' : 'آمن';

      // Update Item
      t.update(itemRef, {
        totalIn: newTotalIn,
        stock: newStock,
        status: newStatus,
        totalScrap: itemData.totalScrap || 0,
        alertLimit: itemData.alertLimit || 10,
        updatedAt: Date.now()
      });

      // Insert Addition
      const newAddition: Addition = {
        id: additionRef.id,
        date: data.date || new Date().toISOString(),
        invoiceNo: data.invoiceNo || '',
        itemId: itemData.code,
        itemCode: itemData.code,
        itemName: itemData.name,
        unit: itemData.unit,
        qty: data.qty!,
        supplier: data.supplier || '',
        notes: data.notes || '',
        category: itemData.category,
        createdBy: request.auth?.uid || '',
        createdByName: request.auth?.token?.name || request.auth?.token?.email || '',
        createdAt: Date.now()
      };
      
      t.set(additionRef, newAddition);
    });
    
    logger.info(`Addition recorded for item ${data.itemId} by ${request.auth.uid}`);
    return { success: true, message: 'تم تسجيل الوارد بنجاح وتحديث الرصيد' };
  } catch (error: any) {
    logger.error('Error recording addition:', error);
    throw new HttpsError('internal', error.message || 'Error recording addition');
  }
});
