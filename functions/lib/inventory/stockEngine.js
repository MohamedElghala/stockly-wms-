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
exports.transferStock = exports.adjustStock = exports.scrapStock = exports.emergencyIssue = exports.issueDirectStock = exports.issueReservedStock = exports.cancelReservation = exports.releaseReservation = exports.reserveStock = exports.receiveStock = void 0;
const admin = __importStar(require("firebase-admin"));
const functions = __importStar(require("firebase-functions/v1"));
const app_1 = require("firebase-admin/app");
const firestore_1 = require("firebase-admin/firestore");
const authorization_1 = require("../security/authorization");
const permissions_1 = require("@calm-wms/permissions");
const domain_1 = require("@calm-wms/domain");
const audit_1 = require("../security/audit");
const validation_1 = require("@calm-wms/validation");
if (!(0, app_1.getApps)()?.length) {
    admin.initializeApp();
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
/**
 * Idempotent execution wrapper for stock operations.
 */
async function executeIdempotentStockOperation(idempotencyKey, operationType, actorId, payload, transactionCallback) {
    const payloadHash = Buffer.from(JSON.stringify(payload)).toString('base64');
    const operationRef = db.collection('operations').doc(idempotencyKey);
    return db.runTransaction(async (transaction) => {
        const opDoc = await transaction.get(operationRef);
        if (opDoc.exists) {
            const opData = opDoc.data();
            if (opData.status === 'COMPLETED') {
                if (opData.operationType !== operationType || opData.payloadHash !== payloadHash) {
                    throw new functions.https.HttpsError('already-exists', 'IDEMPOTENCY_KEY_REUSED: Key used with different payload.');
                }
                return opData.resultReference; // Return original successful result
            }
            if (opData.status === 'PENDING') {
                throw new functions.https.HttpsError('resource-exhausted', 'Operation is already in progress.');
            }
        }
        // Execute business logic
        const result = await transactionCallback(transaction);
        // Mark as COMPLETED
        transaction.set(operationRef, {
            operationId: idempotencyKey,
            idempotencyKey,
            operationType,
            actorId,
            payloadHash,
            status: 'COMPLETED',
            createdAt: firestore_1.FieldValue.serverTimestamp(),
            completedAt: firestore_1.FieldValue.serverTimestamp(),
            resultReference: result,
        });
        return result;
    });
}
/**
 * Helper to safely read or initialize a StockBalance.
 */
async function getStockBalance(transaction, warehouseId, itemId) {
    const balanceId = `${warehouseId}_${itemId}`;
    const balanceRef = db.collection('stockBalances').doc(balanceId);
    const doc = await transaction.get(balanceRef);
    if (!doc.exists) {
        return {
            ref: balanceRef,
            data: {
                warehouseId,
                itemId,
                onHand: 0,
                reserved: 0,
                available: 0,
                lastUpdatedAt: Date.now()
            }
        };
    }
    return { ref: balanceRef, data: doc.data() };
}
/**
 * Emit business event for outbox processing.
 */
function emitBusinessEvent(transaction, eventType, entityType, entityId, operationId, payload) {
    const eventRef = db.collection('businessEvents').doc();
    transaction.set(eventRef, {
        eventId: eventRef.id,
        eventType,
        entityType,
        entityId,
        operationId,
        eventVersion: 1,
        status: 'PENDING',
        payload,
        createdAt: firestore_1.FieldValue.serverTimestamp(),
        retryCount: 0,
    });
}
// -----------------------------------------------------------------------------
// RECEIPT
// -----------------------------------------------------------------------------
exports.receiveStock = functions.https.onCall(async (data, context) => {
    const userProfile = await checkPermission(context, permissions_1.Permissions.INVENTORY_RECEIVE);
    const parsed = validation_1.receiveStockSchema.parse(data);
    return executeIdempotentStockOperation(parsed.idempotencyKey, 'RECEIPT', userProfile.uid, parsed, async (transaction) => {
        // Create receipt record
        const receiptRef = db.collection('receipts').doc();
        const receiptData = {
            receiptId: receiptRef.id,
            receiptNumber: parsed.receiptNumber,
            warehouseId: parsed.warehouseId,
            supplierName: parsed.supplierName,
            invoiceNumber: parsed.invoiceNumber || null,
            receivedBy: userProfile.uid,
            createdAt: firestore_1.FieldValue.serverTimestamp(),
        };
        const movementIds = [];
        for (const line of parsed.lines) {
            // Fetch item details for snapshot
            const itemRef = db.collection('items').doc(line.itemId);
            const itemDoc = await transaction.get(itemRef);
            if (!itemDoc.exists) {
                throw new functions.https.HttpsError('not-found', `Item ${line.itemId} not found.`);
            }
            const itemData = itemDoc.data();
            // Update balance
            const balanceInfo = await getStockBalance(transaction, parsed.warehouseId, line.itemId);
            const prevOnHand = balanceInfo.data.onHand;
            const newOnHand = prevOnHand + line.receivedQty;
            const newAvailable = balanceInfo.data.available + line.receivedQty;
            // Create movement
            const movementRef = db.collection('stockMovements').doc();
            transaction.set(movementRef, {
                movementId: movementRef.id,
                movementType: domain_1.MovementType.RECEIPT,
                direction: domain_1.MovementDirection.IN,
                warehouseId: parsed.warehouseId,
                itemId: line.itemId,
                quantity: line.receivedQty,
                previousBalance: prevOnHand,
                newBalance: newOnHand,
                referenceType: 'RECEIPT',
                referenceId: receiptRef.id,
                referenceNumber: parsed.receiptNumber,
                createdBy: userProfile.uid,
                createdAt: firestore_1.FieldValue.serverTimestamp(),
                operationId: parsed.idempotencyKey,
            });
            movementIds.push(movementRef.id);
            // Update balance document
            transaction.set(balanceInfo.ref, {
                ...balanceInfo.data,
                onHand: newOnHand,
                available: newAvailable,
                lastMovementId: movementRef.id,
                lastUpdatedAt: firestore_1.FieldValue.serverTimestamp(),
            });
        }
        transaction.set(receiptRef, receiptData);
        await (0, audit_1.writeAuditLog)(transaction, {
            action: 'RECEIPT_POSTED',
            actorId: userProfile.uid,
            entityId: receiptRef.id,
            entityType: 'RECEIPT',
            details: { linesCount: parsed.lines.length },
        });
        emitBusinessEvent(transaction, 'RECEIPT_POSTED', 'RECEIPT', receiptRef.id, parsed.idempotencyKey, { receiptNumber: parsed.receiptNumber });
        return { success: true, receiptId: receiptRef.id, movementIds };
    });
});
// -----------------------------------------------------------------------------
// RESERVATION ENGINE
// -----------------------------------------------------------------------------
exports.reserveStock = functions.https.onCall(async (data, context) => {
    const userProfile = await checkPermission(context, permissions_1.Permissions.INVENTORY_RESERVE);
    const parsed = validation_1.reserveStockSchema.parse(data);
    return executeIdempotentStockOperation(parsed.idempotencyKey, 'RESERVATION_CREATE', userProfile.uid, parsed, async (transaction) => {
        // Must check if allowNegativeStock logic applies to reservations.
        // Policy: Reservations cannot be created against unavailable stock, even if negative stock is allowed.
        const balanceInfo = await getStockBalance(transaction, parsed.warehouseId, parsed.itemId);
        if (balanceInfo.data.available < parsed.quantity) {
            throw new functions.https.HttpsError('failed-precondition', 'Insufficient available stock for reservation.');
        }
        const newReserved = balanceInfo.data.reserved + parsed.quantity;
        const newAvailable = balanceInfo.data.onHand - newReserved;
        // Invariants
        if (newReserved < 0)
            throw new functions.https.HttpsError('internal', 'Invariant failed: reserved < 0');
        if (newAvailable < 0)
            throw new functions.https.HttpsError('internal', 'Invariant failed: available < 0');
        const reservationRef = db.collection('reservations').doc();
        transaction.set(reservationRef, {
            reservationId: reservationRef.id,
            warehouseId: parsed.warehouseId,
            itemId: parsed.itemId,
            quantity: parsed.quantity,
            referenceType: parsed.referenceType,
            referenceId: parsed.referenceId,
            status: domain_1.ReservationStatus.ACTIVE,
            createdBy: userProfile.uid,
            createdAt: firestore_1.FieldValue.serverTimestamp(),
            operationId: parsed.idempotencyKey,
        });
        transaction.set(balanceInfo.ref, {
            ...balanceInfo.data,
            reserved: newReserved,
            available: newAvailable,
            lastUpdatedAt: firestore_1.FieldValue.serverTimestamp(),
        });
        await (0, audit_1.writeAuditLog)(transaction, {
            action: 'RESERVATION_CREATED',
            actorId: userProfile.uid,
            entityId: reservationRef.id,
            entityType: 'RESERVATION',
            details: { quantity: parsed.quantity, referenceId: parsed.referenceId },
        });
        emitBusinessEvent(transaction, 'RESERVATION_CREATED', 'RESERVATION', reservationRef.id, parsed.idempotencyKey, { quantity: parsed.quantity });
        return { success: true, reservationId: reservationRef.id };
    });
});
exports.releaseReservation = functions.https.onCall(async (data, context) => {
    const userProfile = await checkPermission(context, permissions_1.Permissions.INVENTORY_RESERVE);
    const parsed = validation_1.releaseReservationSchema.parse(data);
    return executeIdempotentStockOperation(parsed.idempotencyKey, 'RESERVATION_RELEASE', userProfile.uid, parsed, async (transaction) => {
        const reservationRef = db.collection('reservations').doc(parsed.reservationId);
        const resDoc = await transaction.get(reservationRef);
        if (!resDoc.exists) {
            throw new functions.https.HttpsError('not-found', 'Reservation not found.');
        }
        const resData = resDoc.data();
        if (resData.status !== domain_1.ReservationStatus.ACTIVE) {
            throw new functions.https.HttpsError('failed-precondition', 'Only ACTIVE reservations can be released.');
        }
        const balanceInfo = await getStockBalance(transaction, resData.warehouseId, resData.itemId);
        const newReserved = balanceInfo.data.reserved - resData.quantity;
        const newAvailable = balanceInfo.data.onHand - newReserved;
        if (newReserved < 0)
            throw new functions.https.HttpsError('internal', 'Invariant failed: reserved < 0');
        transaction.update(reservationRef, {
            status: domain_1.ReservationStatus.CANCELLED,
            updatedAt: firestore_1.FieldValue.serverTimestamp(),
        });
        transaction.set(balanceInfo.ref, {
            ...balanceInfo.data,
            reserved: newReserved,
            available: newAvailable,
            lastUpdatedAt: firestore_1.FieldValue.serverTimestamp(),
        });
        await (0, audit_1.writeAuditLog)(transaction, {
            action: 'RESERVATION_RELEASED',
            actorId: userProfile.uid,
            entityId: reservationRef.id,
            entityType: 'RESERVATION',
        });
        emitBusinessEvent(transaction, 'RESERVATION_RELEASED', 'RESERVATION', reservationRef.id, parsed.idempotencyKey, {});
        return { success: true };
    });
});
exports.cancelReservation = exports.releaseReservation; // Alias
// -----------------------------------------------------------------------------
// ISSUE OPERATIONS
// -----------------------------------------------------------------------------
exports.issueReservedStock = functions.https.onCall(async (data, context) => {
    const userProfile = await checkPermission(context, permissions_1.Permissions.INVENTORY_ISSUE_NORMAL);
    const parsed = validation_1.issueReservedStockSchema.parse(data);
    return executeIdempotentStockOperation(parsed.idempotencyKey, 'ISSUE_RESERVED', userProfile.uid, parsed, async (transaction) => {
        const reservationRef = db.collection('reservations').doc(parsed.reservationId);
        const resDoc = await transaction.get(reservationRef);
        if (!resDoc.exists) {
            throw new functions.https.HttpsError('not-found', 'Reservation not found.');
        }
        const resData = resDoc.data();
        if (resData.status !== domain_1.ReservationStatus.ACTIVE) {
            throw new functions.https.HttpsError('failed-precondition', 'Reservation is not ACTIVE.');
        }
        if (resData.quantity < parsed.issueQuantity) {
            throw new functions.https.HttpsError('out-of-range', 'Issue quantity exceeds reserved quantity.');
        }
        const balanceInfo = await getStockBalance(transaction, resData.warehouseId, resData.itemId);
        const prevOnHand = balanceInfo.data.onHand;
        const newOnHand = prevOnHand - parsed.issueQuantity;
        const newReserved = balanceInfo.data.reserved - parsed.issueQuantity;
        const newAvailable = newOnHand - newReserved;
        // Check invariants
        if (newReserved < 0)
            throw new functions.https.HttpsError('internal', 'Invariant failed: reserved < 0');
        // Create Movement
        const movementRef = db.collection('stockMovements').doc();
        transaction.set(movementRef, {
            movementId: movementRef.id,
            movementType: domain_1.MovementType.ISSUE,
            direction: domain_1.MovementDirection.OUT,
            warehouseId: resData.warehouseId,
            itemId: resData.itemId,
            quantity: parsed.issueQuantity,
            previousBalance: prevOnHand,
            newBalance: newOnHand,
            referenceType: 'RESERVATION',
            referenceId: resData.reservationId,
            createdBy: userProfile.uid,
            createdAt: firestore_1.FieldValue.serverTimestamp(),
            operationId: parsed.idempotencyKey,
        });
        // Update Reservation Status if fully issued
        if (parsed.issueQuantity === resData.quantity) {
            transaction.update(reservationRef, {
                status: domain_1.ReservationStatus.ISSUED,
                updatedAt: firestore_1.FieldValue.serverTimestamp(),
            });
        }
        else {
            // Partial issue from reservation - decrease reservation quantity
            transaction.update(reservationRef, {
                quantity: resData.quantity - parsed.issueQuantity,
                updatedAt: firestore_1.FieldValue.serverTimestamp(),
            });
        }
        // Update Balance
        transaction.set(balanceInfo.ref, {
            ...balanceInfo.data,
            onHand: newOnHand,
            reserved: newReserved,
            available: newAvailable,
            lastMovementId: movementRef.id,
            lastUpdatedAt: firestore_1.FieldValue.serverTimestamp(),
        });
        await (0, audit_1.writeAuditLog)(transaction, {
            action: 'ISSUE_POSTED_RESERVED',
            actorId: userProfile.uid,
            entityId: movementRef.id,
            entityType: 'MOVEMENT',
        });
        emitBusinessEvent(transaction, 'ISSUE_POSTED', 'MOVEMENT', movementRef.id, parsed.idempotencyKey, { type: 'RESERVED' });
        return { success: true, movementId: movementRef.id };
    });
});
exports.issueDirectStock = functions.https.onCall(async (data, context) => {
    const userProfile = await checkPermission(context, permissions_1.Permissions.INVENTORY_ISSUE_NORMAL);
    const parsed = validation_1.issueDirectStockSchema.parse(data);
    return executeIdempotentStockOperation(parsed.idempotencyKey, 'ISSUE_DIRECT', userProfile.uid, parsed, async (transaction) => {
        const balanceInfo = await getStockBalance(transaction, parsed.warehouseId, parsed.itemId);
        const policyDoc = await transaction.get(db.collection('inventoryPolicies').doc(`${parsed.warehouseId}_${parsed.itemId}`));
        let allowNegativeStock = false;
        if (policyDoc.exists) {
            allowNegativeStock = policyDoc.data()?.allowNegativeStock ?? false;
        }
        if (!allowNegativeStock && balanceInfo.data.available < parsed.quantity) {
            throw new functions.https.HttpsError('failed-precondition', 'Insufficient available stock and negative stock is disabled.');
        }
        const prevOnHand = balanceInfo.data.onHand;
        const newOnHand = prevOnHand - parsed.quantity;
        const newAvailable = newOnHand - balanceInfo.data.reserved;
        const movementRef = db.collection('stockMovements').doc();
        transaction.set(movementRef, {
            movementId: movementRef.id,
            movementType: domain_1.MovementType.ISSUE,
            direction: domain_1.MovementDirection.OUT,
            warehouseId: parsed.warehouseId,
            itemId: parsed.itemId,
            quantity: parsed.quantity,
            previousBalance: prevOnHand,
            newBalance: newOnHand,
            referenceType: parsed.referenceType,
            referenceId: parsed.referenceId,
            createdBy: userProfile.uid,
            createdAt: firestore_1.FieldValue.serverTimestamp(),
            operationId: parsed.idempotencyKey,
        });
        transaction.set(balanceInfo.ref, {
            ...balanceInfo.data,
            onHand: newOnHand,
            available: newAvailable,
            lastMovementId: movementRef.id,
            lastUpdatedAt: firestore_1.FieldValue.serverTimestamp(),
        });
        const issueRef = db.collection('issues').doc();
        transaction.set(issueRef, {
            issueId: issueRef.id,
            warehouseId: parsed.warehouseId,
            itemId: parsed.itemId,
            quantity: parsed.quantity,
            referenceType: parsed.referenceType,
            referenceId: parsed.referenceId,
            createdBy: userProfile.uid,
            createdAt: firestore_1.FieldValue.serverTimestamp(),
            operationId: parsed.idempotencyKey,
        });
        await (0, audit_1.writeAuditLog)(transaction, {
            action: 'ISSUE_POSTED_DIRECT',
            actorId: userProfile.uid,
            entityId: movementRef.id,
            entityType: 'MOVEMENT',
        });
        emitBusinessEvent(transaction, 'ISSUE_POSTED', 'MOVEMENT', movementRef.id, parsed.idempotencyKey, { type: 'DIRECT' });
        return { success: true, movementId: movementRef.id };
    });
});
exports.emergencyIssue = functions.https.onCall(async (data, context) => {
    const userProfile = await checkPermission(context, permissions_1.Permissions.INVENTORY_ISSUE_EMERGENCY);
    const parsed = validation_1.emergencyIssueSchema.parse(data);
    return executeIdempotentStockOperation(parsed.idempotencyKey, 'ISSUE_EMERGENCY', userProfile.uid, parsed, async (transaction) => {
        const balanceInfo = await getStockBalance(transaction, parsed.warehouseId, parsed.itemId);
        const policyDoc = await transaction.get(db.collection('inventoryPolicies').doc(`${parsed.warehouseId}_${parsed.itemId}`));
        let allowNegativeStock = false;
        if (policyDoc.exists) {
            allowNegativeStock = policyDoc.data()?.allowNegativeStock ?? false;
        }
        if (!allowNegativeStock && balanceInfo.data.available < parsed.quantity) {
            throw new functions.https.HttpsError('failed-precondition', 'Insufficient available stock and negative stock is disabled.');
        }
        const prevOnHand = balanceInfo.data.onHand;
        const newOnHand = prevOnHand - parsed.quantity;
        const newAvailable = newOnHand - balanceInfo.data.reserved;
        const movementRef = db.collection('stockMovements').doc();
        transaction.set(movementRef, {
            movementId: movementRef.id,
            movementType: domain_1.MovementType.ISSUE,
            direction: domain_1.MovementDirection.OUT,
            warehouseId: parsed.warehouseId,
            itemId: parsed.itemId,
            quantity: parsed.quantity,
            previousBalance: prevOnHand,
            newBalance: newOnHand,
            referenceType: 'EMERGENCY_ISSUE',
            referenceId: parsed.idempotencyKey,
            createdBy: userProfile.uid,
            createdAt: firestore_1.FieldValue.serverTimestamp(),
            operationId: parsed.idempotencyKey,
        });
        const emergencyRecordRef = db.collection('emergencyIssues').doc(parsed.idempotencyKey);
        transaction.set(emergencyRecordRef, {
            emergencyReason: parsed.emergencyReason,
            receiver: parsed.receiver,
            warehouseId: parsed.warehouseId,
            itemId: parsed.itemId,
            quantity: parsed.quantity,
            relatedRequestId: parsed.relatedRequestId || null,
            relatedWorkOrderId: parsed.relatedWorkOrderId || null,
            executedBy: userProfile.uid,
            createdAt: firestore_1.FieldValue.serverTimestamp(),
            finalApprovalStatus: 'PENDING',
            exceptionStatus: 'EMERGENCY_PENDING_POST_APPROVAL',
            issueStatus: 'ISSUED',
            movementId: movementRef.id,
        });
        transaction.set(balanceInfo.ref, {
            ...balanceInfo.data,
            onHand: newOnHand,
            available: newAvailable,
            lastMovementId: movementRef.id,
            lastUpdatedAt: firestore_1.FieldValue.serverTimestamp(),
        });
        await (0, audit_1.writeAuditLog)(transaction, {
            action: 'EMERGENCY_ISSUE_EXECUTED',
            actorId: userProfile.uid,
            entityId: movementRef.id,
            entityType: 'MOVEMENT',
            details: { reason: parsed.emergencyReason },
        });
        emitBusinessEvent(transaction, 'EMERGENCY_ISSUE_EXECUTED', 'EMERGENCY_ISSUE', emergencyRecordRef.id, parsed.idempotencyKey, {});
        return { success: true, movementId: movementRef.id, emergencyIssueId: emergencyRecordRef.id };
    });
});
// -----------------------------------------------------------------------------
// OTHER OPERATIONS (SCRAP, ADJUST, TRANSFER)
// -----------------------------------------------------------------------------
exports.scrapStock = functions.https.onCall(async (data, context) => {
    const userProfile = await checkPermission(context, permissions_1.Permissions.INVENTORY_SCRAP);
    const parsed = validation_1.scrapStockSchema.parse(data);
    return executeIdempotentStockOperation(parsed.idempotencyKey, 'SCRAP', userProfile.uid, parsed, async (transaction) => {
        const balanceInfo = await getStockBalance(transaction, parsed.warehouseId, parsed.itemId);
        const policyDoc = await transaction.get(db.collection('inventoryPolicies').doc(`${parsed.warehouseId}_${parsed.itemId}`));
        let allowNegativeStock = false;
        if (policyDoc.exists) {
            allowNegativeStock = policyDoc.data()?.allowNegativeStock ?? false;
        }
        if (!allowNegativeStock && balanceInfo.data.onHand < parsed.quantity) {
            throw new functions.https.HttpsError('failed-precondition', 'Insufficient onHand stock for scrap and negative stock is disabled.');
        }
        const prevOnHand = balanceInfo.data.onHand;
        const newOnHand = prevOnHand; // Scrap does not affect balance
        const newAvailable = balanceInfo.data.available;
        const movementRef = db.collection('stockMovements').doc();
        transaction.set(movementRef, {
            movementId: movementRef.id,
            movementType: domain_1.MovementType.SCRAP,
            direction: domain_1.MovementDirection.OUT,
            warehouseId: parsed.warehouseId,
            itemId: parsed.itemId,
            quantity: parsed.quantity,
            previousBalance: prevOnHand,
            newBalance: newOnHand,
            referenceType: 'SCRAP_REASON',
            referenceId: parsed.idempotencyKey,
            createdBy: userProfile.uid,
            createdAt: firestore_1.FieldValue.serverTimestamp(),
            operationId: parsed.idempotencyKey,
        });
        transaction.set(balanceInfo.ref, {
            ...balanceInfo.data,
            onHand: newOnHand,
            available: newAvailable,
            lastMovementId: movementRef.id,
            lastUpdatedAt: firestore_1.FieldValue.serverTimestamp(),
        });
        const scrapRef = db.collection('scraps').doc();
        transaction.set(scrapRef, {
            scrapId: scrapRef.id,
            warehouseId: parsed.warehouseId,
            itemId: parsed.itemId,
            quantity: parsed.quantity,
            reason: parsed.reason,
            referenceType: 'SCRAP_REASON',
            referenceId: parsed.idempotencyKey,
            createdBy: userProfile.uid,
            createdAt: firestore_1.FieldValue.serverTimestamp(),
            operationId: parsed.idempotencyKey,
        });
        await (0, audit_1.writeAuditLog)(transaction, {
            action: 'SCRAP_POSTED',
            actorId: userProfile.uid,
            entityId: movementRef.id,
            entityType: 'MOVEMENT',
            details: { reason: parsed.reason },
        });
        emitBusinessEvent(transaction, 'SCRAP_POSTED', 'MOVEMENT', movementRef.id, parsed.idempotencyKey, { reason: parsed.reason });
        return { success: true, movementId: movementRef.id };
    });
});
exports.adjustStock = functions.https.onCall(async (data, context) => {
    const userProfile = await checkPermission(context, permissions_1.Permissions.INVENTORY_ADJUST);
    const parsed = validation_1.adjustStockSchema.parse(data);
    return executeIdempotentStockOperation(parsed.idempotencyKey, 'ADJUSTMENT', userProfile.uid, parsed, async (transaction) => {
        const balanceInfo = await getStockBalance(transaction, parsed.warehouseId, parsed.itemId);
        const prevOnHand = balanceInfo.data.onHand;
        const newOnHand = parsed.direction === domain_1.MovementDirection.IN ? prevOnHand + parsed.quantity : prevOnHand - parsed.quantity;
        if (parsed.direction === domain_1.MovementDirection.OUT) {
            const policyDoc = await transaction.get(db.collection('inventoryPolicies').doc(`${parsed.warehouseId}_${parsed.itemId}`));
            let allowNegativeStock = false;
            if (policyDoc.exists) {
                allowNegativeStock = policyDoc.data()?.allowNegativeStock ?? false;
            }
            if (!allowNegativeStock && newOnHand < 0) {
                throw new functions.https.HttpsError('failed-precondition', 'Adjustment would result in negative stock, which is disabled.');
            }
        }
        const newAvailable = newOnHand - balanceInfo.data.reserved;
        const movementRef = db.collection('stockMovements').doc();
        transaction.set(movementRef, {
            movementId: movementRef.id,
            movementType: domain_1.MovementType.ADJUSTMENT,
            direction: parsed.direction,
            warehouseId: parsed.warehouseId,
            itemId: parsed.itemId,
            quantity: parsed.quantity,
            previousBalance: prevOnHand,
            newBalance: newOnHand,
            referenceType: 'ADJUSTMENT_REASON',
            referenceId: parsed.idempotencyKey,
            createdBy: userProfile.uid,
            createdAt: firestore_1.FieldValue.serverTimestamp(),
            operationId: parsed.idempotencyKey,
        });
        transaction.set(balanceInfo.ref, {
            ...balanceInfo.data,
            onHand: newOnHand,
            available: newAvailable,
            lastMovementId: movementRef.id,
            lastUpdatedAt: firestore_1.FieldValue.serverTimestamp(),
        });
        await (0, audit_1.writeAuditLog)(transaction, {
            action: 'ADJUSTMENT_POSTED',
            actorId: userProfile.uid,
            entityId: movementRef.id,
            entityType: 'MOVEMENT',
            details: { direction: parsed.direction, reason: parsed.reason },
        });
        emitBusinessEvent(transaction, 'STOCK_ADJUSTED', 'MOVEMENT', movementRef.id, parsed.idempotencyKey, { direction: parsed.direction });
        return { success: true, movementId: movementRef.id };
    });
});
exports.transferStock = functions.https.onCall(async (data, context) => {
    const userProfile = await checkPermission(context, permissions_1.Permissions.INVENTORY_TRANSFER);
    const parsed = validation_1.transferStockSchema.parse(data);
    return executeIdempotentStockOperation(parsed.idempotencyKey, 'TRANSFER', userProfile.uid, parsed, async (transaction) => {
        const transferRef = db.collection('transfers').doc();
        const movementIds = [];
        // 1. Read phase: Collect all source balances, policies, and destination balances
        const lineData = [];
        for (const line of parsed.lines) {
            const sourceBalanceInfo = await getStockBalance(transaction, parsed.sourceWarehouseId, line.itemId);
            const policyDoc = await transaction.get(db.collection('inventoryPolicies').doc(`${parsed.sourceWarehouseId}_${line.itemId}`));
            const destBalanceInfo = await getStockBalance(transaction, parsed.destinationWarehouseId, line.itemId);
            let allowNegativeStock = false;
            if (policyDoc.exists) {
                allowNegativeStock = policyDoc.data()?.allowNegativeStock ?? false;
            }
            if (!allowNegativeStock && sourceBalanceInfo.data.available < line.quantity) {
                throw new functions.https.HttpsError('failed-precondition', `Insufficient available stock in source warehouse for item ${line.itemId}.`);
            }
            lineData.push({
                line,
                sourceBalanceInfo,
                destBalanceInfo
            });
        }
        // 2. Write phase: Execute all writes
        for (const data of lineData) {
            const { line, sourceBalanceInfo, destBalanceInfo } = data;
            const sourcePrevOnHand = sourceBalanceInfo.data.onHand;
            const sourceNewOnHand = sourcePrevOnHand - line.quantity;
            const sourceNewAvailable = sourceNewOnHand - sourceBalanceInfo.data.reserved;
            // Create OUT movement
            const outMovementRef = db.collection('stockMovements').doc();
            transaction.set(outMovementRef, {
                movementId: outMovementRef.id,
                movementType: domain_1.MovementType.TRANSFER,
                direction: domain_1.MovementDirection.OUT,
                warehouseId: parsed.sourceWarehouseId,
                itemId: line.itemId,
                quantity: line.quantity,
                previousBalance: sourcePrevOnHand,
                newBalance: sourceNewOnHand,
                referenceType: 'TRANSFER',
                referenceId: transferRef.id,
                referenceNumber: parsed.transferNumber,
                createdBy: userProfile.uid,
                createdAt: firestore_1.FieldValue.serverTimestamp(),
                correlationId: parsed.idempotencyKey,
                operationId: parsed.idempotencyKey,
            });
            movementIds.push(outMovementRef.id);
            // Update Source Balance
            transaction.set(sourceBalanceInfo.ref, {
                ...sourceBalanceInfo.data,
                onHand: sourceNewOnHand,
                available: sourceNewAvailable,
                lastMovementId: outMovementRef.id,
                lastUpdatedAt: firestore_1.FieldValue.serverTimestamp(),
            });
            const destPrevOnHand = destBalanceInfo.data.onHand;
            const destNewOnHand = destPrevOnHand + line.quantity;
            const destNewAvailable = destBalanceInfo.data.available + line.quantity;
            // Create IN movement
            const inMovementRef = db.collection('stockMovements').doc();
            transaction.set(inMovementRef, {
                movementId: inMovementRef.id,
                movementType: domain_1.MovementType.TRANSFER,
                direction: domain_1.MovementDirection.IN,
                warehouseId: parsed.destinationWarehouseId,
                itemId: line.itemId,
                quantity: line.quantity,
                previousBalance: destPrevOnHand,
                newBalance: destNewOnHand,
                referenceType: 'TRANSFER',
                referenceId: transferRef.id,
                referenceNumber: parsed.transferNumber,
                createdBy: userProfile.uid,
                createdAt: firestore_1.FieldValue.serverTimestamp(),
                correlationId: parsed.idempotencyKey,
                operationId: parsed.idempotencyKey,
            });
            movementIds.push(inMovementRef.id);
            // Update Dest Balance
            transaction.set(destBalanceInfo.ref, {
                ...destBalanceInfo.data,
                onHand: destNewOnHand,
                available: destNewAvailable,
                lastMovementId: inMovementRef.id,
                lastUpdatedAt: firestore_1.FieldValue.serverTimestamp(),
            });
        }
        transaction.set(transferRef, {
            transferId: transferRef.id,
            transferNumber: parsed.transferNumber,
            sourceWarehouseId: parsed.sourceWarehouseId,
            destinationWarehouseId: parsed.destinationWarehouseId,
            status: 'RECEIVED',
            createdBy: userProfile.uid,
            createdAt: firestore_1.FieldValue.serverTimestamp(),
            updatedAt: firestore_1.FieldValue.serverTimestamp(),
            operationId: parsed.idempotencyKey,
        });
        await (0, audit_1.writeAuditLog)(transaction, {
            action: 'TRANSFER_POSTED',
            actorId: userProfile.uid,
            entityId: transferRef.id,
            entityType: 'TRANSFER',
        });
        emitBusinessEvent(transaction, 'TRANSFER_POSTED', 'TRANSFER', transferRef.id, parsed.idempotencyKey, {});
        return { success: true, transferId: transferRef.id, movementIds };
    });
});
//# sourceMappingURL=stockEngine.js.map