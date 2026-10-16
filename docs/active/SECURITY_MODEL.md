# THE CALM WMS - SECURITY MODEL

This document defines the "Defense in Depth" strategy for the WMS. Security is explicitly NOT reliant on the frontend UI.

## 1. Identity & Account Status
- **Provider:** Firebase Authentication.
- **Account Status Model:** Replaced `isActive` boolean with explicit statuses in the `users` collection: `PENDING`, `ACTIVE`, `BLOCKED`, `SUSPENDED`, `DISABLED`.
- **Synchronization:** A Cloud Function synchronizes this explicitly with Firebase Authentication (disabling the user token entirely if BLOCKED/DISABLED). Security-critical account blocking does not rely solely on a Firestore check.

## 2. Authorization Layer (Custom Claims & Backend Validation)
- **Custom Claims:** Store only `roleIds`, `isSuperAdmin`, and `permissionVersion` to avoid token bloat.
- **Backend Authorization is Mandatory:** Sensitive operations never trust frontend role information. Cloud Functions calculate effective permissions at runtime by evaluating: Base Roles + Active Delegations + Account Status.

## 3. Database Layer (Firestore Security Rules)
Direct access to Firestore from clients is strictly governed.
- Clients can never write to `stockBalances`, `stockMovements`, or `auditLogs`.

## 4. Ledger Immutability (Backend Enforcement)
Because the Node.js Server/Admin SDK bypasses Firestore Security Rules, the Backend code must enforce ledger immutability.
- No Cloud Functions will be created that expose arbitrary update/delete operations for `stockMovements`.
- The ONLY valid stock-changing operations must create NEW ledger entries.

## 5. Stock Transaction Idempotency
To prevent accidental double-execution (e.g., clicking Issue twice):
- All stock-changing operations require an `idempotencyKey` (or `operationId`).
- The Cloud Function Transaction checks if this key already exists in a dedicated `idempotencyKeys` collection (or embedded in the ledger).
- Duplicate requests will not issue, receive, scrap, or transfer stock twice.

## 6. Audit Logging
Every sensitive mutation writes an entry to `auditLogs` in the same transaction.
Audit actions have been vastly expanded to cover the full business history (e.g., `RECEIPT_POSTED`, `EMERGENCY_ISSUE`, `DELEGATION_CREATED`, `USER_BLOCKED`).
