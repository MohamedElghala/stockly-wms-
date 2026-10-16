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
exports.updateItem = exports.createItem = void 0;
const logger = __importStar(require("firebase-functions/logger"));
const https_1 = require("firebase-functions/v2/https");
const firestore_1 = require("firebase-admin/firestore");
exports.createItem = (0, https_1.onCall)(async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'User must be logged in.');
    }
    const data = request.data;
    if (!data.category || !data.name || !data.unit) {
        throw new https_1.HttpsError('invalid-argument', 'Missing required fields (category, name, unit).');
    }
    const db = (0, firestore_1.getFirestore)();
    try {
        const result = await db.runTransaction(async (t) => {
            // 1. Check if name already exists
            const nameQuery = await t.get(db.collection('items').where('name', '==', data.name));
            if (!nameQuery.empty) {
                throw new https_1.HttpsError('already-exists', `الصنف موجود بالفعل بكود: ${nameQuery.docs[0].id}`);
            }
            // 2. Generate new code
            const allItemsQuery = await t.get(db.collection('items'));
            let categoryCodes = [];
            let maxCodeAll = 0;
            allItemsQuery.forEach(doc => {
                const item = doc.data();
                const codeNum = parseInt(item.code, 10);
                if (!isNaN(codeNum)) {
                    if (codeNum > maxCodeAll)
                        maxCodeAll = codeNum;
                    if (item.category === data.category) {
                        categoryCodes.push(codeNum);
                    }
                }
            });
            let newCodeNum = 0;
            if (categoryCodes.length > 0) {
                // Sort codes to find the first gap
                categoryCodes.sort((a, b) => a - b);
                const minCodeCat = categoryCodes[0];
                const maxCodeCat = categoryCodes[categoryCodes.length - 1];
                // Assume the new code goes to the end by default
                newCodeNum = maxCodeCat + 1;
                // Find the first gap in the sequence
                for (let i = 0; i < categoryCodes.length - 1; i++) {
                    if (categoryCodes[i + 1] > categoryCodes[i] + 1) {
                        newCodeNum = categoryCodes[i] + 1;
                        break;
                    }
                }
            }
            else {
                // If it's a completely new category, start at the next 1000 block
                newCodeNum = Math.floor(maxCodeAll / 1000) * 1000 + 1001;
                if (maxCodeAll === 0)
                    newCodeNum = 1001; // fallback if DB is totally empty
            }
            const newCodeStr = newCodeNum.toString();
            const itemRef = db.collection('items').doc(newCodeStr);
            // 3. Prepare item
            const openingBalance = data.openingBalance || 0;
            const newItem = {
                code: newCodeStr,
                category: data.category,
                name: data.name,
                unit: data.unit,
                openingBalance: openingBalance,
                totalIn: openingBalance, // Opening balance acts as first addition
                totalOut: 0,
                totalScrap: 0,
                stock: openingBalance,
                alertLimit: 10,
                status: openingBalance <= 0 ? 'نفذ الصنف' : openingBalance < 10 ? 'الصنف ناقص' : 'آمن',
                updatedAt: Date.now()
            };
            t.set(itemRef, newItem);
            // 4. Create addition if openingBalance > 0
            if (openingBalance > 0) {
                const additionRef = db.collection('additions').doc();
                t.set(additionRef, {
                    date: Date.now(),
                    invoiceNo: 'رصيد افتتاحي',
                    itemId: newCodeStr,
                    itemCode: newCodeStr,
                    itemName: data.name,
                    unit: data.unit,
                    qty: openingBalance,
                    supplier: 'النظام (رصيد افتتاحي)',
                    notes: 'تسجيل رصيد افتتاحي عند الإنشاء',
                    category: data.category,
                    createdBy: request.auth.uid,
                    createdAt: Date.now()
                });
            }
            return newCodeStr;
        });
        logger.info(`Item ${result} created by ${request.auth?.uid}`);
        return { success: true, message: 'تم إضافة الصنف بنجاح', code: result };
    }
    catch (error) {
        logger.error('Error creating item:', error);
        throw new https_1.HttpsError(error.code || 'internal', error.message || 'Error creating item');
    }
});
exports.updateItem = (0, https_1.onCall)(async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'User must be logged in.');
    }
    const data = request.data;
    if (!data.code) {
        throw new https_1.HttpsError('invalid-argument', 'Item code is required.');
    }
    const db = (0, firestore_1.getFirestore)();
    const itemRef = db.collection('items').doc(data.code);
    try {
        await db.runTransaction(async (t) => {
            const doc = await t.get(itemRef);
            if (!doc.exists) {
                throw new https_1.HttpsError('not-found', `Item ${data.code} not found.`);
            }
            const updateData = {
                updatedAt: Date.now()
            };
            if (data.name)
                updateData.name = data.name;
            if (data.category)
                updateData.category = data.category;
            if (data.unit)
                updateData.unit = data.unit;
            t.update(itemRef, updateData);
        });
        logger.info(`Item ${data.code} updated by ${request.auth?.uid}`);
        return { success: true, message: 'تم تحديث الصنف بنجاح' };
    }
    catch (error) {
        logger.error('Error updating item:', error);
        throw new https_1.HttpsError('internal', error.message || 'Error updating item');
    }
});
//# sourceMappingURL=items.js.map