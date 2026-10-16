"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const app_1 = require("firebase-admin/app");
const firestore_1 = require("firebase-admin/firestore");
const auth_1 = require("firebase-admin/auth");
if (!(0, app_1.getApps)().length) {
    (0, app_1.initializeApp)({
        projectId: 'demo-calm-wms'
    });
}
const db = (0, firestore_1.getFirestore)();
const auth = (0, auth_1.getAuth)();
const USERS = [
    { email: 'admin@calm.local', password: 'Admin123!', role: 'admin', roleClass: 'role-admin', name: 'Admin', jobTitle: 'مدير المخازن', category: 'الكل' },
    { email: 'manager@calm.local', password: 'Manager123!', role: 'management', roleClass: 'role-management', name: 'Manager', jobTitle: 'مدير تنفيذي', category: 'الكل' },
    { email: 'tech1@calm.local', password: 'Tech123!', role: 'user', roleClass: 'role-user', name: 'Tech 1', jobTitle: 'فني كهرباء', category: 'أدوات كهربائية' },
    { email: 'pending@calm.local', password: 'Pending123!', role: 'pending', roleClass: '', name: 'Pending User', jobTitle: 'فني', category: 'مستلزمات نظافة' },
    { email: 'blocked@calm.local', password: 'Blocked123!', role: 'blocked', roleClass: '', name: 'Blocked User', jobTitle: 'فني', category: 'ملابس' }
];
const ITEMS = [
    { code: '1001', category: 'أدوات كهربائية', name: 'لمبة ليد', unit: 'عدد', openingBalance: 50, totalIn: 50, totalOut: 0, stock: 50, status: 'آمن', updatedAt: Date.now() },
    { code: '1002', category: 'أدوات كهربائية', name: 'مفتاح كهرباء', unit: 'عدد', openingBalance: 5, totalIn: 5, totalOut: 0, stock: 5, status: 'الصنف ناقص', updatedAt: Date.now() },
    { code: '1003', category: 'أدوات كهربائية', name: 'سلك نحاس', unit: 'لفة', openingBalance: 0, totalIn: 0, totalOut: 0, stock: 0, status: 'نفذ الصنف', updatedAt: Date.now() },
    { code: '2001', category: 'أدوات صحية وسباكة وشبكات', name: 'محبس', unit: 'عدد', openingBalance: 100, totalIn: 100, totalOut: 0, stock: 100, status: 'آمن', updatedAt: Date.now() },
    { code: '2002', category: 'أدوات صحية وسباكة وشبكات', name: 'ماسورة مياه', unit: 'متر', openingBalance: 8, totalIn: 8, totalOut: 0, stock: 8, status: 'الصنف ناقص', updatedAt: Date.now() },
    { code: '3001', category: 'حمامات سباحة', name: 'كلور', unit: 'جردل', openingBalance: 20, totalIn: 20, totalOut: 0, stock: 20, status: 'آمن', updatedAt: Date.now() },
    { code: '3002', category: 'حمامات سباحة', name: 'فلتر', unit: 'عدد', openingBalance: 0, totalIn: 0, totalOut: 0, stock: 0, status: 'نفذ الصنف', updatedAt: Date.now() },
    { code: '4001', category: 'ادات عامة', name: 'صاروخ جلخ', unit: 'عدد', openingBalance: 15, totalIn: 15, totalOut: 0, stock: 15, status: 'آمن', updatedAt: Date.now() }
];
async function clearAuth() {
    const listUsersResult = await auth.listUsers(1000);
    for (const userRecord of listUsersResult.users) {
        await auth.deleteUser(userRecord.uid);
    }
    console.log('Cleared existing auth users.');
}
async function seed() {
    console.log('Starting Seed Script...');
    await clearAuth();
    let tech1Uid = '';
    for (const u of USERS) {
        try {
            const userRecord = await auth.createUser({
                email: u.email,
                password: u.password,
                displayName: u.name,
            });
            await auth.setCustomUserClaims(userRecord.uid, { role: u.role });
            await db.collection('users').doc(userRecord.uid).set({
                email: u.email,
                name: u.name,
                jobTitle: u.jobTitle,
                category: u.category,
                role: u.role,
                roleClass: u.roleClass,
                status: u.role === 'blocked' ? 'suspended' : u.role === 'pending' ? 'pending' : 'active',
                createdAt: Date.now()
            });
            if (u.email === 'tech1@calm.local')
                tech1Uid = userRecord.uid;
            console.log(`Created user: ${u.email} (UID: ${userRecord.uid})`);
        }
        catch (e) {
            console.log(`Failed to create user ${u.email}:`, e.message);
        }
    }
    // Clear existing items and insert new ones
    const itemsDocs = await db.collection('items').get();
    for (const d of itemsDocs.docs)
        await d.ref.delete();
    for (const item of ITEMS) {
        await db.collection('items').doc(item.code).set(item);
        console.log(`Created item: ${item.code} - ${item.name}`);
    }
    // Clear requests and insert new ones
    const reqDocs = await db.collection('materialRequests').get();
    for (const d of reqDocs.docs)
        await d.ref.delete();
    const REQUESTS = [
        {
            reqId: 'REQ-1001',
            status: 'pending',
            userId: tech1Uid,
            userName: 'Tech 1',
            category: 'أدوات كهربائية',
            itemId: '1001',
            itemCode: '1001',
            itemName: 'لمبة ليد',
            qty: 5,
            dept: 'أدوات كهربائية',
            jobTitle: 'فني كهرباء',
            notes: '',
            location: 'المبنى الرئيسي',
            emergency: 'عادي',
            createdAt: Date.now(),
            isApprovedByManagement: false,
            isDisbursedByAdmin: false
        },
        {
            reqId: 'REQ-1002',
            status: 'approved_pending_disbursement',
            userId: tech1Uid,
            userName: 'Tech 1',
            category: 'أدوات صحية وسباكة وشبكات',
            itemId: '2001',
            itemCode: '2001',
            itemName: 'محبس',
            qty: 10,
            dept: 'أدوات صحية وسباكة وشبكات',
            jobTitle: 'فني كهرباء',
            notes: 'محجوز',
            location: 'الدور الأرضي',
            emergency: 'عاجل',
            createdAt: Date.now(),
            isApprovedByManagement: true,
            isDisbursedByAdmin: false,
            managementResolvedBy: 'admin',
            managementResolvedAt: Date.now()
        },
        {
            reqId: 'REQ-1003',
            status: 'archived',
            userId: tech1Uid,
            userName: 'Tech 1',
            category: 'حمامات سباحة',
            itemId: '3001',
            itemCode: '3001',
            itemName: 'كلور',
            qty: 3,
            dept: 'حمامات سباحة',
            jobTitle: 'فني كهرباء',
            notes: 'تم التسليم',
            location: 'المسبح',
            emergency: 'عادي',
            createdAt: Date.now(),
            isApprovedByManagement: true,
            isDisbursedByAdmin: true,
            managementResolvedBy: 'admin',
            managementResolvedAt: Date.now(),
            adminDisbursedBy: 'admin',
            adminDisbursedAt: Date.now()
        }
    ];
    for (const r of REQUESTS) {
        await db.collection('materialRequests').doc().set(r);
        console.log(`Created request: ${r.reqId} - ${r.status}`);
    }
    console.log('Seed completed successfully!');
}
seed().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
