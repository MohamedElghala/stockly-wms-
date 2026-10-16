# Legacy Data Source Audit

This document catalogs the historical data sources discovered across the legacy workspace to inform the future Phase 7 Data Migration.

| Source | Owner | Format | Data Type | Estimated Record Count | Business Importance | Migration Required | Migration Risk |
|--------|-------|--------|-----------|------------------------|---------------------|--------------------|----------------|
| `The_Calm_WMS_V2.1.xlsx` | Business Admin | XLSX | Master Data, Balances, History | Moderate (2.2 MB) | CRITICAL | Yes | HIGH (Requires cleansing) |
| `Code.gs` Sheets Backend | Business Admin | Google Sheets | Live Data (Transactions) | High | CRITICAL | Yes | HIGH (Format translation) |
| Firebase (Web/Flutter) | Dev Team | Firestore JSON/Export | Draft UI states, old test data | Unknown | LOW | No | LOW |
| PHP SQLite/MySQL | Dev Team | SQL | Old test data | Unknown | LOW | No | LOW |

## Data Migration Implications
- The primary source of truth for production migration will be the `The_Calm_WMS_V2.1.xlsx` and its associated live Google Sheets.
- The data models in the legacy Firebase and PHP projects are likely experimental and should be discarded in favor of the clean Phase 5 Stock Engine and Phase 2 Data Model in `wms-monorepo`.
- **Action**: Phase 7 must include a robust ETL (Extract, Transform, Load) script to parse the XLSX/Google Sheets, validate rules (e.g., categories exist, quantities > 0), and insert them using the new `stockEngine` idempotency keys.
