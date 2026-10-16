"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.writeSecurityLog = exports.writeAuditLog = void 0;
const firestore_1 = require("firebase-admin/firestore");
const writeAuditLog = async (dbOrTransaction, entry) => {
    let db;
    if ("collection" in dbOrTransaction) {
        db = dbOrTransaction;
        const logRef = db.collection("auditLogs").doc();
        await logRef.set({
            ...entry,
            timestamp: firestore_1.FieldValue.serverTimestamp(),
        });
    }
    else {
        // In a transaction, there is no generic way to get db. We can just use getFirestore()
        db = (0, firestore_1.getFirestore)();
        const logRef = db.collection("auditLogs").doc();
        dbOrTransaction.set(logRef, {
            ...entry,
            timestamp: firestore_1.FieldValue.serverTimestamp(),
        });
    }
};
exports.writeAuditLog = writeAuditLog;
const writeSecurityLog = async (db, entry) => {
    const logRef = db.collection("securityLogs").doc();
    await logRef.set({
        ...entry,
        timestamp: firestore_1.FieldValue.serverTimestamp(),
    });
};
exports.writeSecurityLog = writeSecurityLog;
//# sourceMappingURL=audit.js.map