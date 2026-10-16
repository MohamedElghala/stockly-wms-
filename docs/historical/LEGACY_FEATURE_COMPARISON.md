# Legacy Feature Comparison

This document compares the implementation of key business features across the various legacy sources found in the `The_Calm_WMS_V2.1` workspace.

| Feature | Legacy Source | Implementation Status | Business Rule | New WMS Mapping | Keep / Extract / Ignore | Notes |
|---------|---------------|-----------------------|---------------|-----------------|-------------------------|-------|
| User Registration | Apps Script | Hardcoded to `@thecalmeg.com` | Internal emails only | Membership Approval Workflow | Extract | Reimplemented in Phase 4 |
| Authentication | Apps Script | Plaintext/Weak SHA-256 Hash | Basic code + hash match | Firebase Auth + MFA | Replace | New WMS uses secure token-based identity |
| Item Coding | Apps Script | Auto-increment numeric codes | Find max, +1 or next 1000 | ITM-XXXXX string sequence | Replace | New WMS uses robust transaction-safe sequences |
| Stock Validation | Apps Script | Formula-based `SUMIF` | Qty <= Available | `stockEngine` transactions | Replace | New WMS calculates true available balance |
| Material Requests | Apps Script | Written to 'Pending' Sheet | REQ-XXX sequence | `materialRequests` collection | Extract | New WMS has formalized states (Pending, Approved) |
| Department Filtering | Flutter / Web | Dropdown filters | Visual only | Scoped by User Roles | Extract | New WMS uses `departmentId` security rules |
| Emergency Issues | Apps Script (Assumed) | Bypasses normal flow | Unclear / direct sheet edit | `emergencyIssue` operation | Replace | New WMS handles exceptions formally with audit |
| Reports | Apps Script / Web | Computed directly | Shortage, Stagnant, Overstock | Firestore Aggregations | Extract | Reimplemented via `businessEvents` or Cloud Functions |

## Analysis
- **Google Apps Script**: Contains the original core logic using Google Sheets as a database. Highly fragile but contains the exact business terminology.
- **Legacy Web**: Appears to be an early attempt to migrate to Firebase.
- **Legacy PHP**: Contains seeding scripts and static assets, possibly an intermediate migration attempt.
- **Legacy Flutter**: Contains some mobile UI logic and provider-based state management, showing how users expected to interact with the system on mobile.
