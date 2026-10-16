"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.recordAddition = void 0;
const logger = __importStar(require("firebase-functions/logger"));
const https_1 = require("firebase-functions/v2/https");
const firestore_1 = require("firebase-admin/firestore");
exports.recordAddition = (0, https_1.onCall)(async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'User must be logged in.');
    }
    const data = request.data;
    if (!data.itemId || !data.qty || data.qty <= 0) {
        throw new https_1.HttpsError('invalid-argument', 'Missing required fields or invalid quantity.');
    }
    const db = (0, firestore_1.getFirestore)();
    const itemRef = db.collection('items').doc(data.itemId);
    const additionRef = db.collection('additions').doc();
    try {
        await db.runTransaction(async (t) => {
            const itemDoc = await t.get(itemRef);
            if (!itemDoc.exists) {
                throw new https_1.HttpsError('not-found', `Item ${data.itemId} not found.`);
            }
            const itemData = itemDoc.data();
            const newTotalIn = (itemData.totalIn || 0) + data.qty;
            const newStock = (itemData.stock || 0) + data.qty;
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
            const newAddition = {
                id: additionRef.id,
                date: data.date || new Date().toISOString(),
                invoiceNo: data.invoiceNo || '',
                itemId: itemData.code,
                itemCode: itemData.code,
                itemName: itemData.name,
                unit: itemData.unit,
                qty: data.qty,
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
    }
    catch (error) {
        logger.error('Error recording addition:', error);
        throw new https_1.HttpsError('internal', error.message || 'Error recording addition');
    }
});
//# sourceMappingURL=additions.js.map