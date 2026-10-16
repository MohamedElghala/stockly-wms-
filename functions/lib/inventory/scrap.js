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
exports.recordScrap = void 0;
const logger = __importStar(require("firebase-functions/logger"));
const https_1 = require("firebase-functions/v2/https");
const firestore_1 = require("firebase-admin/firestore");
exports.recordScrap = (0, https_1.onCall)(async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'User must be logged in.');
    }
    const data = request.data;
    if (!data.itemId || !data.qty || data.qty <= 0) {
        throw new https_1.HttpsError('invalid-argument', 'Missing required fields or invalid quantity.');
    }
    const db = (0, firestore_1.getFirestore)();
    const itemRef = db.collection('items').doc(data.itemId);
    const scrapRef = db.collection('scrap').doc();
    try {
        // We still use a transaction just to ensure the item exists and get its metadata consistently
        await db.runTransaction(async (t) => {
            const itemDoc = await t.get(itemRef);
            if (!itemDoc.exists) {
                throw new https_1.HttpsError('not-found', `Item ${data.itemId} not found.`);
            }
            const itemData = itemDoc.data();
            if ((itemData.stock || 0) < data.qty) {
                throw new https_1.HttpsError('failed-precondition', `الكمية المتاحة (${itemData.stock}) أقل من الكمية المطلوبة إتلافها (${data.qty}).`);
            }
            const newTotalScrap = (itemData.totalScrap || 0) + data.qty;
            const newStock = (itemData.stock || 0) - data.qty;
            const newStatus = newStock <= 0 ? 'نفذ الصنف' : newStock < (itemData.alertLimit || 10) ? 'الصنف ناقص' : 'آمن';
            // Update Item Stock
            t.update(itemRef, {
                stock: newStock,
                totalScrap: newTotalScrap,
                alertLimit: itemData.alertLimit || 10,
                status: newStatus,
                updatedAt: Date.now()
            });
            const newScrap = {
                id: scrapRef.id,
                date: data.date || new Date().toISOString(),
                itemId: itemData.code,
                itemCode: itemData.code,
                itemName: itemData.name,
                qty: data.qty,
                reason: data.reason || 'تالف',
                category: itemData.category,
                createdBy: request.auth?.uid || '',
                createdAt: Date.now()
            };
            t.set(scrapRef, newScrap);
        });
        logger.info(`Scrap recorded for item ${data.itemId} by ${request.auth.uid}`);
        return { success: true, message: 'تم تسجيل الهالك بنجاح (وتم خصمه من الرصيد)' };
    }
    catch (error) {
        logger.error('Error recording scrap:', error);
        throw new https_1.HttpsError(error.code || 'internal', error.message || 'Error recording scrap');
    }
});
//# sourceMappingURL=scrap.js.map