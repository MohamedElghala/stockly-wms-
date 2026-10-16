import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, collection, getDocs } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyBov0NrvjGouy7iByl4qGb6CpRVWsEc9CM',
  authDomain: 'the-calm-wms.firebaseapp.com',
  projectId: 'the-calm-wms',
  storageBucket: 'the-calm-wms.firebasestorage.app',
  messagingSenderId: '126854098426',
  appId: '1:126854098426:web:e9ec91d278cc2d743f8843'
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Import calculateInventoryMetrics logic
function calculateInventoryMetrics(items, disbursements) {
  const NOW = Date.now();
  const DAY_MS = 24 * 60 * 60 * 1000;
  const SEVERE_WINDOW_MS = 60 * DAY_MS;
  const STAGNANT_WINDOW_MS = 90 * DAY_MS;

  const getDisbTimestamp = (d) => {
    if (typeof d.timestamp === 'number' && d.timestamp > 0) return d.timestamp;
    if (typeof d.createdAt === 'number' && d.createdAt > 0) return d.createdAt;
    if (d.date) {
      const s = String(d.date).trim();
      if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
        const p = new Date(s).getTime();
        if (!isNaN(p)) return p;
      }
      const parts = s.split('/');
      if (parts.length === 3) {
        let y = parseInt(parts[0], 10);
        let m = parseInt(parts[1], 10);
        let day = parseInt(parts[2], 10);
        if (y < 100) y = 2000 + y;
        const dt = new Date(y, m - 1, day);
        if (!isNaN(dt.getTime())) return dt.getTime();
      }
      const parsed = new Date(s).getTime();
      if (!isNaN(parsed)) return parsed;
    }
    return 0;
  };

  const disbMap = new Map();
  disbursements.forEach(d => {
    const code = String(d.itemCode || d.code || '').trim();
    if (!code) return;
    const ts = getDisbTimestamp(d);
    const qty = Number(d.qty || d.quantity || 0);
    if (!disbMap.has(code)) disbMap.set(code, []);
    disbMap.get(code).push({ qty, timestamp: ts, date: d.date || '' });
  });

  let severeCount = 0;
  let normalCount = 0;
  let stagnantCount = 0;
  let activeCount = 0;
  let outOfStockCount = 0;
  let totalStockUnits = 0;

  const validItems = items.filter(item => {
    const name = String(item.name || '').trim();
    const code = String(item.code || '').trim();
    return name !== '' && name !== 'اسم الصنف' && code !== 'كود الصنف' && code !== 'code';
  });

  validItems.forEach(item => {
    const code = String(item.code || item.id || '').trim();
    const stock = Number(item.stock) || 0;
    totalStockUnits += stock;
    const alertLimit = Number(item.alertLimit) || 10;

    const itemDisbs = disbMap.get(code) || [];
    itemDisbs.sort((a, b) => b.timestamp - a.timestamp);

    const lastDisb = itemDisbs[0] || null;
    const lastDisbursedAt = lastDisb ? lastDisb.timestamp : (typeof item.lastDisbursedAt === 'number' && item.lastDisbursedAt > 0 ? item.lastDisbursedAt : null);
    const daysSinceLastDisb = lastDisbursedAt ? Math.floor((NOW - lastDisbursedAt) / DAY_MS) : (typeof item.daysSinceLastDisb === 'number' ? item.daysSinceLastDisb : 9999);

    const inLast60Days = itemDisbs.filter(r => (NOW - r.timestamp) <= SEVERE_WINDOW_MS);
    const inLast90Days = itemDisbs.filter(r => (NOW - r.timestamp) <= STAGNANT_WINDOW_MS);
    const recentQty60 = inLast60Days.reduce((acc, r) => acc + r.qty, 0);

    const draws60 = itemDisbs.length > 0 ? inLast60Days.length : Number(item.drawsLast60 || 0);
    const draws90 = itemDisbs.length > 0 ? inLast90Days.length : Number(item.drawsLast90 || 0);

    const hasRecentDemand = itemDisbs.length > 0 
      ? (draws60 >= 1 || (draws90 >= 2 && recentQty60 > 0))
      : (draws60 >= 1 || (draws90 >= 2 && recentQty60 > 0) || item.hasRecentDemand === true);

    if (stock <= 0) {
      outOfStockCount++;
    } else if (stock <= alertLimit) {
      const isCritical = itemDisbs.length > 0 
        ? hasRecentDemand 
        : (item.classification === 'CRITICAL' || (item.classification !== 'NORMAL' && hasRecentDemand));
      if (isCritical) {
        severeCount++;
      } else {
        normalCount++;
      }
    } else {
      const isStagnant = itemDisbs.length > 0 
        ? (daysSinceLastDisb > 90) 
        : (item.classification === 'STAGNANT' || (item.classification !== 'ACTIVE' && daysSinceLastDisb > 90));
      if (isStagnant) {
        stagnantCount++;
      } else {
        activeCount++;
      }
    }
  });

  return {
    totalItems: validItems.length,
    totalStockUnits,
    outOfStockCount,
    severeCount,
    normalCount,
    stagnantCount,
    activeCount
  };
}

async function run() {
  await signInWithEmailAndPassword(auth, 'mohamedalghala@gmail.com', 'password123');
  console.log('Fetching items...');
  const itemsSnap = await getDocs(collection(db, 'items'));
  const items = itemsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
  console.log('Fetched items:', items.length);

  console.log('Fetching disbursements...');
  const disbSnap = await getDocs(collection(db, 'disbursements'));
  const disbursements = disbSnap.docs.map(d => ({ id: d.id, ...d.data() }));
  console.log('Fetched disbursements:', disbursements.length);

  const res = calculateInventoryMetrics(items, disbursements);
  console.log('LIVE CALCULATION RESULT:', res);
}

run().catch(console.error);
