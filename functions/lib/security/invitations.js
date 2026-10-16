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
exports.revokeInvitation = exports.createInvitation = void 0;
const firestore_1 = require("firebase-admin/firestore");
const functionsV2 = __importStar(require("firebase-functions/v2"));
const domain_1 = require("@calm-wms/domain");
const authorization_1 = require("./authorization");
const permissions_1 = require("@calm-wms/permissions");
const audit_1 = require("./audit");
const db = (0, firestore_1.getFirestore)();
exports.createInvitation = functionsV2.https.onCall(async (request) => {
    if (!request.auth)
        throw new functionsV2.https.HttpsError("unauthenticated", "Unauthenticated");
    const callerId = request.auth.uid;
    const callerSnap = await db.collection("users").doc(callerId).get();
    const callerProfile = callerSnap.data();
    if (!(await (0, authorization_1.assertPermission)(callerProfile, permissions_1.Permissions.USERS_MANAGE_INVITATIONS, db))) {
        throw new functionsV2.https.HttpsError("permission-denied", "Missing USERS_MANAGE_INVITATIONS");
    }
    const { email, employeeCode, phoneNumber, expectedDepartmentId, expectedJobTitle, requestedRoleIds, accountType, expiresInDays = 7, } = request.data;
    if (!email)
        throw new functionsV2.https.HttpsError("invalid-argument", "Email is required");
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiresInDays);
    const invitationRef = db.collection("invitations").doc();
    const invitation = {
        invitationId: invitationRef.id,
        email,
        employeeCode,
        phoneNumber,
        expectedDepartmentId,
        expectedJobTitle,
        requestedRoleIds: requestedRoleIds || [],
        accountType: accountType || domain_1.AccountType.INTERNAL_EMPLOYEE,
        invitedBy: callerId,
        createdAt: firestore_1.Timestamp.now(),
        expiresAt: firestore_1.Timestamp.fromDate(expiresAt),
        status: "PENDING",
    };
    await invitationRef.set(invitation);
    await (0, audit_1.writeSecurityLog)(db, {
        actorId: callerId,
        action: "INVITATION_CREATED",
        entityType: "INVITATION",
        entityId: invitation.invitationId,
        reason: `Invited ${email}`,
    });
    return { success: true, invitationId: invitation.invitationId };
});
exports.revokeInvitation = functionsV2.https.onCall(async (request) => {
    if (!request.auth)
        throw new functionsV2.https.HttpsError("unauthenticated", "Unauthenticated");
    const callerId = request.auth.uid;
    const invitationId = request.data.invitationId;
    const callerSnap = await db.collection("users").doc(callerId).get();
    if (!(await (0, authorization_1.assertPermission)(callerSnap.data(), permissions_1.Permissions.USERS_MANAGE_INVITATIONS, db))) {
        throw new functionsV2.https.HttpsError("permission-denied", "Missing USERS_MANAGE_INVITATIONS");
    }
    const invRef = db.collection("invitations").doc(invitationId);
    await db.runTransaction(async (t) => {
        const doc = await t.get(invRef);
        if (!doc.exists)
            throw new functionsV2.https.HttpsError("not-found", "Invitation not found");
        if (doc.data()?.status !== "PENDING")
            throw new functionsV2.https.HttpsError("failed-precondition", "Cannot revoke non-pending invitation");
        t.update(invRef, { status: "REVOKED" });
    });
    await (0, audit_1.writeSecurityLog)(db, {
        actorId: callerId,
        action: "INVITATION_REVOKED",
        entityType: "INVITATION",
        entityId: invitationId,
        reason: `Revoked by ${callerId}`,
    });
    return { success: true };
});
//# sourceMappingURL=invitations.js.map