# AI_HANDOVER

## 1. Project Overview
This project is **The Calm WMS**, a Next-generation Warehouse Management System.
- **Tech Stack:** Next.js (App Router), React, TypeScript, and Firebase Emulator Suite (Auth, Firestore, Cloud Functions, Storage).
- **Core Features:** Management of Items, Categories, Additions, Disbursements, Scrap, Material Requests, and Stock Balances.
- **Environment:** Entirely local-first development using Firebase Emulators. 

## 2. System Architecture Rules (LOCKED)
**CRITICAL INSTRUCTION FOR NEXT AGENT:** The backend Cloud Functions and the mathematical logic for inventory movement are **strictly locked and mathematically correct**. You must **NOT** alter this core logic. 

**Key Mathematical Rules:**
- **Initial Balance:** Creating an initial balance automatically triggers an `addition` transaction.
- **Additions:** Increases `currentBalance` and `totalIn`.
- **Disbursements:** Decreases `currentBalance` and increases `totalOut`.
- **Scrap:** Decreases `currentBalance` but **does NOT touch `totalOut`**. (Scrap is tracked independently).
- **Material Requests / Reservations:** Reserving items decreases `availableQuantity`. Approving disbursements from requests correctly decrements balances based on the strict rules above.
- **Role-based Access:** Defined securely in `firestore.rules`. Admins, Management, Supervisors, and Users have distinct read/write/approval levels.

## 3. Current State & Completed Tasks
- **Environment Setup:** Firebase Emulator is fully configured and running locally.
- **Auth Fixes:** Fixed the `beforeUserSignedIn` custom claims blocker and frontend registration loop. An admin account is fully active and provisioned (`mohamedalghala@gmail.com` / `password123`).
- **UI Audits:** Removed hardcoded fallback dummy data from `DashboardContent.tsx`. 
- **Forms:** Audited and corrected the UI forms for `AddItem`, `Scrap`, and `Disbursements` to correctly interface with the backend Cloud Functions.
- **Security Rules:** `firestore.rules` are fully secured and restored to strict role-based access.

## 4. Immediate Next Steps
1. **Data Migration:** The user has an Excel file (`The_Calm_WMS_V2.1.xlsx`) containing their master data (Items/Categories/Balances). They will log in using the Admin account and attempt to import this data through the system's UI or scripts. Your first task is to assist in ensuring this data imports seamlessly.
2. **UI & Reporting:** Continue building any missing dashboards, tables, or exportable reports. Ensure that all new UI components read from real Firestore data and never from hardcoded state.
3. **Maintain Rules:** Do not touch the Cloud Functions mathematics. Focus purely on UI/UX, data visualization, and ensuring smooth user workflows.
