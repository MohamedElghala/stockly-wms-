# THE CALM WMS - MIGRATION MAP

This document maps the legacy Google Sheets columns to the final Firestore collections, explicitly defining transformations, data cleaning, and validation rules. Data will NOT be migrated until this mapping is verified by a Migration Script against the production sheet.

> [!NOTE]
> Based on the Legacy Intelligence Audit, the primary source of truth for the Phase 7 ETL Migration is `The_Calm_WMS_V2.1.xlsx`. Legacy implementations in Flutter, PHP, and Web contain outdated data models and will be discarded. All balance calculations (e.g. legacy `SUMIF` formulas) will be discarded in favor of calculating balances dynamically via the `stockEngine` logic during migration.

## 1. Master Data Mapping

### Users & Authentication (Sheet: `المستخدمين`)
**Legacy Password & Identity Strategy:** 
We must NOT assume that `employeeCode` equals a valid email address. We must not invent email addresses silently.
Migration identity resolution must follow:
1. Use verified corporate email if available.
2. Use verified known email from an approved source.
3. Otherwise, create a migration identity record requiring onboarding/invitation.
4. Require secure password reset or identity linking upon first login.
5. Require explicit membership approval before operational access. 
The migration process must NEVER automatically create a privileged corporate identity based only on `employeeCode`.

| Legacy Column | New Firestore Collection | New Field | Transformation Rule | Validation Rule |
|---|---|---|---|---|
| Col A (Code) | `users` | `employeeCode` | Trim, Lowercase | Must be unique, Not empty |
| Col B (Name) | `users` | `name` | Trim | Not empty |
| Col D (Category) | `users` | `departmentId` | Map string to UUID from `departments` | Must map to valid dept |
| Col E (Role) | `users` | `role` | Translate to new RBAC Roles | Valid role enum |

### Items & Stock Balances (Sheet: `الرصيد الحالي`)
| Legacy Column | New Firestore Collection | New Field | Transformation Rule | Validation Rule |
|---|---|---|---|---|
| Col B (Code) | `items` | `itemCode` / `legacyItemCode` | Generate new `ITM-XXXXXX` using `numberSequences`. Save original code to `legacyItemCode`. | `itemCode` is immutable after creation. Historical references preserve legacy identity. |
| Col C (Category) | `items` | `categoryId` | Map string to UUID from `categories` | Must map to valid category |
| Col D (Name) | `items` | `nameAr` | Trim, clean invisible chars | Not empty |
| Col F (Opening) | `stockMovements` | `quantity` | Parse Float, Direction: IN | Create INITIAL_RECEIPT movement |
| Col I (Current) | `stockBalances` | `onHand` | **DO NOT MIGRATE DIRECTLY.** | Must strictly match Ledger Reconciliation. |

## 2. Transactions Mapping

### Receipts, Issues, Scrap (Legacy Sheets)
- Map legacy columns to `receipts`, `issues`, `scrapTransactions` documents and their line subcollections.
- Explicitly set `quantity` as a positive absolute number, and define `direction` (IN/OUT).

## 3. Workflow Mapping

### Requests (Sheets: `الطلبات المعلقة` & `أرشيف الطلبات`)
- Extract IDs, requesters, items, and map to `materialRequests`.
- Map legacy status strings to the explicitly expanded `technicalApprovalStatus`, `finalApprovalStatus`, and `issueStatus` workflow.

## 4. Reconciliation Strategy (Strict Exception Handling)
After generating the `stockMovements` ledger from historical data, the system will calculate the theoretical `onHand` balance and compare it against the legacy Sheet Col I (`Current Stock`).

**If a difference is detected:**
1. **MIGRATION_EXCEPTION:** The discrepancy is flagged as a migration exception.
2. **NO AUTO-ADJUSTMENT:** The system will NOT automatically create an `ADJUSTMENT_IN` or `ADJUSTMENT_OUT`. The discrepancy must be preserved.
3. **Manual Review:** Management must review the exception.
4. **Authorized Reconciliation:** An explicit authorization is required to post a reconciliation adjustment.
5. **Audit Log:** The reconciliation adjustment is logged extensively in the `auditLogs`.
