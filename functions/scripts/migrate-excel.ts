import { initializeApp, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as xlsx from 'xlsx';

// Initialize Firebase Admin 
if (!getApps().length) {
  initializeApp({
    projectId: 'the-calm-wms-v2' // Hardcoded for emulator use
  });
}

const db = getFirestore();

async function migrate() {
  console.log('Starting Excel Migration...');
  
  const filePath = 'C:\\Users\\Mohamed Helmy\\Downloads\\The_Calm_WMS_V2.1\\The_Calm_WMS_V2.1.xlsx';
  const workbook = xlsx.readFile(filePath);
  
  const sheetName = workbook.SheetNames.find(name => name.includes('الرصيد الحالي')) || workbook.SheetNames[0];
  console.log(`Using sheet: ${sheetName}`);
  const sheet = workbook.Sheets[sheetName];
  
  // Headers are on row 5 (0-indexed 4), so we skip first 4 rows
  const rows: any[] = xlsx.utils.sheet_to_json(sheet, { range: 4, defval: '' });
  console.log(`Found ${rows.length} rows.`);

  let added = 0;
  let skipped = 0;

  for (const row of rows) {
    // Normalize keys (remove leading/trailing spaces)
    const normalizedRow: any = {};
    for (const key in row) {
      normalizedRow[key.trim()] = row[key];
    }

    const code = normalizedRow['كود الصنف'];
    const name = normalizedRow['اسم الصنف'];
    const category = normalizedRow['الفئة'];
    const unit = normalizedRow['الوحدة'] || 'عدد';
    const openingBalance = Number(normalizedRow['رصيد أول المدة']) || 0;
    const totalIn = Number(normalizedRow['اجمالي الوارد']) || 0;
    const totalOut = Number(normalizedRow['اجمالي المنصرف']) || 0;
    const stockStr = normalizedRow['الرصيد الحالي'];
    const stock = Number(stockStr) || 0;

    if (!code || !name) {
      skipped++;
      continue;
    }

    const itemCode = String(code).trim();
    const itemName = String(name).trim();

    try {
      const querySnap = await db.collection('items').where('code', '==', itemCode).get();
      
      let itemRef;
      if (querySnap.empty) {
        itemRef = db.collection('items').doc();
      } else {
        itemRef = querySnap.docs[0].ref;
      }

      const status = stock <= 0 ? 'نفذ الصنف' : stock < 10 ? 'الصنف ناقص' : 'آمن';

      await itemRef.set({
        code: itemCode,
        name: itemName,
        category: String(category).trim(),
        unit: String(unit).trim(),
        openingBalance: openingBalance,
        totalIn: totalIn,
        totalOut: totalOut,
        stock: stock,
        status: status,
        updatedAt: Date.now()
      }, { merge: true });

      added++;
      if (added % 100 === 0) {
        console.log(`Processed ${added} items...`);
      }
    } catch (e: any) {
      console.error(`Failed to process item ${itemCode}:`, e.message);
      skipped++;
    }
  }

  console.log(`Migration Complete! Added/Updated: ${added}, Skipped: ${skipped}`);
}

migrate().then(() => process.exit(0)).catch(e => {
  console.error(e);
  process.exit(1);
});
