# Business Rules Traceability

This document traces the implementation of business rules within the source code.

## 1. Item Categories (17 allowed categories)
- **Status:** Fully Compliant
- **Trace:** Enforced in schemas and UI dropdowns.

## 2. Inventory Math (Stock Balance)
- **Status:** Fully Compliant
- **Trace:** `stock = openingBalance + totalIn - totalOut`
- **Location:** Inventory engine and material request processing.

## 3. Scrap Handling (الهالك)
- **Status:** Fully Compliant 
- **Trace:** 
  - *Updated Rule:* Scrapping an item **deducts from `stock`** and **adds the amount to `totalScrap`**.
  - *Test Coverage:* Confirmed by unit tests (`scrap does not affect totalOut but reduces stock`).
  - *Location:* `functions/src/inventory/scrap.ts`

## 4. Stock Status Thresholds
- **Status:** Fully Compliant
- **Trace:** 
  - `<= 0` (نفذ الصنف)
  - `< 10` (الصنف ناقص)
  - `>= 10` (آمن)
- **Location:** Handled natively in items synchronization.

## 5. Security & Roles (ADMIN, MANAGEMENT, USER)
- **Status:** Fully Compliant
- **Trace:** Roles are protected rigidly in `firestore.rules`.
  - Admin: Full access.
  - Management: Read-only access globally.
  - User: Read items, full ownership over personal material requests only.
