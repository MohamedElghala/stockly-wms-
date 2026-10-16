const xlsx = require('xlsx');

async function importExcel() {
  try {
    const filePath = 'C:/Users/Mohamed Helmy/Downloads/The_Calm_WMS_V2.1/The_Calm_WMS_V2.1.xlsx';
    console.log('Reading Excel file:', filePath);
    const workbook = xlsx.readFile(filePath);
    
    const sheetName = 'الرصيد الحالي';
    if (!workbook.Sheets[sheetName]) {
      throw new Error(`Sheet ${sheetName} not found!`);
    }

    const sheet = workbook.Sheets[sheetName];
    const rows = xlsx.utils.sheet_to_json(sheet, { header: 1 });

    let count = 0;
    for (let i = 4; i < rows.length; i++) {
      const row = rows[i];
      if (!row || !row[1]) continue;

      const code = String(row[1]).trim();
      
      const payload = {
        fields: {
          code: { stringValue: code },
          category: { stringValue: String(row[2] || '').trim() },
          name: { stringValue: String(row[3] || '').trim() },
          unit: { stringValue: String(row[4] || '').trim() },
          openingBalance: { integerValue: Math.floor(Number(row[5]) || 0) },
          totalIn: { integerValue: Math.floor(Number(row[6]) || 0) },
          totalOut: { integerValue: Math.floor(Number(row[7]) || 0) },
          stock: { integerValue: Math.floor(Number(row[8]) || 0) },
          totalScrap: { integerValue: 0 },
          alertLimit: { integerValue: 10 },
          status: { stringValue: String(row[9] || '').trim() || 'آمن' },
          updatedAt: { integerValue: Date.now() }
        }
      };

      const res = await fetch(`http://127.0.0.1:8080/v1/projects/demo-calm-wms/databases/(default)/documents/items/${code}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      if (!res.ok) {
        console.error('Failed to insert', code, await res.text());
      } else {
        count++;
      }
    }

    console.log(`Successfully imported ${count} items from Excel!`);
    process.exit(0);
  } catch (e) {
    console.error('Error importing:', e);
    process.exit(1);
  }
}

importExcel();
