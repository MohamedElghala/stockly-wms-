"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireRecentMfa = exports.RiskLevel = void 0;
const firestore_1 = require("firebase-admin/firestore");
var RiskLevel;
(function (RiskLevel) {
    RiskLevel["LOW_RISK"] = "LOW_RISK";
    RiskLevel["MEDIUM_RISK"] = "MEDIUM_RISK";
    RiskLevel["HIGH_RISK"] = "HIGH_RISK";
    RiskLevel["CRITICAL_RISK"] = "CRITICAL_RISK";
})(RiskLevel || (exports.RiskLevel = RiskLevel = {}));
const MFA_VALIDITY_MS = {
    [RiskLevel.LOW_RISK]: 24 * 60 * 60 * 1000,
    [RiskLevel.MEDIUM_RISK]: 4 * 60 * 60 * 1000,
    [RiskLevel.HIGH_RISK]: 15 * 60 * 1000,
    [RiskLevel.CRITICAL_RISK]: 5 * 60 * 1000,
};
const requireRecentMfa = (lastMfaVerifiedAt, riskLevel) => {
    if (!lastMfaVerifiedAt) {
        return false;
    }
    const now = firestore_1.Timestamp.now().toMillis();
    const verifiedAt = lastMfaVerifiedAt.toMillis();
    const validityPeriod = MFA_VALIDITY_MS[riskLevel];
    return now - verifiedAt <= validityPeriod;
};
exports.requireRecentMfa = requireRecentMfa;
//# sourceMappingURL=mfa.js.map