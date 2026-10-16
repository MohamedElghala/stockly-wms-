# Legacy Security Review

This document explicitly identifies legacy security mechanisms that are deprecated and MUST NOT be migrated to the new WMS platform.

## Deprecated Mechanisms (DO NOT MIGRATE)

| Risk Area | Legacy Implementation | Reason for Deprecation |
|-----------|-----------------------|------------------------|
| **Password Hashing** | Apps Script: Custom weak SHA-256 implementation without salt. | Vulnerable to rainbow table attacks. |
| **Authentication** | Apps Script: Comparing plaintext/hashes directly in code logic. | Not secure. Hard to manage sessions. |
| **Authorization** | Web/Apps Script: Client-side routing checks / hidden buttons. | Trivial to bypass via browser DevTools. |
| **Database Access** | Apps Script: Direct Google Sheets editing. | Relies heavily on trusting the user not to break formulas or bypass validation. |
| **Data Privacy** | Spreadsheets: Master sheet accessible to scripts running as user. | Difficult to scope permissions strictly at a row/document level. |

## New Security Architecture (Phase 4)
The new WMS (wms-monorepo) has fully replaced these legacy mechanisms with:
1. **Firebase Authentication**: Secure identity management with Google Sign-In and robust password handling.
2. **Multi-Factor Authentication (MFA)**: Mandatory enforcement for all accounts.
3. **Firestore Security Rules**: Server-side enforcement of Row-Level Security (RLS) denying any unauthorized reads/writes regardless of client behavior.
4. **RBAC & Memberships**: Centralized server-side role and scope validation via the `checkPermission` utility.
