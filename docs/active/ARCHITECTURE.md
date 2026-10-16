# THE CALM WMS - ARCHITECTURE PLAN

## 1. High-Level Architecture
النظام الجديد يعتمد على معمارية (Serverless) مبنية على Firebase ومفصولة تماماً بين طبقة العرض (UI) وطبقة البيانات (Data Layer).

### 1.1 Backend & Database (Firebase)
> [!WARNING]
> The legacy architectures (`TheCalm_Firebase_WMS` Flutter app, `TheCalm_PHP`, and Google Apps Script) have been audited and explicitly deprecated. Their design patterns (client-side security, Google Sheets DB) MUST NOT be replicated.

- **Cloud Firestore:** Primary operational database.
- **Firebase Auth:** Identity, authentication, and SSO (Google Workspace).
- **Cloud Functions:** Sensitive business logic, transactional operations, and Notification Dispatch.
- **Firestore Security Rules:** Database-level security.

### 1.2 Frontend (Web & Mobile)
- **Web:** Next.js (App Router) deployed via Firebase App Hosting.
- **Mobile:** Expo & React Native.

## 2. Monorepo Structure
We explicitly adopt a Monorepo architecture using **pnpm + Turborepo**.

```
apps/
  web/       
  mobile/    
functions/   (Backend logic, Notification Engine, Auth webhooks)
packages/
  domain/       
  validation/   
  permissions/  
  config/       
  firebase/     
  notifications/(Abstract notification templates and routing rules)
docs/
legacy/
```

## 3. Core Engines
The backend relies on three isolated engines:
1. **Stock Engine:** Handles Ledger immutability, Atomicity, and Idempotency.
2. **Notification Engine:** Listens to business events asynchronously via Cloud Functions (Eventarc/PubSub) and routes them to abstract Providers (FCM Push, Email Provider, WhatsApp Provider).
3. **Alert Engine (Cron):** Scheduled Cloud Functions that check Low Stock rules, expired approvals, and dispatch alerts to the Notification Engine.

## 4. Google Sheets Integration Boundary
`Firestore -> Export Service (Cloud Function) -> Google Sheets`
