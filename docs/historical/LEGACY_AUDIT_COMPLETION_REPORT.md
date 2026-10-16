# Legacy Audit Completion Report

## Audit Summary
The Legacy Intelligence Audit of the `The_Calm_WMS_V2.1` workspace is complete. The objective was to extract business knowledge, preserve useful data structures, and define a clean strategy for removing legacy clutter without data loss.

1. **Total projects analyzed**: 4 (`TheCalm_Firebase_WMS`, `TheCalm_PHP`, `TheCalm_Web`, `Apps Script`)
2. **Total important files analyzed**: ~50+ (Dart source, JS scripts, HTML templates, Spreadsheets)
3. **Features discovered**: Live Stock, Request Workflow, Issue/Receive transactions, Dashboard, Stagnant Reports.
4. **Business rules extracted**: Item coding sequence, Stock formula validation, Email domain restrictions, Request numbering.
5. **Data sources discovered**: Google Sheets (`Code.gs` backend) and the primary `The_Calm_WMS_V2.1.xlsx` file.
6. **UX requirements discovered**: Bilingual (RTL) forms, modern aesthetics (Glassmorphism), workflow-specific data entry screens.
7. **Reports discovered**: Shortage (critical vs normal), Top Requested, Transaction Journal.
8. **Security risks discovered**: Weak SHA-256 hashing without salt, client-side UI hiding as a security mechanism, Google Sheets formula manipulation.
9. **Duplicated logic discovered**: Stock validation existed in both Flutter and Apps Script with conflicting execution paths.

## Cleanup Classification
10. **Items classified as KEEP**: `wms-monorepo/`
11. **Items classified as EXTRACT_AND_MIGRATE**: `The_Calm_WMS_V2.1.xlsx`
12. **Items classified as REFERENCE_ONLY**: `Code.gs.txt`, `Index.html.txt`, `Script.html.txt`, `Style.html.txt`
13. **Items classified as ARCHIVE**: `TheCalm_Firebase_WMS`, `TheCalm_PHP`, `TheCalm_Web`
14. **Items classified as DELETE_CANDIDATE**: Extraneous `.zip` files (e.g. `jre21.zip`), generated build folders.

## Impact on New WMS
15. **Critical discoveries affecting the new WMS**:
    * The legacy system allowed true negative stock if a physical transaction occurred without a ledger receipt. This justifies our `allowNegativeStock` override policy designed in Phase 5.
    * Emergency issues completely bypassed the traditional approval queue, meaning the new WMS must support a direct `emergencyIssue` transaction that records the overriding supervisor for audit.
16. **Recommended cleanup sequence**:
    * Review `PROJECT_CLEANUP_PLAN.md`.
    * Move all `ARCHIVE` items into a compressed ZIP outside of the Git working tree.
    * Delete `DELETE_CANDIDATE` items.
    * Proceed with new development exclusively inside `wms-monorepo`.
17. **Recommended next development phase**:
    * **Phase 6: Material Requests & Approval Workflow Backend**. With the Inventory rules extracted and the Stock Engine verified, the request lifecycle (Draft -> Submitted -> Approved -> Reserved -> Issued) must now be mapped onto the Phase 5 backend operations.

## Conclusion
The legacy knowledge has been safely extracted and cataloged in the associated markdown files. The workspace is now ready for safe cleanup pending approval.
