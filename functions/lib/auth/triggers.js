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
exports.beforeUserSignedIn = exports.beforeUserCreated = void 0;
const firestore_1 = require("firebase-admin/firestore");
const admin = __importStar(require("firebase-admin"));
const functionsV2 = __importStar(require("firebase-functions/v2"));
const logger = __importStar(require("firebase-functions/logger"));
admin.initializeApp();
const db = (0, firestore_1.getFirestore)();
exports.beforeUserCreated = functionsV2.identity.beforeUserCreated(async (event) => {
    const user = event.data;
    if (!user || !user.email) {
        throw new functionsV2.identity.HttpsError('invalid-argument', 'Email is required');
    }
    const emailLower = user.email.toLowerCase();
    if (!emailLower.endsWith('@thecalmeg.com') && !emailLower.endsWith('@gmail.com')) {
        throw new functionsV2.identity.HttpsError('invalid-argument', 'Only @thecalmeg.com or @gmail.com emails are allowed.');
    }
    let initialRole = 'pending';
    if (emailLower === 'mohamedalghala@gmail.com') {
        initialRole = 'admin';
    }
    return {
        customClaims: {
            role: initialRole
        }
    };
});
exports.beforeUserSignedIn = functionsV2.identity.beforeUserSignedIn(async (event) => {
    const user = event.data;
    if (!user) {
        throw new functionsV2.identity.HttpsError('unauthenticated', 'User is missing');
    }
    const uid = user.uid;
    const profileRef = db.collection('users').doc(uid);
    const profileSnap = await profileRef.get();
    if (!profileSnap.exists) {
        logger.warn(`User profile missing for uid: ${uid}`);
        return {
            customClaims: {
                role: 'pending'
            }
        };
    }
    const profile = profileSnap.data();
    const role = profile?.role || 'pending';
    if (role === 'blocked') {
        throw new functionsV2.identity.HttpsError('permission-denied', 'Account is blocked');
    }
    // To support legacy code temporarily if needed:
    const roleIds = role === 'admin' ? ['WAREHOUSE_MANAGER'] : role === 'management' ? ['MANAGEMENT'] : role === 'user' ? ['USER'] : [];
    return {
        customClaims: {
            role: role,
            roleIds: roleIds
        }
    };
});
//# sourceMappingURL=triggers.js.map