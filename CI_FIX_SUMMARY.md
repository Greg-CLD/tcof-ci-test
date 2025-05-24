# CI Export Fix Summary

- Removed CommonJS export mutation in `shared/constants.debug.ts` to prevent `exports` errors when bundled as ESM.
- Added safe fallback connection strings in `server/db.ts`, `server/direct-db.ts` and `db/index.ts` to avoid crashes when `DATABASE_URL` is missing.
- Updated server startup in `server/index.ts` to use object form of `server.listen` for reliable binding.
- Added `debug` script and simplified `start` in `package.json`.
- All changes compiled successfully and the server now starts without environment variables.
