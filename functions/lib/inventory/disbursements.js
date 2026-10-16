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
exports.recordDisbursement = void 0;
const logger = __importStar(require("firebase-functions/logger"));
const https_1 = require("firebase-functions/v2/https");
const firestore_1 = require("firebase-admin/firestore");
exports.recordDisbursement = (0, https_1.onCall)(async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'User must be logged in.');
    }
    const data = request.data;
    if (!data.itemId || !data.qty || data.qty <= 0) {
        throw new https_1.HttpsError('invalid-argument', 'Missing required fields or invalid quantity.');
    }
    const db = (0, firestore_1.getFirestore)();
    const itemRef = db.collection('items').doc(data.itemId);
    const disbursementRef = db.collection('disbursements').doc();
    try {
        await db.runTransaction(async (t) => {
            const itemDoc = await t.get(itemRef);
            if (!itemDoc.exists) {
                throw new https_1.HttpsError('not-found', `Item ${data.itemId} not found.`);
            }
            const itemData = itemDoc.data();
            if ((itemData.stock || 0) < data.qty) {
                throw new https_1.HttpsError('failed-precondition', `الرصيد الحالي (${itemData.stock}) لا يكفي للكمية المطلوبة (${data.qty}).`);
            }
            // Fix Double Deduction: Check and update source request if linked
            let reqRef = null;
            if (data.sourceRequestId) {
                reqRef = db.collection('materialRequests').doc(data.sourceRequestId);
                const reqDoc = await t.get(reqRef);
                if (reqDoc.exists) {
                    const reqData = reqDoc.data();
                    if (reqData?.isDisbursedByAdmin) {
                        throw new https_1.HttpsError('failed-precondition', `هذا الطلب تم صرفه مسبقاً!`);
                    }
                }
            }
            const newTotalOut = (itemData.totalOut || 0) + data.qty;
            const newStock = (itemData.stock || 0) - data.qty;
            const newStatus = newStock <= 0 ? 'نفذ الصنف' : newStock < (itemData.alertLimit || 10) ? 'الصنف ناقص' : 'آمن';
            // Update Item
            t.update(itemRef, {
                totalOut: newTotalOut,
                stock: newStock,
                status: newStatus,
                updatedAt: Date.now()
            });
            // Update source request if linked
            if (reqRef) {
                t.update(reqRef, {
                    isDisbursedByAdmin: true,
                    adminDisbursedBy: request.auth?.uid,
                    adminDisbursedAt: Date.now(),
                    status: 'archived' // simplify state if disbursed manually
                });
            }
            // Insert Disbursement
            const newDisbursement = {
                id: disbursementRef.id,
                date: data.date || new Date().toISOString(),
                invoiceNo: data.invoiceNo || '',
                destination: data.destination || '',
                itemId: itemData.code,
                itemCode: itemData.code,
                itemName: itemData.name,
                unit: itemData.unit,
                qty: data.qty,
                notes: data.notes || '',
                receiver: data.receiver || '',
                category: itemData.category,
                sourceRequestId: data.sourceRequestId || '',
                createdBy: request.auth?.uid || '',
                createdAt: Date.now()
            };
            t.set(disbursementRef, newDisbursement);
        });
        logger.info(`Disbursement recorded for item ${data.itemId} by ${request.auth.uid}`);
        return { success: true, message: 'تم تسجيل المنصرف بنجاح وخصم الرصيد' };
    }
    catch (error) {
        logger.error('Error recording disbursement:', error);
        throw new https_1.HttpsError(error.code || 'internal', error.message || 'Error recording disbursement');
    }
});
//# sourceMappingURL=disbursements.js.map