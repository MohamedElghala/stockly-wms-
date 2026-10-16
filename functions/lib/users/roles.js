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
exports.deleteUser = exports.updateUserRole = void 0;
const logger = __importStar(require("firebase-functions/logger"));
const https_1 = require("firebase-functions/v2/https");
const firestore_1 = require("firebase-admin/firestore");
const auth_1 = require("firebase-admin/auth");
exports.updateUserRole = (0, https_1.onCall)(async (request) => {
    if (!request.auth || request.auth.token.role !== 'admin') {
        throw new https_1.HttpsError('permission-denied', 'Only admins can update roles.');
    }
    const data = request.data;
    if (!data.uid || !data.newRole) {
        throw new https_1.HttpsError('invalid-argument', 'Missing uid or newRole.');
    }
    const validRoles = ['admin', 'management', 'user', 'pending', 'blocked'];
    if (!validRoles.includes(data.newRole)) {
        throw new https_1.HttpsError('invalid-argument', 'Invalid role provided.');
    }
    const db = (0, firestore_1.getFirestore)();
    const userRef = db.collection('users').doc(data.uid);
    try {
        // 1. Update Firestore
        await userRef.update({
            role: data.newRole,
            updatedAt: Date.now()
        });
        // 2. Update Custom Claims
        await (0, auth_1.getAuth)().setCustomUserClaims(data.uid, {
            role: data.newRole
        });
        // If blocked, optionally revoke refresh tokens to force logout
        if (data.newRole === 'blocked') {
            await (0, auth_1.getAuth)().revokeRefreshTokens(data.uid);
        }
        logger.info(`User ${data.uid} role updated to ${data.newRole} by admin ${request.auth.uid}`);
        return { success: true, message: `تم تحديث صلاحية المستخدم بنجاح` };
    }
    catch (error) {
        logger.error('Error updating user role:', error);
        throw new https_1.HttpsError('internal', error.message || 'Error updating user role');
    }
});
exports.deleteUser = (0, https_1.onCall)(async (request) => {
    if (!request.auth || request.auth.token.role !== 'admin') {
        throw new https_1.HttpsError('permission-denied', 'Only admins can delete users.');
    }
    const data = request.data;
    if (!data.uid) {
        throw new https_1.HttpsError('invalid-argument', 'Missing uid.');
    }
    const db = (0, firestore_1.getFirestore)();
    const userRef = db.collection('users').doc(data.uid);
    try {
        // Delete from Firestore
        await userRef.delete();
        // Delete from Auth
        await (0, auth_1.getAuth)().deleteUser(data.uid);
        logger.info(`User ${data.uid} deleted by admin ${request.auth.uid}`);
        return { success: true, message: 'تم حذف المستخدم نهائياً' };
    }
    catch (error) {
        logger.error('Error deleting user:', error);
        throw new https_1.HttpsError('internal', error.message || 'Error deleting user');
    }
});
//# sourceMappingURL=roles.js.map