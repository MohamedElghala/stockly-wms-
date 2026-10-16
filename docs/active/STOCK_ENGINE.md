# THE CALM WMS - STOCK ENGINE

This document outlines the core mathematical and operational engine that governs inventory balances. It relies on an Event Sourcing-inspired Ledger + Projection model.

## 1. Core Concept
The Stock Engine relies on two concepts:
- **Ledger (stockMovements):** The single source of truth. Every time stock changes, an immutable record is appended here.
- **Projection (stockBalances):** A highly optimized, pre-calculated snapshot of the current state, built by aggregating the Ledger.

## 2. Ledger Immutability
The `stockMovements` ledger must remain mathematically pure.
- **Frontend / Client Security:** Firestore Security Rules explicitly DENY update and delete operations on the ledger.
- **Backend / Admin Security:** Cloud Functions must NOT expose any arbitrary update/delete APIs for ledger movements. Server-side code must enforce the same immutability boundaries. The only valid way to correct a mistake is to post a new compensating movement (e.g., `ADJUSTMENT_IN`).

## 3. Directional Movement Semantics
To prevent sign-related calculation errors, `quantity` is strictly stored as a positive absolute number. The mathematical operation is defined by the `direction` and `movementType`.

| Type | Direction | Affects `onHand` | Description |
|---|---|---|---|
| **RECEIPT** | IN | `+` | Inbound stock from supplier. |
| **ISSUE** | OUT | `-` | Outbound stock for maintenance. |
| **SCRAP** | OUT | `-` | Damaged or expired stock removed. |
| **TRANSFER** | IN | `+` | Stock arriving from another internal warehouse. |
| **TRANSFER** | OUT | `-` | Stock leaving for another internal warehouse. |
| **ADJUSTMENT** | IN | `+` | Positive correction after physical counting/inventory audit. |
| **ADJUSTMENT** | OUT | `-` | Negative correction after physical counting/inventory audit. |

## 4. Idempotency (Duplicate Prevention)
To prevent network retries or double-clicks from corrupting inventory:
- Every stock-changing request must include an `idempotencyKey` (or `operationId`).
- The Cloud Function transaction must check if this key was already processed.
- If processed, it silently returns the existing result without issuing stock twice, receiving stock twice, or duplicating ledger movements.

## 5. Mathematical Formula for Derived Availability
```text
Available = On Hand - Reserved
```
- **On Hand:** The physical count in the warehouse. Computed by aggregating Ledger IN/OUT directions.
- **Reserved:** Quantity allocated to requests that have received Final Approval but have not yet been physically ISSUED.
- **Available:** A purely derived projection. It is NEVER directly modified by a user request. It is updated atomically alongside `onHand` and `reserved`.
