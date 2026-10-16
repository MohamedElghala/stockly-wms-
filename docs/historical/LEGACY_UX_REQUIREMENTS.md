# Legacy UX Requirements

This document catalogs the UX patterns and functional workflows discovered in the legacy apps (Flutter, Web, Apps Script HTML) to inform the WMS design system.

> [!CAUTION]
> **MANDATE: DO NOT REPRODUCE LEGACY UI**
> The legacy applications are business and functional references ONLY. They are NOT the final UI/UX design reference. The final The Calm WMS product must deliver a premium, modern, enterprise-grade UX with a native-feeling Android/iOS experience (Expo/React Native) and a premium enterprise SaaS-level Web UI (Next.js). The entire experience must be redesigned from scratch using a cohesive design system that is responsive, Arabic-first, RTL-first, role-aware, fast, and accessible.

## General Design
* **Bilingual Support**: Strong requirement for Arabic (RTL) and English (LTR) support. Forms and tables must seamlessly support right-to-left alignment for Arabic text.
* **Glassmorphism / Modern UI**: The legacy Flutter app (`glass_card.dart`, `glass_container.dart`) attempted to introduce a "Glassmorphism" aesthetic. The new WMS should elevate this into a clean, professional, high-contrast Enterprise UI without sacrificing clarity.

## Workflows & Screens
* **Live Stock View**: Dedicated `live_stock_screen.dart` indicates users need a real-time, easily searchable view of current balances.
* **Transaction Entry**: `addition_screen`, `disbursement_screen`, `scrap_screen`. Indicates a desire to split different transaction types into focused, intent-specific screens rather than a generic "journal entry" form.
* **Request Lifecycle**: `create_request_screen`, `pending_screen`, `archive_screen`. Requesters need clear visibility into the state of their requests (Pending vs Approved/Archived).
* **Dashboards**: A need for a high-level `dashboard_screen` providing quick metrics and shortcuts to common tasks.

## Form Elements
* **Quick Actions**: Prominent buttons for rapid execution of Receipts, Issues, and Transfers.
* **Dropdown Filters**: Filtering by Category, Department, and Warehouse is essential for navigating large catalogs.

## Actionable Takeaways for WMS UI
1. Do not reuse the Flutter `glass_card` directly; implement a cohesive Tailwind/CSS design system.
2. Ensure full RTL support is baked into the layout foundation.
3. Build focused entry screens for the stock engine operations (`receiveStock`, `issueDirectStock`, etc.).
