# SECURITY TEST MATRIX

This matrix outlines the primary security authorization cases tested in The Calm WMS Phase 4 via Firestore Emulators and Backend Authorization integration tests.

| Scenario | Role / Account Status | Permission / Scope | Expected Result | Test Location |
| :--- | :--- | :--- | :--- | :--- |
| **Unauthenticated read** | NONE | Read `users` | Denied | `security.rules.test.ts` |
| **Unauthenticated write** | NONE | Write `stockBalances` | Denied | `security.rules.test.ts` |
| **Read own profile** | ACTIVE (Any) | Read `users/{ownId}` | Allowed | `security.rules.test.ts` |
| **Read other profile** | ACTIVE (Any) | Read `users/{otherId}` | Denied | `security.rules.test.ts` |
| **Write own profile** | ACTIVE (Any) | Write `users/{ownId}` | Denied (Functions only) | `security.rules.test.ts` |
| **Read stock balances** | ACTIVE (Any) | Read `stockBalances` | Allowed | `security.rules.test.ts` |
| **Write stock balances** | ACTIVE (Any) | Write `stockBalances` | Denied (Functions only) | `security.rules.test.ts` |
| **Read audit logs** | ACTIVE (Any) | Read `auditLogs` | Denied (Functions only) | `security.rules.test.ts` |
| **Read delegations** | ACTIVE (Manager) | Read `delegations` (Delegator) | Allowed | `security.rules.test.ts` |
| **Modify delegations** | ACTIVE (Manager) | Write `delegations` | Denied (Functions only) | `security.rules.test.ts` |
| **Immediate block** | PENDING | `inventory:view` | Denied | `authorization.test.ts` |
| **Immediate block** | BLOCKED | `inventory:view` | Denied | `authorization.test.ts` |
| **Super Admin bypass** | ACTIVE (Super Admin) | `inventory:view` | Allowed | `authorization.test.ts` |
| **Base Role Match** | ACTIVE (Any) | Role includes permission | Allowed | `authorization.test.ts` |
| **Base Role Miss** | ACTIVE (Any) | Role excludes permission | Denied | `authorization.test.ts` |
| **Active Delegation** | ACTIVE (Any) | Delegatee has active auth | Allowed | `authorization.test.ts` |
| **Expired Delegation** | ACTIVE (Any) | Delegatee past endDate | Denied | `authorization.test.ts` |
| **Cross-warehouse Scope**| ACTIVE (Any) | Context warehouse mismatch | Denied | `authorization.test.ts` |
| **Sign-in blocked account**| BLOCKED | Sign-in Auth trigger | Denied | `triggers.ts` |
| **Sign-in pending acc** | PENDING | Sign-in Auth trigger | Allowed (Restricted Claims) | `triggers.ts` |
