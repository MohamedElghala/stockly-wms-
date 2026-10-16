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
exports.cancelRequest = exports.issueMaterialRequest = exports.executeEmergencyIssue = exports.approveFinal = exports.approveTechnical = exports.submitRequest = exports.createDraftRequest = void 0;
const functions = __importStar(require("firebase-functions/v1"));
const firestore_1 = require("firebase-admin/firestore");
const authorization_1 = require("../security/authorization");
const permissions_1 = require("@calm-wms/permissions");
const audit_1 = require("../security/audit");
const domain_1 = require("@calm-wms/domain");
const validation_1 = require("@calm-wms/validation");
const app_1 = require("firebase-admin/app");
if (!(0, app_1.getApps)().length) {
    (0, app_1.initializeApp)();
}
const db = (0, firestore_1.getFirestore)();
async function checkPermission(context, permission) {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated.');
    }
    const callerId = context.auth.uid;
    const callerProfileSnap = await db.collection('users').doc(callerId).get();
    if (!callerProfileSnap.exists) {
        throw new functions.https.HttpsError('permission-denied', 'Caller profile not found.');
    }
    const callerProfile = callerProfileSnap.data();
    const currentUser = {
        uid: callerId,
        accountStatus: callerProfile.accountStatus,
        roleIds: callerProfile.roleIds || [],
        permissionVersion: callerProfile.permissionVersion || 1,
        isSuperAdmin: callerProfile.isSuperAdmin || false,
    };
    const hasPerm = await (0, authorization_1.assertPermission)(currentUser, permission, db);
    if (!hasPerm) {
        throw new functions.https.HttpsError('permission-denied', `Missing permission: ${permission}`);
    }
    return currentUser;
}
function emitBusinessEvent(transaction, eventType, entityType, entityId, payload) {
    const eventRef = db.collection('businessEvents').doc();
    transaction.set(eventRef, {
        eventId: eventRef.id,
        eventType,
        entityType,
        entityId,
        operationId: eventRef.id, // For simple events without external idempotency key
        eventVersion: 1,
        status: 'PENDING',
        payload,
        createdAt: firestore_1.FieldValue.serverTimestamp(),
        retryCount: 0,
    });
}
// Generate document number like MR-2026-000001
async function generateRequestNumber(transaction) {
    const year = new Date().getFullYear();
    const counterRef = db.collection('system').doc(`counter_mr_${year}`);
    const counterDoc = await transaction.get(counterRef);
    let nextSeq = 1;
    if (counterDoc.exists) {
        nextSeq = (counterDoc.data()?.seq || 0) + 1;
    }
    transaction.set(counterRef, { seq: nextSeq }, { merge: true });
    const formattedSeq = nextSeq.toString().padStart(6, '0');
    return `MR-${year}-${formattedSeq}`;
}
exports.createDraftRequest = functions.https.onCall(async (data, context) => {
    const userProfile = await checkPermission(context, permissions_1.Permissions.REQUEST_CREATE);
    const parsed = validation_1.createDraftRequestSchema.parse(data);
    return db.runTransaction(async (transaction) => {
        const requestNumber = await generateRequestNumber(transaction);
        const requestRef = db.collection('materialRequests').doc();
        const requestData = {
            id: requestRef.id,
            requestNumber,
            departmentId: parsed.departmentId,
            warehouseId: parsed.warehouseId,
            lifecycleStatus: domain_1.RequestLifecycleStatus.DRAFT,
            technicalApprovalStatus: domain_1.TechnicalApprovalStatus.PENDING,
            finalApprovalStatus: domain_1.FinalApprovalStatus.PENDING,
            issueStatus: domain_1.IssueStatus.NOT_ISSUED,
            exceptionStatus: domain_1.ExceptionStatus.NORMAL,
            notes: parsed.notes || null,
            createdBy: userProfile.uid,
            createdAt: firestore_1.FieldValue.serverTimestamp(),
            updatedBy: userProfile.uid,
            updatedAt: firestore_1.FieldValue.serverTimestamp(),
            version: 1,
        };
        transaction.set(requestRef, requestData);
        await (0, audit_1.writeAuditLog)(transaction, {
            action: 'REQUEST_DRAFT_CREATED',
            actorId: userProfile.uid,
            entityId: requestRef.id,
            entityType: 'MATERIAL_REQUEST',
        });
        return { success: true, requestId: requestRef.id, requestNumber };
    });
});
exports.submitRequest = functions.https.onCall(async (data, context) => {
    const userProfile = await checkPermission(context, permissions_1.Permissions.REQUEST_CREATE);
    const parsed = validation_1.submitRequestSchema.parse(data);
    return db.runTransaction(async (transaction) => {
        const requestRef = db.collection('materialRequests').doc(parsed.requestId);
        const reqDoc = await transaction.get(requestRef);
        if (!reqDoc.exists) {
            throw new functions.https.HttpsError('not-found', 'Request not found.');
        }
        const reqData = reqDoc.data();
        if (reqData.lifecycleStatus !== domain_1.RequestLifecycleStatus.DRAFT) {
            throw new functions.https.HttpsError('failed-precondition', 'Only DRAFT requests can be submitted.');
        }
        if (reqData.createdBy !== userProfile.uid) {
            throw new functions.https.HttpsError('permission-denied', 'You can only submit your own drafts.');
        }
        // Process lines
        const batchLines = [];
        for (const line of parsed.lines) {
            const itemRef = db.collection('items').doc(line.itemId);
            const itemDoc = await transaction.get(itemRef);
            if (!itemDoc.exists) {
                throw new functions.https.HttpsError('not-found', `Item ${line.itemId} not found.`);
            }
            const itemData = itemDoc.data();
            const lineRef = db.collection('materialRequestLines').doc();
            const lineData = {
                id: lineRef.id,
                requestId: requestRef.id,
                itemId: line.itemId,
                itemCodeSnapshot: itemData.itemCode,
                itemNameSnapshot: itemData.nameEn,
                unitSnapshot: itemData.unitId,
                requestedQuantity: line.requestedQuantity,
                approvedQuantity: 0,
                issuedQuantity: 0,
                notes: line.notes || null,
            };
            batchLines.push({ ref: lineRef, data: lineData });
        }
        // Write all lines
        for (const bl of batchLines) {
            transaction.set(bl.ref, bl.data);
        }
        // Update request status
        transaction.update(requestRef, {
            lifecycleStatus: domain_1.RequestLifecycleStatus.SUBMITTED,
            updatedBy: userProfile.uid,
            updatedAt: firestore_1.FieldValue.serverTimestamp(),
            version: firestore_1.FieldValue.increment(1),
        });
        await (0, audit_1.writeAuditLog)(transaction, {
            action: 'REQUEST_SUBMITTED',
            actorId: userProfile.uid,
            entityId: requestRef.id,
            entityType: 'MATERIAL_REQUEST',
        });
        emitBusinessEvent(transaction, 'REQUEST_SUBMITTED', 'MATERIAL_REQUEST', requestRef.id, { linesCount: batchLines.length });
        return { success: true };
    });
});
exports.approveTechnical = functions.https.onCall(async (data, context) => {
    const userProfile = await checkPermission(context, permissions_1.Permissions.REQUEST_APPROVE_TECHNICAL);
    const parsed = validation_1.technicalApprovalSchema.parse(data);
    return db.runTransaction(async (transaction) => {
        const requestRef = db.collection('materialRequests').doc(parsed.requestId);
        const reqDoc = await transaction.get(requestRef);
        if (!reqDoc.exists) {
            throw new functions.https.HttpsError('not-found', 'Request not found.');
        }
        const reqData = reqDoc.data();
        if (reqData.lifecycleStatus !== domain_1.RequestLifecycleStatus.SUBMITTED || reqData.technicalApprovalStatus !== domain_1.TechnicalApprovalStatus.PENDING) {
            throw new functions.https.HttpsError('failed-precondition', 'Request is not pending technical approval.');
        }
        if (!parsed.approved) {
            transaction.update(requestRef, {
                technicalApprovalStatus: domain_1.TechnicalApprovalStatus.REJECTED,
                lifecycleStatus: domain_1.RequestLifecycleStatus.CANCELLED,
                rejectionReason: parsed.rejectionReason || 'Rejected by Technical Approver',
                updatedBy: userProfile.uid,
                updatedAt: firestore_1.FieldValue.serverTimestamp(),
                version: firestore_1.FieldValue.increment(1),
            });
            await (0, audit_1.writeAuditLog)(transaction, {
                action: 'REQUEST_TECHNICAL_REJECTED',
                actorId: userProfile.uid,
                entityId: requestRef.id,
                entityType: 'MATERIAL_REQUEST',
                details: { reason: parsed.rejectionReason },
            });
            emitBusinessEvent(transaction, 'REQUEST_REJECTED', 'MATERIAL_REQUEST', requestRef.id, { stage: 'TECHNICAL' });
            return { success: true, status: 'REJECTED' };
        }
        // Approved: Set approvedQuantity = requestedQuantity for all lines
        const linesSnap = await transaction.get(db.collection('materialRequestLines').where('requestId', '==', parsed.requestId));
        for (const lineDoc of linesSnap.docs) {
            transaction.update(lineDoc.ref, {
                approvedQuantity: lineDoc.data().requestedQuantity,
            });
        }
        transaction.update(requestRef, {
            technicalApprovalStatus: domain_1.TechnicalApprovalStatus.APPROVED,
            lifecycleStatus: domain_1.RequestLifecycleStatus.IN_PROGRESS, // Moving forward
            updatedBy: userProfile.uid,
            updatedAt: firestore_1.FieldValue.serverTimestamp(),
            version: firestore_1.FieldValue.increment(1),
        });
        await (0, audit_1.writeAuditLog)(transaction, {
            action: 'REQUEST_TECHNICAL_APPROVED',
            actorId: userProfile.uid,
            entityId: requestRef.id,
            entityType: 'MATERIAL_REQUEST',
        });
        emitBusinessEvent(transaction, 'REQUEST_TECHNICAL_APPROVED', 'MATERIAL_REQUEST', requestRef.id, {});
        return { success: true, status: 'APPROVED' };
    });
});
exports.approveFinal = functions.https.onCall(async (data, context) => {
    const userProfile = await checkPermission(context, permissions_1.Permissions.REQUEST_APPROVE_FINAL);
    const parsed = validation_1.finalApprovalSchema.parse(data);
    return db.runTransaction(async (transaction) => {
        const requestRef = db.collection('materialRequests').doc(parsed.requestId);
        const reqDoc = await transaction.get(requestRef);
        if (!reqDoc.exists) {
            throw new functions.https.HttpsError('not-found', 'Request not found.');
        }
        const reqData = reqDoc.data();
        if (reqData.technicalApprovalStatus !== domain_1.TechnicalApprovalStatus.APPROVED) {
            throw new functions.https.HttpsError('failed-precondition', 'Technical approval is required first.');
        }
        if (reqData.finalApprovalStatus !== domain_1.FinalApprovalStatus.PENDING) {
            throw new functions.https.HttpsError('failed-precondition', 'Request is not pending final approval.');
        }
        if (!parsed.approved) {
            transaction.update(requestRef, {
                finalApprovalStatus: domain_1.FinalApprovalStatus.REJECTED,
                lifecycleStatus: domain_1.RequestLifecycleStatus.CANCELLED,
                rejectionReason: parsed.rejectionReason || 'Rejected by Final Approver',
                updatedBy: userProfile.uid,
                updatedAt: firestore_1.FieldValue.serverTimestamp(),
                version: firestore_1.FieldValue.increment(1),
            });
            await (0, audit_1.writeAuditLog)(transaction, {
                action: 'REQUEST_FINAL_REJECTED',
                actorId: userProfile.uid,
                entityId: requestRef.id,
                entityType: 'MATERIAL_REQUEST',
                details: { reason: parsed.rejectionReason },
            });
            emitBusinessEvent(transaction, 'REQUEST_REJECTED', 'MATERIAL_REQUEST', requestRef.id, { stage: 'FINAL' });
            return { success: true, status: 'REJECTED' };
        }
        // Approved: Atomically reserve ALL inventory
        const linesSnap = await transaction.get(db.collection('materialRequestLines').where('requestId', '==', parsed.requestId));
        const lines = linesSnap.docs.map(d => ({ ref: d.ref, data: d.data() }));
        // Read Phase: Get all stock balances
        const balanceRefs = new Map();
        const balances = new Map();
        for (const line of lines) {
            const balanceId = `${reqData.warehouseId}_${line.data.itemId}`;
            if (!balanceRefs.has(balanceId)) {
                const ref = db.collection('stockBalances').doc(balanceId);
                balanceRefs.set(balanceId, ref);
                const doc = await transaction.get(ref);
                balances.set(balanceId, doc.exists ? doc.data() : {
                    warehouseId: reqData.warehouseId,
                    itemId: line.data.itemId,
                    onHand: 0,
                    reserved: 0,
                    available: 0,
                });
            }
        }
        // Validation Phase: Check all availability
        for (const line of lines) {
            const balanceId = `${reqData.warehouseId}_${line.data.itemId}`;
            const balance = balances.get(balanceId);
            if (balance.available < line.data.approvedQuantity) {
                throw new functions.https.HttpsError('failed-precondition', `Insufficient stock for item ${line.data.itemId}. Reservation aborted.`);
            }
            // Pre-calculate new balances in memory
            balance.reserved += line.data.approvedQuantity;
            balance.available = balance.onHand - balance.reserved;
        }
        // Write Phase: Apply balances and create reservations
        for (const line of lines) {
            const balanceId = `${reqData.warehouseId}_${line.data.itemId}`;
            const balance = balances.get(balanceId);
            // Update balance
            transaction.set(balanceRefs.get(balanceId), {
                ...balance,
                lastUpdatedAt: firestore_1.FieldValue.serverTimestamp(),
            });
            // Create reservation
            const resRef = db.collection('reservations').doc();
            transaction.set(resRef, {
                reservationId: resRef.id,
                warehouseId: reqData.warehouseId,
                itemId: line.data.itemId,
                quantity: line.data.approvedQuantity,
                referenceType: 'MATERIAL_REQUEST',
                referenceId: parsed.requestId,
                status: domain_1.ReservationStatus.ACTIVE,
                createdBy: userProfile.uid,
                createdAt: firestore_1.FieldValue.serverTimestamp(),
            });
        }
        // Finalize request
        transaction.update(requestRef, {
            finalApprovalStatus: domain_1.FinalApprovalStatus.APPROVED,
            updatedBy: userProfile.uid,
            updatedAt: firestore_1.FieldValue.serverTimestamp(),
            version: firestore_1.FieldValue.increment(1),
        });
        await (0, audit_1.writeAuditLog)(transaction, {
            action: 'REQUEST_FINAL_APPROVED',
            actorId: userProfile.uid,
            entityId: requestRef.id,
            entityType: 'MATERIAL_REQUEST',
        });
        emitBusinessEvent(transaction, 'REQUEST_FINAL_APPROVED', 'MATERIAL_REQUEST', requestRef.id, {});
        return { success: true, status: 'APPROVED' };
    });
});
exports.executeEmergencyIssue = functions.https.onCall(async (data, context) => {
    const userProfile = await checkPermission(context, permissions_1.Permissions.INVENTORY_ISSUE_EMERGENCY);
    const parsed = validation_1.emergencyRequestSchema.parse(data);
    return db.runTransaction(async (transaction) => {
        // Read Phase
        const balanceRefs = new Map();
        const balances = new Map();
        for (const line of parsed.lines) {
            const balanceId = `${parsed.warehouseId}_${line.itemId}`;
            if (!balanceRefs.has(balanceId)) {
                const ref = db.collection('stockBalances').doc(balanceId);
                balanceRefs.set(balanceId, ref);
                const doc = await transaction.get(ref);
                balances.set(balanceId, doc.exists ? doc.data() : {
                    warehouseId: parsed.warehouseId,
                    itemId: line.itemId,
                    onHand: 0,
                    reserved: 0,
                    available: 0,
                });
            }
        }
        // Validation Phase (Assume emergency issue might allow negative stock based on policy, but we'll strictly enforce existing logic)
        const itemDataMap = new Map();
        for (const line of parsed.lines) {
            const balanceId = `${parsed.warehouseId}_${line.itemId}`;
            const balance = balances.get(balanceId);
            const policyDoc = await transaction.get(db.collection('inventoryPolicies').doc(balanceId));
            const allowNegative = policyDoc.exists ? policyDoc.data()?.allowNegativeStock : false;
            if (!allowNegative && balance.available < line.requestedQuantity) {
                throw new functions.https.HttpsError('failed-precondition', `Insufficient stock for item ${line.itemId} and negative stock is disabled.`);
            }
            balance.onHand -= line.requestedQuantity;
            balance.available = balance.onHand - balance.reserved;
            const itemRef = db.collection('items').doc(line.itemId);
            const itemDoc = await transaction.get(itemRef);
            itemDataMap.set(line.itemId, itemDoc.data());
        }
        // Write Phase
        const requestNumber = await generateRequestNumber(transaction);
        const requestRef = db.collection('materialRequests').doc();
        transaction.set(requestRef, {
            id: requestRef.id,
            requestNumber,
            departmentId: parsed.departmentId,
            warehouseId: parsed.warehouseId,
            lifecycleStatus: domain_1.RequestLifecycleStatus.IN_PROGRESS,
            technicalApprovalStatus: domain_1.TechnicalApprovalStatus.NOT_REQUIRED,
            finalApprovalStatus: domain_1.FinalApprovalStatus.PENDING, // Needs post-approval
            issueStatus: domain_1.IssueStatus.ISSUED,
            exceptionStatus: domain_1.ExceptionStatus.EMERGENCY_PENDING_POST_APPROVAL,
            emergencyJustification: parsed.emergencyJustification,
            createdBy: userProfile.uid,
            createdAt: firestore_1.FieldValue.serverTimestamp(),
            updatedBy: userProfile.uid,
            updatedAt: firestore_1.FieldValue.serverTimestamp(),
            version: 1,
        });
        for (const line of parsed.lines) {
            // Create request line
            const lineRef = db.collection('materialRequestLines').doc();
            const itemData = itemDataMap.get(line.itemId);
            transaction.set(lineRef, {
                id: lineRef.id,
                requestId: requestRef.id,
                itemId: line.itemId,
                itemCodeSnapshot: itemData.itemCode,
                itemNameSnapshot: itemData.nameEn,
                unitSnapshot: itemData.unitId,
                requestedQuantity: line.requestedQuantity,
                approvedQuantity: line.requestedQuantity,
                issuedQuantity: line.requestedQuantity,
            });
            // Execute Movement
            const movementRef = db.collection('stockMovements').doc();
            const balanceId = `${parsed.warehouseId}_${line.itemId}`;
            const balance = balances.get(balanceId);
            const prevOnHand = balance.onHand + line.requestedQuantity; // Reconstruct before
            transaction.set(movementRef, {
                movementId: movementRef.id,
                movementType: domain_1.MovementType.ISSUE,
                direction: domain_1.MovementDirection.OUT,
                warehouseId: parsed.warehouseId,
                itemId: line.itemId,
                quantity: line.requestedQuantity,
                previousBalance: prevOnHand,
                newBalance: balance.onHand,
                referenceType: 'EMERGENCY_MATERIAL_REQUEST',
                referenceId: requestRef.id,
                createdBy: userProfile.uid,
                createdAt: firestore_1.FieldValue.serverTimestamp(),
                operationId: requestRef.id, // For idempotency linking
            });
            // Update Balance
            transaction.set(balanceRefs.get(balanceId), {
                ...balance,
                lastMovementId: movementRef.id,
                lastUpdatedAt: firestore_1.FieldValue.serverTimestamp(),
            });
        }
        await (0, audit_1.writeAuditLog)(transaction, {
            action: 'EMERGENCY_REQUEST_EXECUTED',
            actorId: userProfile.uid,
            entityId: requestRef.id,
            entityType: 'MATERIAL_REQUEST',
            details: { justification: parsed.emergencyJustification },
        });
        emitBusinessEvent(transaction, 'EMERGENCY_ISSUE_EXECUTED', 'MATERIAL_REQUEST', requestRef.id, {});
        return { success: true, requestId: requestRef.id, requestNumber };
    });
});
exports.issueMaterialRequest = functions.https.onCall(async (data, context) => {
    const userProfile = await checkPermission(context, permissions_1.Permissions.INVENTORY_ISSUE_NORMAL);
    const { issueRequestSchema } = await Promise.resolve().then(() => __importStar(require('@calm-wms/validation')));
    const parsed = issueRequestSchema.parse(data);
    return db.runTransaction(async (transaction) => {
        const requestRef = db.collection('materialRequests').doc(parsed.requestId);
        const reqDoc = await transaction.get(requestRef);
        if (!reqDoc.exists)
            throw new functions.https.HttpsError('not-found', 'Request not found.');
        const reqData = reqDoc.data();
        if (reqData.finalApprovalStatus !== domain_1.FinalApprovalStatus.APPROVED) {
            throw new functions.https.HttpsError('failed-precondition', 'Request must be final approved.');
        }
        if (reqData.issueStatus === domain_1.IssueStatus.ISSUED) {
            throw new functions.https.HttpsError('failed-precondition', 'Request is already issued.');
        }
        // Read reservations for this request
        const reservationsSnap = await transaction.get(db.collection('reservations')
            .where('referenceType', '==', 'MATERIAL_REQUEST')
            .where('referenceId', '==', parsed.requestId)
            .where('status', '==', domain_1.ReservationStatus.ACTIVE));
        const balanceRefs = new Map();
        const balances = new Map();
        // Cache balances safely
        for (const resDoc of reservationsSnap.docs) {
            const res = resDoc.data();
            const balanceId = `${res.warehouseId}_${res.itemId}`;
            if (!balanceRefs.has(balanceId)) {
                const ref = db.collection('stockBalances').doc(balanceId);
                balanceRefs.set(balanceId, ref);
                const doc = await transaction.get(ref);
                balances.set(balanceId, doc.exists ? doc.data() : null);
            }
        }
        // Process each reservation (issue it)
        for (const resDoc of reservationsSnap.docs) {
            const res = resDoc.data();
            const balanceId = `${res.warehouseId}_${res.itemId}`;
            const balance = balances.get(balanceId);
            if (!balance)
                throw new functions.https.HttpsError('internal', 'Balance not found for reservation');
            const prevOnHand = balance.onHand;
            balance.onHand -= res.quantity;
            balance.reserved -= res.quantity;
            balance.available = balance.onHand - balance.reserved;
            const movementRef = db.collection('stockMovements').doc();
            transaction.set(movementRef, {
                movementId: movementRef.id,
                movementType: domain_1.MovementType.ISSUE,
                direction: domain_1.MovementDirection.OUT,
                warehouseId: res.warehouseId,
                itemId: res.itemId,
                quantity: res.quantity,
                previousBalance: prevOnHand,
                newBalance: balance.onHand,
                referenceType: 'MATERIAL_REQUEST',
                referenceId: requestRef.id,
                createdBy: userProfile.uid,
                createdAt: firestore_1.FieldValue.serverTimestamp(),
                operationId: requestRef.id,
            });
            transaction.update(resDoc.ref, {
                status: domain_1.ReservationStatus.ISSUED,
                updatedAt: firestore_1.FieldValue.serverTimestamp(),
            });
            transaction.set(balanceRefs.get(balanceId), {
                ...balance,
                lastMovementId: movementRef.id,
                lastUpdatedAt: firestore_1.FieldValue.serverTimestamp(),
            });
        }
        transaction.update(requestRef, {
            issueStatus: domain_1.IssueStatus.ISSUED,
            lifecycleStatus: domain_1.RequestLifecycleStatus.COMPLETED,
            updatedBy: userProfile.uid,
            updatedAt: firestore_1.FieldValue.serverTimestamp(),
            version: firestore_1.FieldValue.increment(1),
        });
        await (0, audit_1.writeAuditLog)(transaction, {
            action: 'REQUEST_ISSUED',
            actorId: userProfile.uid,
            entityId: requestRef.id,
            entityType: 'MATERIAL_REQUEST',
        });
        emitBusinessEvent(transaction, 'REQUEST_ISSUED', 'MATERIAL_REQUEST', requestRef.id, {});
        return { success: true };
    });
});
exports.cancelRequest = functions.https.onCall(async (data, context) => {
    const userProfile = await checkPermission(context, permissions_1.Permissions.REQUEST_CREATE);
    const { cancelRequestSchema } = await Promise.resolve().then(() => __importStar(require('@calm-wms/validation')));
    const parsed = cancelRequestSchema.parse(data);
    return db.runTransaction(async (transaction) => {
        const requestRef = db.collection('materialRequests').doc(parsed.requestId);
        const reqDoc = await transaction.get(requestRef);
        if (!reqDoc.exists)
            throw new functions.https.HttpsError('not-found', 'Request not found.');
        const reqData = reqDoc.data();
        if (reqData.lifecycleStatus === domain_1.RequestLifecycleStatus.COMPLETED || reqData.lifecycleStatus === domain_1.RequestLifecycleStatus.CANCELLED) {
            throw new functions.https.HttpsError('failed-precondition', 'Cannot cancel a completed or already cancelled request.');
        }
        // Release reservations if it was final approved
        if (reqData.finalApprovalStatus === domain_1.FinalApprovalStatus.APPROVED) {
            const reservationsSnap = await transaction.get(db.collection('reservations')
                .where('referenceType', '==', 'MATERIAL_REQUEST')
                .where('referenceId', '==', parsed.requestId)
                .where('status', '==', domain_1.ReservationStatus.ACTIVE));
            const balanceRefs = new Map();
            const balances = new Map();
            for (const resDoc of reservationsSnap.docs) {
                const res = resDoc.data();
                const balanceId = `${res.warehouseId}_${res.itemId}`;
                if (!balanceRefs.has(balanceId)) {
                    const ref = db.collection('stockBalances').doc(balanceId);
                    balanceRefs.set(balanceId, ref);
                    const doc = await transaction.get(ref);
                    balances.set(balanceId, doc.exists ? doc.data() : null);
                }
            }
            for (const resDoc of reservationsSnap.docs) {
                const res = resDoc.data();
                const balanceId = `${res.warehouseId}_${res.itemId}`;
                const balance = balances.get(balanceId);
                if (balance) {
                    balance.reserved -= res.quantity;
                    balance.available = balance.onHand - balance.reserved;
                    transaction.set(balanceRefs.get(balanceId), {
                        ...balance,
                        lastUpdatedAt: firestore_1.FieldValue.serverTimestamp(),
                    });
                }
                transaction.update(resDoc.ref, {
                    status: domain_1.ReservationStatus.CANCELLED,
                    updatedAt: firestore_1.FieldValue.serverTimestamp(),
                });
            }
        }
        transaction.update(requestRef, {
            lifecycleStatus: domain_1.RequestLifecycleStatus.CANCELLED,
            issueStatus: domain_1.IssueStatus.CANCELLED,
            notes: parsed.cancelReason ? `Cancelled: ${parsed.cancelReason}` : reqData.notes,
            updatedBy: userProfile.uid,
            updatedAt: firestore_1.FieldValue.serverTimestamp(),
            version: firestore_1.FieldValue.increment(1),
        });
        await (0, audit_1.writeAuditLog)(transaction, {
            action: 'REQUEST_CANCELLED',
            actorId: userProfile.uid,
            entityId: requestRef.id,
            entityType: 'MATERIAL_REQUEST',
        });
        emitBusinessEvent(transaction, 'REQUEST_CANCELLED', 'MATERIAL_REQUEST', requestRef.id, {});
        return { success: true };
    });
});
//# sourceMappingURL=requestEngine.js.map