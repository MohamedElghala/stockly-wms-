import { collection, doc, runTransaction, getDocs, query, where, orderBy, limit, serverTimestamp, setDoc } from 'firebase/firestore';
import { db } from './firebase';
import { ItemCategory } from '../types/inventory';

export async function addNewItem(data: {
  name: string;
  category: ItemCategory | string;
  unit: string;
  openingBalance: number;
  userName: string;
  userUid: string;
}) {
  try {
    // 1. Check if name already exists (case-insensitive check is hard in firestore, we'll do exact match)
    const nameQuery = query(collection(db, 'items'), where('name', '==', data.name), limit(1));
    const nameSnapshot = await getDocs(nameQuery);
    if (!nameSnapshot.empty) {
      throw new Error(`الصنف موجود بالفعل بكود: ${nameSnapshot.docs[0].data().code}`);
    }

    // 2. Optimistic code generation outside transaction
    let candidateCode = 1001;
    
    // Get max code for this category
    const catQuery = query(collection(db, 'items'), where('category', '==', data.category), orderBy('code', 'desc'), limit(1));
    const catSnapshot = await getDocs(catQuery);
    
    if (!catSnapshot.empty) {
      // Same category -> last code + 1
      candidateCode = Number(catSnapshot.docs[0].data().code) + 1;
    } else {
      // New category -> (max code in system / 1000) ceil * 1000 + 1
      const allQuery = query(collection(db, 'items'), orderBy('code', 'desc'), limit(1));
      const allSnapshot = await getDocs(allQuery);
      if (!allSnapshot.empty) {
        const maxCodeSystem = Number(allSnapshot.docs[0].data().code);
        candidateCode = Math.ceil(maxCodeSystem / 1000) * 1000 + 1;
      }
    }

    const codeStr = candidateCode.toString();
    const itemRef = doc(db, 'items', codeStr);

    // 3. Execute Transaction
    await runTransaction(db, async (transaction) => {
      const itemDoc = await transaction.get(itemRef);
      if (itemDoc.exists()) {
        throw new Error('حدث تضارب في الكود، يرجى المحاولة مرة أخرى.');
      }

      // Calculate initial state
      const initialStock = data.openingBalance || 0;
      let status = 'آمن';
      if (initialStock <= 0) status = 'نفذ الصنف';
      else if (initialStock < 10) status = 'الصنف ناقص';

      const itemData = {
        code: codeStr,
        name: data.name,
        category: data.category,
        unit: data.unit,
        openingBalance: initialStock,
        totalIn: 0, // In Prompt 4, opening balance doesn't add to totalIn immediately unless specified, wait, Prompt 4 says:
        // "لو الكمية > 0: يضيف سجل في additions تلقائياً"
        // And "الرصيد الحالي = openingBalance + totalIn - totalOut"
        // So openingBalance is the base. additions will add to totalIn.
        // Wait, prompt 4 says: "لو الكمية > 0: يضيف سجل في additions تلقائياً"
        // If it adds a record in additions, does that addition add to totalIn? 
        // Prompt 6 says: "حدّث stockBalances: totalIn += qty, stock = openingBalance + totalIn - totalOut".
        // Let's just set openingBalance = initialStock, totalIn = 0, totalOut = 0.
        // And we create an addition record if initialStock > 0. But wait, if addition record is created, in Prompt 6 it says additions update totalIn. 
        // To prevent double counting, if it's opening balance, it's just openingBalance, no need to add to totalIn. The addition record for opening balance is just for history.
        totalOut: 0,
        stock: initialStock,
        status: status,
        updatedAt: serverTimestamp()
      };

      transaction.set(itemRef, itemData);

      // If opening balance > 0, create an addition record
      if (initialStock > 0) {
        const additionRef = doc(collection(db, 'additions'));
        transaction.set(additionRef, {
          date: new Date().toISOString(), // Or a date string
          invoiceNo: 'رصيد افتتاحي',
          itemId: codeStr,
          itemCode: codeStr,
          itemName: data.name,
          unit: data.unit,
          qty: initialStock,
          supplier: 'النظام (رصيد افتتاحي)',
          notes: 'تسجيل رصيد افتتاحي مع تعريف الصنف',
          category: data.category,
          createdBy: data.userUid,
          createdByName: data.userName,
          createdAt: serverTimestamp()
        });
      }
    });

    return codeStr;
  } catch (error: any) {
    console.error('Error adding new item:', error);
    throw error;
  }
}
