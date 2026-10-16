# THE CALM WMS - FINAL ROADMAP STATUS

## Project Philosophy
"Build The Calm WMS 2.0 using the business knowledge accumulated from the legacy systems, while replacing the legacy architecture with a secure, scalable, modern, enterprise-grade platform."

## Development Roadmap & Status

| Phase | Description | Status | UI Implemented? |
|-------|-------------|--------|-----------------|
| **Phase 1-4** | Core Architecture, Domain, Security, Auth, Memberships | ✅ **COMPLETED** | No |
| **Phase 5** | Inventory & Stock Engine | ✅ **COMPLETED** (Emulator Verified) | No |
| **Phase 6** | Material Requests & Approval Workflow Backend | 🔄 **NEXT IN PIPELINE** | No |
| **Phase 7** | Premium Web Application (Next.js) | ⏳ **BLOCKED** | No |
| **Phase 8** | Premium Mobile Application (Expo/React Native) | ⏳ **BLOCKED** | No |
| **Phase 9** | Notification Engine (In-App, Push, Email, WhatsApp) | ⏳ **BLOCKED** | No |
| **Phase 10** | Inventory Intelligence (Alerts, Suggestions, Cooldowns) | ⏳ **BLOCKED** | No |
| **Phase 11** | Migration / ETL (From `The_Calm_WMS_V2.1.xlsx`) | ⏳ **BLOCKED** | No |
| **Phase 12** | Production Hardening (Security, Testing, Deploy) | ⏳ **BLOCKED** | No |

---

## Legacy Cleanup Status
The legacy systems (`TheCalm_Firebase_WMS`, `TheCalm_PHP`, `TheCalm_Web`, Apps Script) have been audited and classified. Their UX workflows and business rules were extracted for future reference.

**Cleanup Status**: `PENDING REVIEW`
The cleanup action (archiving legacy apps, deleting intermediate build artifacts) will proceed once approved. **No legacy files have been deleted yet.**

## Migration Status
**Data Source**: `The_Calm_WMS_V2.1.xlsx` will serve as the primary (but not blind) source of truth for Phase 11.
**Identity Logic**: `employeeCode` will NOT be automatically mapped to a privileged identity. Identities will follow verified mappings or require secure onboarding and explicit membership approval.
**Item Codes**: Migrated items will retain their legacy code in `legacyItemCode`, but will receive a new immutable `ITM-XXXXXX` sequence.

## UI Status
**Status**: `NOT STARTED`
**Directive**: Do NOT reproduce the legacy UI. The final Web and Mobile experiences must share domain models and rules but deliver platform-optimized, premium, RTL-first UX built entirely from scratch. Mobile must feel native and comparable in quality to high-end Flutter applications (despite being built with Expo/React Native).
