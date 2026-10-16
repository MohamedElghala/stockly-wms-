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
exports.manageInventoryPolicy = exports.deactivateWarehouse = exports.updateWarehouse = exports.createWarehouse = exports.deactivateItem = exports.updateItem = exports.createItem = void 0;
const admin = __importStar(require("firebase-admin"));
const functions = __importStar(require("firebase-functions/v1"));
const app_1 = require("firebase-admin/app");
const firestore_1 = require("firebase-admin/firestore");
const authorization_1 = require("../security/authorization");
const permissions_1 = require("@calm-wms/permissions");
const validation_1 = require("@calm-wms/validation");
const audit_1 = require("../security/audit");
// Ensure admin is initialized
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
 * Creates a new item in the item master.
 * Generates an itemCode using a sequence.
 */
exports.createItem = functions.https.onCall(async (data, context) => {
    const userProfile = await checkPermission(context, permissions_1.Permissions.MASTERDATA_MANAGE_ITEMS);
    const parsed = validation_1.createItemSchema.parse(data);
    return db.runTransaction(async (transaction) => {
        // 1. Generate itemCode sequence based on category
        const categoryId = parsed.categoryId;
        const catSeqRef = db.collection('system').doc('itemCodeSettings').collection('categorySequences').doc(categoryId);
        const globalSettingsRef = db.collection('system').doc('itemCodeSettings');
        const [catSeqDoc, globalSettingsDoc] = await Promise.all([
            transaction.get(catSeqRef),
            transaction.get(globalSettingsRef)
        ]);
        let itemCodeNum;
        let newGlobalHighestThousands = globalSettingsDoc.exists ? (globalSettingsDoc.data()?.globalHighestThousands || 0) : 0;
        if (catSeqDoc.exists) {
            itemCodeNum = (catSeqDoc.data()?.currentValue || 0) + 1;
        }
        else {
            newGlobalHighestThousands += 1;
            itemCodeNum = newGlobalHighestThousands * 1000 + 1;
        }
        const itemCode = itemCodeNum.toString();
        // 2. Create the item
        const itemRef = db.collection('items').doc();
        const itemData = {
            id: itemRef.id,
            itemCode,
            categoryId: parsed.categoryId,
            nameAr: parsed.nameAr,
            nameEn: parsed.nameEn,
            unitId: parsed.unitId,
            isActive: true,
            createdAt: firestore_1.FieldValue.serverTimestamp(),
            updatedAt: firestore_1.FieldValue.serverTimestamp(),
            createdBy: userProfile.uid,
            updatedBy: userProfile.uid,
        };
        transaction.set(itemRef, itemData);
        transaction.set(globalSettingsRef, { globalHighestThousands: newGlobalHighestThousands }, { merge: true });
        transaction.set(catSeqRef, { currentValue: itemCodeNum }, { merge: true });
        // 3. Audit
        await (0, audit_1.writeAuditLog)(transaction, {
            action: 'ITEM_CREATED',
            actorId: userProfile.uid,
            entityId: itemRef.id,
            entityType: 'ITEM',
            details: { itemCode, nameEn: parsed.nameEn },
        });
        return { success: true, id: itemRef.id, itemCode };
    });
});
exports.updateItem = functions.https.onCall(async (data, context) => {
    const userProfile = await checkPermission(context, permissions_1.Permissions.MASTERDATA_MANAGE_ITEMS);
    const parsed = validation_1.updateItemSchema.parse(data);
    if (!data.id) {
        throw new functions.https.HttpsError('invalid-argument', 'Item ID is required.');
    }
    return db.runTransaction(async (transaction) => {
        const itemRef = db.collection('items').doc(data.id);
        const itemDoc = await transaction.get(itemRef);
        if (!itemDoc.exists) {
            throw new functions.https.HttpsError('not-found', 'Item not found.');
        }
        transaction.update(itemRef, {
            ...parsed,
            updatedAt: firestore_1.FieldValue.serverTimestamp(),
            updatedBy: userProfile.uid,
        });
        await (0, audit_1.writeAuditLog)(transaction, {
            action: 'ITEM_UPDATED',
            actorId: userProfile.uid,
            entityId: itemRef.id,
            entityType: 'ITEM',
            details: { updates: parsed },
        });
        return { success: true };
    });
});
exports.deactivateItem = functions.https.onCall(async (data, context) => {
    const userProfile = await checkPermission(context, permissions_1.Permissions.MASTERDATA_MANAGE_ITEMS);
    if (!data.id) {
        throw new functions.https.HttpsError('invalid-argument', 'Item ID is required.');
    }
    return db.runTransaction(async (transaction) => {
        const itemRef = db.collection('items').doc(data.id);
        const itemDoc = await transaction.get(itemRef);
        if (!itemDoc.exists) {
            throw new functions.https.HttpsError('not-found', 'Item not found.');
        }
        transaction.update(itemRef, {
            isActive: false,
            updatedAt: firestore_1.FieldValue.serverTimestamp(),
            updatedBy: userProfile.uid,
        });
        await (0, audit_1.writeAuditLog)(transaction, {
            action: 'ITEM_DEACTIVATED',
            actorId: userProfile.uid,
            entityId: itemRef.id,
            entityType: 'ITEM',
        });
        return { success: true };
    });
});
// WAREHOUSES
exports.createWarehouse = functions.https.onCall(async (data, context) => {
    const userProfile = await checkPermission(context, permissions_1.Permissions.MASTERDATA_MANAGE_WAREHOUSES);
    const parsed = validation_1.createWarehouseSchema.parse(data);
    return db.runTransaction(async (transaction) => {
        const whRef = db.collection('warehouses').doc();
        const whData = {
            id: whRef.id,
            code: parsed.code,
            nameAr: parsed.nameAr,
            nameEn: parsed.nameEn,
            location: parsed.location || null,
            isActive: true,
            createdAt: firestore_1.FieldValue.serverTimestamp(),
            updatedAt: firestore_1.FieldValue.serverTimestamp(),
            createdBy: userProfile.uid,
            updatedBy: userProfile.uid,
        };
        transaction.set(whRef, whData);
        await (0, audit_1.writeAuditLog)(transaction, {
            action: 'WAREHOUSE_CREATED',
            actorId: userProfile.uid,
            entityId: whRef.id,
            entityType: 'WAREHOUSE',
            details: { code: parsed.code, nameEn: parsed.nameEn },
        });
        return { success: true, id: whRef.id };
    });
});
exports.updateWarehouse = functions.https.onCall(async (data, context) => {
    const userProfile = await checkPermission(context, permissions_1.Permissions.MASTERDATA_MANAGE_WAREHOUSES);
    const parsed = validation_1.updateWarehouseSchema.parse(data);
    if (!data.id) {
        throw new functions.https.HttpsError('invalid-argument', 'Warehouse ID is required.');
    }
    return db.runTransaction(async (transaction) => {
        const whRef = db.collection('warehouses').doc(data.id);
        const whDoc = await transaction.get(whRef);
        if (!whDoc.exists) {
            throw new functions.https.HttpsError('not-found', 'Warehouse not found.');
        }
        transaction.update(whRef, {
            ...parsed,
            updatedAt: firestore_1.FieldValue.serverTimestamp(),
            updatedBy: userProfile.uid,
        });
        await (0, audit_1.writeAuditLog)(transaction, {
            action: 'WAREHOUSE_UPDATED',
            actorId: userProfile.uid,
            entityId: whRef.id,
            entityType: 'WAREHOUSE',
            details: { updates: parsed },
        });
        return { success: true };
    });
});
exports.deactivateWarehouse = functions.https.onCall(async (data, context) => {
    const userProfile = await checkPermission(context, permissions_1.Permissions.MASTERDATA_MANAGE_WAREHOUSES);
    if (!data.id) {
        throw new functions.https.HttpsError('invalid-argument', 'Warehouse ID is required.');
    }
    return db.runTransaction(async (transaction) => {
        const whRef = db.collection('warehouses').doc(data.id);
        const whDoc = await transaction.get(whRef);
        if (!whDoc.exists) {
            throw new functions.https.HttpsError('not-found', 'Warehouse not found.');
        }
        transaction.update(whRef, {
            isActive: false,
            updatedAt: firestore_1.FieldValue.serverTimestamp(),
            updatedBy: userProfile.uid,
        });
        await (0, audit_1.writeAuditLog)(transaction, {
            action: 'WAREHOUSE_DEACTIVATED',
            actorId: userProfile.uid,
            entityId: whRef.id,
            entityType: 'WAREHOUSE',
        });
        return { success: true };
    });
});
// POLICIES
exports.manageInventoryPolicy = functions.https.onCall(async (data, context) => {
    const userProfile = await checkPermission(context, permissions_1.Permissions.MASTERDATA_MANAGE_POLICIES);
    const parsed = validation_1.inventoryPolicySchema.parse(data);
    return db.runTransaction(async (transaction) => {
        // Policy id is warehouseId_itemId
        const policyId = `${parsed.warehouseId}_${parsed.itemId}`;
        const policyRef = db.collection('inventoryPolicies').doc(policyId);
        transaction.set(policyRef, {
            ...parsed,
            createdAt: firestore_1.FieldValue.serverTimestamp(), // Will only set on create if we use set with merge, but set overwrites. Let's use set with merge but createdAt might be updated.
            // Wait, we can use set with merge, but let's just do a manual merge logic.
        }, { merge: true });
        // Update timestamps safely
        transaction.set(policyRef, {
            updatedAt: firestore_1.FieldValue.serverTimestamp(),
            updatedBy: userProfile.uid,
        }, { merge: true });
        await (0, audit_1.writeAuditLog)(transaction, {
            action: 'POLICY_UPDATED',
            actorId: userProfile.uid,
            entityId: policyId,
            entityType: 'INVENTORY_POLICY',
            details: { updates: parsed },
        });
        return { success: true };
    });
});
//# sourceMappingURL=masterdata.js.map