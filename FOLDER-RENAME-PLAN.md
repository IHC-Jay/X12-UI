# Folder Rename Summary: `server` → `backend`

Status: Completed on 2026-08-04.

This repo can keep working as-is, but if you want a cleaner structure, this is a safe migration plan.

## Recommendation

- Keep frontend in `src/`
- Keep .NET backend at top level, renamed to `backend/`
- Avoid moving backend under `src/` to prevent tooling/deploy friction

## Current state

- Backend folder now exists at `backend/`
- Runtime scripts support **both** folder names (`backend` preferred, `server` fallback):
  - `build-integrated.ps1`
  - `start-dev.ps1`

## Migration steps that were applied

1. Renamed folder in git:
   - `git mv server backend`
2. Re-ran local build scripts:
   - `./build-integrated.ps1 -Profile SH -Configuration production`
   - `./start-dev.ps1 -BackendOnly`
3. Verified backend health:
   - `http://localhost:3100/api/health`
4. Published frontend profiles:
   - `npm run publish:sh`
   - `npm run publish:rco`
5. Update any external deployment jobs/services that reference old paths.

## Known references to review outside this repo

- Windows service / executable path currently observed on Win12:
  - `C:\Services\TpManageSync\publish\TpManageSync.Api.exe`
- Any CI/CD scripts that call `dotnet` from `server/`
- Any documentation that hardcodes old external folders

## Rollback option

If needed:

- `git mv backend server`
- Re-run build/start/publish scripts

## Why this was low risk

- No code behavior change required
- Existing scripts now auto-detect `backend/` then `server/`
- Rename was done in a single atomic commit and can be reverted
