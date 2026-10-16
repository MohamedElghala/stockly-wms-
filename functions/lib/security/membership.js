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
exports.requestMembershipInformation = exports.rejectMembership = exports.approveMembership = void 0;
const firestore_1 = require("firebase-admin/firestore");
const functionsV2 = __importStar(require("firebase-functions/v2"));
const domain_1 = require("@calm-wms/domain");
const audit_1 = require("./audit");
const authorization_1 = require("./authorization");
const permissions_1 = require("@calm-wms/permissions");
const app_1 = require("firebase-admin/app");
if (!(0, app_1.getApps)().length) {
    (0, app_1.initializeApp)();
}
const db = (0, firestore_1.getFirestore)();
exports.approveMembership = functionsV2.https.onCall(async (request) => {
    if (!request.auth) {
        throw new functionsV2.https.HttpsError('unauthenticated', 'User must be authenticated.');
    }
    const callerId = request.auth.uid;
    const targetUserId = request.data.userId;
    const assignedRoles = request.data.roleIds || [];
    const departmentIds = request.data.departmentIds || [];
    const warehouseIds = request.data.warehouseIds || [];
    const reason = request.data.reason || 'Membership approved';
    if (!targetUserId) {
        throw new functionsV2.https.HttpsError('invalid-argument', 'Target user ID is required.');
    }
    if (callerId === targetUserId) {
        throw new functionsV2.https.HttpsError('permission-denied', 'You cannot approve your own membership.');
    }
    const callerProfileSnap = await db.collection('users').doc(callerId).get();
    if (!callerProfileSnap.exists) {
        throw new functionsV2.https.HttpsError('permission-denied', 'Caller profile not found.');
    }
    const callerProfile = callerProfileSnap.data();
    const currentUser = {
        uid: callerId,
        accountStatus: callerProfile.accountStatus,
        roleIds: callerProfile.roleIds,
        permissionVersion: callerProfile.permissionVersion,
        email: callerProfile.email,
        isSuperAdmin: callerProfile.roleIds.includes('SUPER_ADMIN')
    };
    if (callerProfile.accountStatus !== domain_1.AccountStatus.ACTIVE || callerProfile.membershipApprovalStatus !== domain_1.MembershipApprovalStatus.APPROVED) {
        throw new functionsV2.https.HttpsError('permission-denied', 'Caller must be an active, approved member.');
    }
    const canApprove = await (0, authorization_1.assertPermission)(currentUser, permissions_1.Permissions.USERS_APPROVE_MEMBERSHIP, db);
    if (!canApprove) {
        await (0, audit_1.writeSecurityLog)(db, {
            actorId: callerId,
            action: 'APPROVE_MEMBERSHIP_DENIED',
            entityType: 'USER',
            entityId: targetUserId,
            reason: 'Caller lacks USERS_APPROVE_MEMBERSHIP permission',
        });
        throw new functionsV2.https.HttpsError('permission-denied', 'You do not have permission to approve memberships.');
    }
    const privilegedRoles = ['SUPER_ADMIN', 'MANAGEMENT', 'AUDITOR', 'MAINTENANCE_MANAGER'];
    const assigningPrivileged = assignedRoles.some((r) => privilegedRoles.includes(r));
    if (assigningPrivileged) {
        const canAssignPrivileged = await (0, authorization_1.assertPermission)(currentUser, permissions_1.Permissions.USERS_ASSIGN_PRIVILEGED_ROLES, db);
        if (!canAssignPrivileged) {
            throw new functionsV2.https.HttpsError('permission-denied', 'You do not have permission to assign privileged roles.');
        }
    }
    else {
        // If not privileged, must have operational role assignment
        const canAssignOperational = await (0, authorization_1.assertPermission)(currentUser, permissions_1.Permissions.USERS_ASSIGN_OPERATIONAL_ROLES, db);
        if (!canAssignOperational) {
            throw new functionsV2.https.HttpsError('permission-denied', 'You do not have permission to assign operational roles.');
        }
    }
    return await db.runTransaction(async (transaction) => {
        const targetRef = db.collection('users').doc(targetUserId);
        const targetSnap = await transaction.get(targetRef);
        if (!targetSnap.exists) {
            throw new functionsV2.https.HttpsError('not-found', 'Target user profile not found.');
        }
        const targetProfile = targetSnap.data();
        if (targetProfile.membershipApprovalStatus === domain_1.MembershipApprovalStatus.APPROVED) {
            throw new functionsV2.https.HttpsError('failed-precondition', 'Membership is already approved.');
        }
        // Simplified for this exercise: emailVerifiedAt should be set, mfa policy satisfied
        // If MfaPolicy is ENFORCED, it must have been verified.
        if (targetProfile.mfaPolicy === domain_1.MfaPolicy.REQUIRED && !targetProfile.mfaEnabled) {
            throw new functionsV2.https.HttpsError('failed-precondition', 'User has not completed required MFA enrollment.');
        }
        const beforeSnapshot = { ...targetProfile };
        const updateData = {
            membershipApprovalStatus: domain_1.MembershipApprovalStatus.APPROVED,
            accountStatus: domain_1.AccountStatus.ACTIVE,
            roleIds: assignedRoles,
            departmentIds,
            warehouseIds,
            permissionVersion: targetProfile.permissionVersion + 1,
            membershipApprovedAt: firestore_1.Timestamp.now(),
            approvedBy: callerId,
            updatedAt: firestore_1.Timestamp.now(),
        };
        transaction.update(targetRef, updateData);
        const approvalRef = db.collection('membershipApprovals').doc();
        const approvalRecord = {
            approvalId: approvalRef.id,
            userId: targetUserId,
            decision: 'APPROVED',
            decidedBy: callerId,
            decidedAt: firestore_1.Timestamp.now(),
            reason,
            assignedRoleIds: assignedRoles,
            departmentIds,
            warehouseIds,
            accountType: targetProfile.accountType || domain_1.AccountType.INTERNAL_EMPLOYEE,
            registrationSource: targetProfile.registrationSource || domain_1.RegistrationSource.SELF_REGISTRATION,
            beforeSnapshot,
            afterSnapshot: { ...targetProfile, ...updateData },
        };
        transaction.set(approvalRef, approvalRecord);
        return { success: true, message: 'Membership approved.' };
    });
});
exports.rejectMembership = functionsV2.https.onCall(async (request) => {
    if (!request.auth)
        throw new functionsV2.https.HttpsError('unauthenticated', 'Unauthenticated');
    const callerId = request.auth.uid;
    const targetUserId = request.data.userId;
    const reason = request.data.reason;
    if (!targetUserId || !reason)
        throw new functionsV2.https.HttpsError('invalid-argument', 'Missing userId or reason');
    const callerSnap = await db.collection('users').doc(callerId).get();
    const callerProfile = callerSnap.data();
    const currentUser = {
        uid: callerId,
        accountStatus: callerProfile.accountStatus,
        roleIds: callerProfile.roleIds,
        permissionVersion: callerProfile.permissionVersion,
        email: callerProfile.email,
        isSuperAdmin: callerProfile.roleIds.includes('SUPER_ADMIN')
    };
    if (!await (0, authorization_1.assertPermission)(currentUser, permissions_1.Permissions.USERS_REJECT_MEMBERSHIP, db)) {
        throw new functionsV2.https.HttpsError('permission-denied', 'Cannot reject membership');
    }
    await db.runTransaction(async (t) => {
        const targetRef = db.collection('users').doc(targetUserId);
        const targetSnap = await t.get(targetRef);
        if (!targetSnap.exists)
            throw new functionsV2.https.HttpsError('not-found', 'User not found');
        const targetProfile = targetSnap.data();
        const updateData = {
            membershipApprovalStatus: domain_1.MembershipApprovalStatus.REJECTED,
            accountStatus: domain_1.AccountStatus.DISABLED,
            updatedAt: firestore_1.Timestamp.now()
        };
        t.update(targetRef, updateData);
        const approvalRef = db.collection('membershipApprovals').doc();
        t.set(approvalRef, {
            approvalId: approvalRef.id,
            userId: targetUserId,
            decision: 'REJECTED',
            decidedBy: callerId,
            decidedAt: firestore_1.Timestamp.now(),
            reason,
            assignedRoleIds: [],
            accountType: targetProfile.accountType || domain_1.AccountType.INTERNAL_EMPLOYEE,
            registrationSource: targetProfile.registrationSource || domain_1.RegistrationSource.SELF_REGISTRATION,
            beforeSnapshot: targetProfile,
            afterSnapshot: { ...targetProfile, ...updateData }
        });
    });
});
exports.requestMembershipInformation = functionsV2.https.onCall(async (request) => {
    if (!request.auth)
        throw new functionsV2.https.HttpsError('unauthenticated', 'Unauthenticated');
    const callerId = request.auth.uid;
    const targetUserId = request.data.userId;
    const reason = request.data.reason;
    if (!targetUserId || !reason)
        throw new functionsV2.https.HttpsError('invalid-argument', 'Missing userId or reason');
    const callerSnap = await db.collection('users').doc(callerId).get();
    const callerProfile = callerSnap.data();
    const currentUser = {
        uid: callerId,
        accountStatus: callerProfile.accountStatus,
        roleIds: callerProfile.roleIds,
        permissionVersion: callerProfile.permissionVersion,
        email: callerProfile.email,
        isSuperAdmin: callerProfile.roleIds.includes('SUPER_ADMIN')
    };
    if (!await (0, authorization_1.assertPermission)(currentUser, permissions_1.Permissions.USERS_REQUEST_MEMBERSHIP_INFORMATION, db)) {
        throw new functionsV2.https.HttpsError('permission-denied', 'Cannot request info');
    }
    await db.runTransaction(async (t) => {
        const targetRef = db.collection('users').doc(targetUserId);
        const targetSnap = await t.get(targetRef);
        if (!targetSnap.exists)
            throw new functionsV2.https.HttpsError('not-found', 'User not found');
        const targetProfile = targetSnap.data();
        const updateData = {
            membershipApprovalStatus: domain_1.MembershipApprovalStatus.MORE_INFORMATION_REQUIRED,
            updatedAt: firestore_1.Timestamp.now()
        };
        t.update(targetRef, updateData);
        const approvalRef = db.collection('membershipApprovals').doc();
        t.set(approvalRef, {
            approvalId: approvalRef.id,
            userId: targetUserId,
            decision: 'MORE_INFORMATION_REQUIRED',
            decidedBy: callerId,
            decidedAt: firestore_1.Timestamp.now(),
            reason,
            assignedRoleIds: [],
            accountType: targetProfile.accountType || domain_1.AccountType.INTERNAL_EMPLOYEE,
            registrationSource: targetProfile.registrationSource || domain_1.RegistrationSource.SELF_REGISTRATION,
            beforeSnapshot: targetProfile,
            afterSnapshot: { ...targetProfile, ...updateData }
        });
    });
});
//# sourceMappingURL=membership.js.map