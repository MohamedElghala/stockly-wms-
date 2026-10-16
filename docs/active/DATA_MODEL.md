# THE CALM WMS - FINAL DATA MODEL (INCL. MFA & NOTIFICATIONS)

## A. Master Data
*(Includes Users, MFA fields, Departments, Roles, Permissions, Categories, Units, Warehouses, Items)*

## B. Inventory Configuration & C. Operational Inventory
*(Includes Inventory Policies, Stock Balances, Stock Movements)*

## D. Documents & E. Workflow
*(Includes Material Requests, Receipts, Issues, Scrap, Transfers, Approvals, Approval Delegations)*

## F. Security and Audit
*(Includes Audit Logs)*

## G. MFA & Security
*(Includes MFA Challenges)*

## H. Notification Engine

### 1. `notificationEvents` (The Event Outbox)
The Outbox pattern ensures transactions succeed even if notifications fail.
- `eventId`: String
- `eventType`: Enum (ISSUE_POSTED, etc.)
- `entityType`: String
- `entityId`: String
- `eventVersion`: Number
- `idempotencyKey`: String
- `status`: Enum (PENDING, PROCESSED, FAILED)
- `createdAt` / `processedAt` / `retryCount` / `lastError`

### 2. `notificationPreferences` (Collection)
- `userId` / `eventPreferences`

### 3. `notificationGroups` (Collection) & `members` (Subcollection)
- **Document:** `groupId` / `name` / `channels` / `externalChannelMetadata` (e.g. `providerConnectionId`)
- **Members Subcollection:** `memberId` / `memberType` / `userId` / `roleId` / `departmentId`

### 4. `notificationDeliveryLog` (Collection)
Provider-aware status tracking.
- `notificationId` / `eventType` / `recipientId` / `channel` / `provider`
- `status`: Enum (PENDING, ACCEPTED, SENT, DELIVERED, FAILED, RETRYING, CANCELLED, UNKNOWN)
- `providerMessageId` / `providerStatus` / `providerResponse` / `failureReason`
- `sentAt` / `deliveredAt` / `failedAt` / `relatedEntityType` / `relatedEntityId`

## I. Inventory Intelligence
*(Includes Active Alerts and Reorder Suggestions)*
