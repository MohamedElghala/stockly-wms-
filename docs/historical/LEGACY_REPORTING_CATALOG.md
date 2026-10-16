# Legacy Reporting Catalog

This document extracts reporting requirements from the legacy sources and maps them to the new reporting architecture.

| Report | Legacy Source | Calculation Logic | Data Required | New WMS Equivalent | Priority | Notes |
|--------|---------------|-------------------|---------------|--------------------|----------|-------|
| Stock Status (Live) | Flutter / Web | Direct read of Balances sheet | `stockBalances` | `stockBalances` collection view | HIGH | Implemented as real-time queries in Firestore |
| Shortage Report | Apps Script | Items where Qty < 10 or Qty <= 0 | `stockBalances` | Query: `onHand < inventoryPolicies.minimumStock` | HIGH | The hardcoded `<10` logic will be replaced with dynamic `inventoryPolicies` |
| Top Requested Items | Apps Script | Count of occurrences in Issues | `stockMovements` | Aggregation / Cloud Function metric | MEDIUM | Will require periodic aggregation in Phase 8 (Reporting) |
| Stagnant Stock | Apps Script | Items with 0 issues over X days | `stockMovements`, `stockBalances` | Custom Query | LOW | Needs defined time bounds |
| Transaction Journal | Apps Script / Web | List of additions and disbursements | `stockMovements` | `stockMovements` filtered by type | HIGH | Foundation for full auditability |

## Migration Strategy
- Replace fragile spreadsheet `SUMIF` calculations with robust Firestore queries.
- Shift complex analytical queries (e.g., Top Requested) to specialized Cloud Functions that maintain counter documents, rather than computing on the fly.
