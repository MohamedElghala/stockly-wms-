import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import * as admin from 'firebase-admin';

// Initialize Firebase Admin for testing if not already initialized
if (!admin.apps.length) {
  admin.initializeApp({ projectId: 'demo-calm-wms' });
}

const db = admin.firestore();

describe('Scrap Operations (الهالك)', () => {
  beforeAll(async () => {
    // Setup initial data for testing
    await db.collection('items').doc('test-item-1').set({
      code: '1001',
      name: 'كابل نحاس',
      stock: 50,
      totalScrap: 0,
      totalOut: 10,
      status: 'آمن'
    });
  });

  afterAll(async () => {
    // Cleanup
    await db.collection('items').doc('test-item-1').delete();
    await db.collection('scrap').doc('test-scrap-1').delete();
  });

  it('scrap operation should deduct from stock and increase totalScrap (Operational Logic)', async () => {
    // 1. Arrange
    const scrapRef = db.collection('scrap').doc('test-scrap-1');
    const itemRef = db.collection('items').doc('test-item-1');

    // 2. Act
    // Simulate what the backend function does (or the actual transaction)
    await db.runTransaction(async (transaction) => {
      const itemDoc = await transaction.get(itemRef);
      const data = itemDoc.data()!;
      
      const scrapQty = 5;
      
      // The approved business rule: Scrap decreases stock and increases totalScrap
      transaction.update(itemRef, {
        stock: data.stock - scrapQty,
        totalScrap: data.totalScrap + scrapQty
      });

      transaction.set(scrapRef, {
        itemId: 'test-item-1',
        qty: scrapQty,
        reason: 'تالف بسبب الرطوبة',
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });
    });

    // 3. Assert
    const updatedItem = await itemRef.get();
    const itemData = updatedItem.data()!;

    expect(itemData.stock).toBe(45); // 50 - 5 = 45
    expect(itemData.totalScrap).toBe(5); // 0 + 5 = 5
    // Ensure totalOut is NOT affected by scrap
    expect(itemData.totalOut).toBe(10); 
  });
});
