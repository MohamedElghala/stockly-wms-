# Legacy Business Rules

This document extracts and catalogs all useful business rules discovered in the legacy codebase (Apps Script, Web, PHP, Flutter) and categorizes their migration strategy.

## Authentication & Onboarding
* **Email Restriction**: `if (codeStr.includes("@") && !codeStr.endsWith("@thecalmeg.com"))` -> Users must use `@thecalmeg.com` emails or employee codes.
  * **Classification**: `MODIFY`
  * **New WMS**: Phase 4 Membership Approval handles this securely via Google Auth + verified domains.

## Item Coding
* **Sequence Logic**: Max code within category + 1, else round overall max up to next 1000 + 1. (e.g. `1001`, `2001`).
  * **Classification**: `REPLACE`
  * **New WMS**: Use robust `ITM-XXXXX` alphanumeric sequence.

## Stock Valuation & Balances
* **Balance Formula**: `=SUMIF(Receipts) - SUMIF(Issues)`. Stock is derived from ledger additions and subtractions.
  * **Classification**: `PRESERVE` (Conceptually)
  * **New WMS**: Handled correctly via the `stockEngine` transactions preserving immutability.
* **Negative Stock Display**: Showing true negative stock before scrap deduction is important for audits.
  * **Classification**: `PRESERVE`
  * **New WMS**: Addressed by the `allowNegativeStock` inventory policy.

## Requests & Workflows
* **Request ID Generation**: `REQ-` prefix with an auto-incrementing integer (max across Pending and Archive sheets).
  * **Classification**: `MODIFY`
  * **New WMS**: Use Firestore sequence counters for collision-proof ID generation.

## Request Lifecycle
* **Legacy Flow**: Submit -> Pending Sheet -> Approve -> Move to Archive Sheet.
  * **Classification**: `REPLACE`
  * **New WMS**: Implement a proper state machine: `DRAFT -> SUBMITTED -> TECH_APPROVED -> FINAL_APPROVED -> ISSUED -> CLOSED`.

## Exceptions
* **Emergency Issues**: Needs to bypass normal request queue for urgent operational needs.
  * **Classification**: `PRESERVE`
  * **New WMS**: Implemented via explicit `emergencyIssue` backend transaction with audit logging.
