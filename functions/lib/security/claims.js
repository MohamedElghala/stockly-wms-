"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.revokeTokens = exports.setCustomClaims = void 0;
const auth_1 = require("firebase-admin/auth");
const setCustomClaims = async (uid, claims) => {
    await (0, auth_1.getAuth)().setCustomUserClaims(uid, claims);
};
exports.setCustomClaims = setCustomClaims;
const revokeTokens = async (uid) => {
    await (0, auth_1.getAuth)().revokeRefreshTokens(uid);
};
exports.revokeTokens = revokeTokens;
//# sourceMappingURL=claims.js.map