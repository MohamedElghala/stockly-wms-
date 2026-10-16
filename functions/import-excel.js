const xlsx = require('xlsx');
const { initializeApp } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

process.env.FIRESTORE_EMULATOR_HOST = 'localhost:8080';
const app = initializeApp({ projectId: 'demo-calm-wms' });
const db = getFirestore(app);

async function importExcel() {
  try {
    const filePath = 'C:/Users/Mohamed Helmy/Downloads/The_Calm_WMS_V2.1/The_Calm_WMS_V2.1.xlsx';
    console.log('Reading Excel file:', filePath);
    const workbook = xlsx.readFile(filePath);
    
    // We want the inventory sheet
    const sheetName = 'الرصيد الحالي';
    if (!workbook.Sheets[sheetName]) {
      throw new Error(`Sheet ${sheetName} not found!`);
    }

    const sheet = workbook.Sheets[sheetName];
    const rows = xlsx.utils.sheet_to_json(sheet, { header: 1 });

    let count = 0;
    // The data starts from row index 4 (5th row) based on previous logs
    for (let i = 4; i < rows.length; i++) {
      const row = rows[i];
      // Check if code exists
      if (!row || !row[1]) continue;

      const item = {
        code: String(row[1]).trim(),
        category: String(row[2] || '').trim(),
        name: String(row[3] || '').trim(),
        unit: String(row[4] || '').trim(),
        openingBalance: Number(row[5]) || 0,
        totalIn: Number(row[6]) || 0,
        totalOut: Number(row[7]) || 0,
        stock: Number(row[8]) || 0,
        totalScrap: 0,
        alertLimit: 10,
        status: String(row[9] || '').trim() || 'آمن',
        updatedAt: Date.now()
      };

      // Ensure no undefined values
      Object.keys(item).forEach(key => item[key] === undefined && delete item[key]);

      await db.collection('items').doc(item.code).set(item);
      count++;
    }

    console.log(`Successfully imported ${count} items from Excel!`);
    process.exit(0);
  } catch (e) {
    console.error('Error importing:', e);
    process.exit(1);
  }
}

importExcel();
