# Cleanup Manifest (After Execution)

## Root Directory (`wms-monorepo`)
- `apps/`
- `functions/`
- `packages/`
- `docs/`
  - `active/`
  - `historical/`
  - `reports/`
- `node_modules/`
- `package.json`
- `pnpm-workspace.yaml`
- `pnpm-lock.yaml`
- `turbo.json`
- `firebase.json`
- `firestore.rules`
- `.firebaserc`
- `.env`
- `.env.example`
- `.gitignore`
- `run_tests.ps1`

## Protected Files & Folders (Preserved)
- `packages/domain`
- `packages/validation`
- `packages/permissions`
- `packages/config`
- `packages/firebase`
- `packages/notifications`
- `functions/src/security`
- `functions/src/inventory`
- `functions/src/requests`
- `firestore.rules`

## Deleted / Removed Items
- `Legacy_Archive_2026/` (Left alone at the parent directory, but zip backups were retained if outside the repo scope)
- All `.zip` files containing duplicate Java runtimes inside `wms-monorepo` (`jdk.zip`, `jdk21.zip`, `jre21.zip`)
- `functions/lib` (Generated code)
- `packages/*/dist` (Generated code)
- `packages/*/.turbo` (Generated code)
- `apps/*/.next` (Generated code)
- `apps/*/.expo` (Generated code)
- `.turbo` (Generated code)
- `*.log` (Debug logs: `firestore-debug.log`, `ui-debug.log`, `firebase-debug.log`)
