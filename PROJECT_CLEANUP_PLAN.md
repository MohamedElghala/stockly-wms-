# Project Cleanup Plan

This plan classifies all files and folders in the parent workspace to ensure the production repository (`wms-monorepo`) remains clean and free of legacy bloat. 

**NO DELETION HAS BEEN PERFORMED YET.** This plan is for review.

## 1. KEEP
Files and folders required for active production development.

* **Path**: `wms-monorepo/`
  * **Reason**: Official new production codebase.
* **Path**: `wms-monorepo/packages/`, `wms-monorepo/functions/`, etc.
  * **Reason**: Active business logic and dependencies.

## 2. EXTRACT_AND_MIGRATE
Sources containing vital data or business logic that must be actively ported.

* **Path**: `The_Calm_WMS_V2.1.xlsx`
  * **Reason**: Contains the legacy live data (Categories, Master Items, Stock Balances).
  * **Replacement**: Phase 7 ETL Migration scripts will ingest this.

## 3. REFERENCE_ONLY
Useful for understanding historical behavior, but should not be copied.

* **Path**: `Code.gs.txt`, `Index.html.txt`, `Script.html.txt`, `Style.html.txt`
  * **Reason**: Original Apps Script implementation. Business logic has been extracted to `LEGACY_BUSINESS_RULES.md`.

## 4. ARCHIVE
No longer needed for active development, but preserved for historical context outside the production codebase.

* **Path**: `TheCalm_Firebase_WMS/`
  * **Reason**: Obsolete Flutter implementation. Contains legacy UI ideas (Glassmorphism) but relies on old/insecure patterns.
* **Path**: `TheCalm_PHP/`
  * **Reason**: Obsolete PHP intermediate attempt.
* **Path**: `TheCalm_Web/`
  * **Reason**: Obsolete Web application attempt.
  
**Archive Strategy**:
Create a separate repository or a compressed archive (e.g. `Legacy_Archive_2026.zip`) stored outside the Git repository. Do not include these in `wms-monorepo`.

## 5. DELETE_CANDIDATE
Items that are entirely unnecessary, duplicated, or generated artifacts.

* **Path**: `jre21.zip`
  * **Reason**: Downloaded temporarily by the `run_tests.ps1` script for emulator provisioning.
  * **Last Known Purpose**: Java installation.
  * **Dependencies**: None.
  * **Why Safe to Remove**: Java is already extracted to `jre21/`.
  * **Replacement**: The extracted runtime.
  * **Risk**: LOW.

* **Path**: Extraneous `.git` folders in legacy apps
  * **Reason**: Prevents confusing submodules if copied into the monorepo.
  * **Risk**: LOW.

## Next Steps
Once approved, the archive strategy will be executed, and `DELETE_CANDIDATE` items will be safely removed, leaving only `wms-monorepo` and necessary migration files in the active workspace.
