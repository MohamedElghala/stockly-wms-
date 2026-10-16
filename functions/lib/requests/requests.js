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
exports.rejectMaterialRequest = exports.issueMaterialRequest = exports.approveByManagement = exports.approveBySupervisor = exports.createMaterialRequest = void 0;
const logger = __importStar(require("firebase-functions/logger"));
const https_1 = require("firebase-functions/v2/https");
const firestore_1 = require("firebase-admin/firestore");
// Helper function to derive status based on flags
function deriveStatus(isApprovedBySupervisor, isApprovedByManagement, isDisbursedByAdmin, isSupplierRequest = false) {
    if (isDisbursedByAdmin)
        return 'issued'; // "تم الصرف"
    if (isApprovedByManagement)
        return 'management_approved'; // "معتمد من الإدارة"
    if (isApprovedBySupervisor)
        return 'supervisor_approved'; // "معتمد من المشرف"
    if (isSupplierRequest)
        return 'supplier_pending_disbursement';
    return 'pending'; // "معلق للاعتماد"
}
exports.createMaterialRequest = (0, https_1.onCall)(async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'User must be logged in.');
    }
    const data = request.data;
    if (!data.itemId || !data.qty || data.qty <= 0) {
        throw new https_1.HttpsError('invalid-argument', 'Missing required fields or invalid quantity.');
    }
    const db = (0, firestore_1.getFirestore)();
    const itemRef = db.collection('items').doc(data.itemId);
    const reqRef = db.collection('materialRequests').doc();
    try {
        const itemDoc = await itemRef.get();
        if (!itemDoc.exists) {
            throw new https_1.HttpsError('not-found', `Item ${data.itemId} not found.`);
        }
        const itemData = itemDoc.data();
        const role = request.auth.token.role;
        const isAdmin = role === 'admin';
        const isMgmt = role === 'management';
        const isSupv = role === 'supervisor';
        // Auto approvals based on role
        const autoApproveSupervisor = isSupv || isMgmt || isAdmin;
        const autoApproveMgmt = isMgmt || isAdmin;
        const newReq = {
            id: reqRef.id,
            reqId: data.reqId || `REQ-${Date.now()}`,
            isSupplierRequest: data.isSupplierRequest || false,
            status: deriveStatus(autoApproveSupervisor, autoApproveMgmt, false, data.isSupplierRequest),
            userId: request.auth.uid,
            userName: request.auth.token?.name || request.auth.token?.email || '',
            category: itemData.category,
            itemId: itemData.code,
            itemCode: itemData.code,
            itemName: itemData.name,
            qty: data.qty,
            dept: data.dept || '',
            jobTitle: data.jobTitle || '',
            notes: data.notes || '',
            location: data.location || '',
            emergency: data.emergency || 'عادي',
            createdAt: Date.now(),
            isApprovedBySupervisor: autoApproveSupervisor,
            isApprovedByManagement: autoApproveMgmt,
            isDisbursedByAdmin: false,
        };
        if (autoApproveSupervisor) {
            newReq.supervisorResolvedBy = request.auth.uid;
            newReq.supervisorResolvedAt = Date.now();
        }
        if (autoApproveMgmt) {
            newReq.managementResolvedBy = request.auth.uid;
            newReq.managementResolvedAt = Date.now();
        }
        await reqRef.set(newReq);
        logger.info(`Request ${newReq.reqId} created by ${request.auth.uid}`);
        return { success: true, message: 'تم إنشاء الطلب بنجاح' };
    }
    catch (error) {
        logger.error('Error creating request:', error);
        throw new https_1.HttpsError(error.code || 'internal', error.message || 'Error creating request');
    }
});
// Supervisor Approval
exports.approveBySupervisor = (0, https_1.onCall)(async (request) => {
    if (!request.auth)
        throw new https_1.HttpsError('unauthenticated', 'User must be logged in.');
    const role = request.auth.token.role;
    if (role !== 'admin' && role !== 'management' && role !== 'supervisor') {
        throw new https_1.HttpsError('permission-denied', 'Only Supervisor or higher can approve requests initially.');
    }
    const data = request.data;
    if (!data.id)
        throw new https_1.HttpsError('invalid-argument', 'Request ID is required.');
    const db = (0, firestore_1.getFirestore)();
    const reqRef = db.collection('materialRequests').doc(data.id);
    try {
        await db.runTransaction(async (t) => {
            const reqDoc = await t.get(reqRef);
            if (!reqDoc.exists)
                throw new https_1.HttpsError('not-found', `Request ${data.id} not found.`);
            const reqData = reqDoc.data();
            if (reqData.isApprovedBySupervisor) {
                throw new https_1.HttpsError('failed-precondition', 'الطلب معتمد بالفعل من المشرف.');
            }
            t.update(reqRef, {
                isApprovedBySupervisor: true,
                supervisorResolvedBy: request.auth?.uid,
                supervisorResolvedAt: Date.now(),
                status: deriveStatus(true, reqData.isApprovedByManagement, reqData.isDisbursedByAdmin, reqData.isSupplierRequest)
            });
        });
        return { success: true, message: 'تم اعتماد الطلب من المشرف بنجاح.' };
    }
    catch (error) {
        throw new https_1.HttpsError(error.code || 'internal', error.message);
    }
});
// Management Approval
exports.approveByManagement = (0, https_1.onCall)(async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'User must be logged in.');
    }
    if (request.auth.token.role !== 'admin' && request.auth.token.role !== 'management') {
        throw new https_1.HttpsError('permission-denied', 'Only Management or Admin can approve requests.');
    }
    const data = request.data;
    if (!data.id)
        throw new https_1.HttpsError('invalid-argument', 'Request ID is required.');
    const db = (0, firestore_1.getFirestore)();
    const reqRef = db.collection('materialRequests').doc(data.id);
    try {
        await db.runTransaction(async (t) => {
            const reqDoc = await t.get(reqRef);
            if (!reqDoc.exists)
                throw new https_1.HttpsError('not-found', `Request ${data.id} not found.`);
            const reqData = reqDoc.data();
            if (!reqData.isApprovedBySupervisor && request.auth?.token.role !== 'admin') {
                // Force workflow order unless they are an admin
                throw new https_1.HttpsError('failed-precondition', 'يجب أن يعتمد المشرف الطلب أولاً.');
            }
            if (reqData.isApprovedByManagement) {
                throw new https_1.HttpsError('failed-precondition', 'الطلب معتمد بالفعل من الإدارة.');
            }
            t.update(reqRef, {
                isApprovedBySupervisor: true, // auto-approve lower tier just in case
                isApprovedByManagement: true,
                managementResolvedBy: request.auth?.uid,
                managementResolvedAt: Date.now(),
                status: deriveStatus(true, true, reqData.isDisbursedByAdmin, reqData.isSupplierRequest)
            });
        });
        return { success: true, message: 'تم اعتماد الطلب إدارياً بنجاح.' };
    }
    catch (error) {
        throw new https_1.HttpsError(error.code || 'internal', error.message);
    }
});
// Admin Disbursement (Actual stock deduction)
exports.issueMaterialRequest = (0, https_1.onCall)(async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'User must be logged in.');
    }
    if (request.auth.token.role !== 'admin') {
        throw new https_1.HttpsError('permission-denied', 'Only Admin (Warehouse Manager) can disburse items.');
    }
    const data = request.data;
    if (!data.id)
        throw new https_1.HttpsError('invalid-argument', 'Request ID is required.');
    const db = (0, firestore_1.getFirestore)();
    const reqRef = db.collection('materialRequests').doc(data.id);
    const disbursementRef = db.collection('disbursements').doc();
    try {
        await db.runTransaction(async (t) => {
            const reqDoc = await t.get(reqRef);
            if (!reqDoc.exists)
                throw new https_1.HttpsError('not-found', `Request ${data.id} not found.`);
            const reqData = reqDoc.data();
            if (reqData.isDisbursedByAdmin) {
                throw new https_1.HttpsError('failed-precondition', `الطلب تم صرفه بالفعل.`);
            }
            // We do NOT check if reqData.isApprovedByManagement is true here. Admin has absolute power.
            const itemRef = db.collection('items').doc(reqData.itemId);
            const itemDoc = await t.get(itemRef);
            if (!itemDoc.exists)
                throw new https_1.HttpsError('not-found', `Item ${reqData.itemId} not found.`);
            const itemData = itemDoc.data();
            if ((itemData.stock || 0) < reqData.qty) {
                throw new https_1.HttpsError('failed-precondition', `الرصيد الحالي (${itemData.stock}) لا يكفي لتسليم الطلب (${reqData.qty}).`);
            }
            const newTotalOut = (itemData.totalOut || 0) + reqData.qty;
            const newStock = (itemData.stock || 0) - reqData.qty;
            const newStatus = newStock <= 0 ? 'نفذ الصنف' : newStock < 10 ? 'الصنف ناقص' : 'آمن';
            t.update(itemRef, {
                totalOut: newTotalOut,
                stock: newStock,
                status: newStatus,
                updatedAt: Date.now()
            });
            const newDisbursement = {
                id: disbursementRef.id,
                date: new Date().toISOString().split('T')[0],
                invoiceNo: data.invoiceNo || reqData.reqId,
                destination: reqData.dept || reqData.userName,
                itemId: itemData.code,
                itemCode: itemData.code,
                itemName: itemData.name,
                unit: itemData.unit,
                qty: reqData.qty,
                notes: reqData.notes || 'صرف من طلب مباشر',
                receiver: reqData.userName,
                category: itemData.category,
                sourceRequestId: reqData.id,
                createdBy: request.auth?.uid || 'system',
                createdAt: Date.now()
            };
            t.set(disbursementRef, newDisbursement);
            t.update(reqRef, {
                isDisbursedByAdmin: true,
                adminDisbursedBy: request.auth?.uid,
                adminDisbursedAt: Date.now(),
                status: deriveStatus(reqData.isApprovedBySupervisor, reqData.isApprovedByManagement, true, reqData.isSupplierRequest)
            });
        });
        return { success: true, message: 'تم الصرف بنجاح وتم خصم الرصيد.' };
    }
    catch (error) {
        throw new https_1.HttpsError(error.code || 'internal', error.message);
    }
});
// Reject Request
exports.rejectMaterialRequest = (0, https_1.onCall)(async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'User must be logged in.');
    }
    const role = request.auth.token.role;
    if (role !== 'admin' && role !== 'management' && role !== 'supervisor') {
        throw new https_1.HttpsError('permission-denied', 'Only Supervisor, Management or Admin can reject requests.');
    }
    const data = request.data;
    if (!data.id)
        throw new https_1.HttpsError('invalid-argument', 'Request ID is required.');
    const db = (0, firestore_1.getFirestore)();
    const reqRef = db.collection('materialRequests').doc(data.id);
    try {
        await db.runTransaction(async (t) => {
            const reqDoc = await t.get(reqRef);
            if (!reqDoc.exists)
                throw new https_1.HttpsError('not-found', `Request ${data.id} not found.`);
            const reqData = reqDoc.data();
            if (reqData.isDisbursedByAdmin) {
                throw new https_1.HttpsError('failed-precondition', `لا يمكن رفض طلب تم صرفه بالفعل.`);
            }
            t.update(reqRef, {
                status: 'rejected',
                managementResolvedBy: request.auth?.uid, // We'll just use this field to track who rejected
                managementResolvedAt: Date.now()
            });
        });
        return { success: true, message: 'تم رفض الطلب بنجاح' };
    }
    catch (error) {
        throw new https_1.HttpsError(error.code || 'internal', error.message);
    }
});
//# sourceMappingURL=requests.js.map