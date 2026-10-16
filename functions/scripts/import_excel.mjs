import { initializeApp, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import xlsx from 'xlsx';
if (!getApps().length) {
    initializeApp({
        projectId: 'demo-calm-wms'
    });
}
const db = getFirestore();
db.settings({
    host: '127.0.0.1:8080',
    ssl: false
});
const filePath = 'C:\\Users\\Mohamed Helmy\\Downloads\\The_Calm_WMS_V2.1\\The_Calm_WMS_V2.1.xlsx';
async function importData() {
    console.log('Reading Excel file...');
    const wb = xlsx.readFile(filePath);
    const sheet = wb.Sheets['الرصيد الحالي'];
    if (!sheet) {
        console.error('Sheet not found!');
        return;
    }
    const rows = xlsx.utils.sheet_to_json(sheet, { header: 1 });
    let count = 0;
    // Data starts at index 5
    for (let i = 5; i < rows.length; i++) {
        const row = rows[i];
        if (!row || !row[1])
            continue; // Skip empty rows or rows without a code
        const code = String(row[1]).trim();
        if (code === 'undefined' || code === '')
            continue;
        const category = String(row[2] || '').trim();
        const name = String(row[3] || '').trim();
        const unit = String(row[4] || '').trim();
        const openingBalance = Number(row[5]) || 0;
        const totalIn = Number(row[6]) || 0;
        const totalOut = Number(row[7]) || 0;
        const stock = Number(row[8]) || 0;
        const totalScrap = 0;
        const alertLimit = 10;
        const status = stock <= 0 ? 'نفذ الصنف' : stock < alertLimit ? 'الصنف ناقص' : 'آمن';
        const itemRef = db.collection('items').doc(code);
        await itemRef.set({
            code,
            category,
            name,
            unit,
            openingBalance,
            totalIn,
            totalOut,
            totalScrap,
            stock,
            alertLimit,
            status,
            updatedAt: Date.now()
        });
        count++;
        if (count % 100 === 0)
            console.log(`Imported ${count} items...`);
    }
    console.log('Imported ' + count + ' items successfully.');
}
importData().catch(console.error);

