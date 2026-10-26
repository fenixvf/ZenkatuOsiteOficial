---
name: Vercel workspace dependencies
description: Packaging external and native modules for root-level Vercel functions in a pnpm monorepo.
---

For a Vercel function under the workspace-root `api/` directory, declare runtime packages externalized by esbuild in the root `package.json`, even if the API workspace also declares them.

**Why:** Vercel's function bundler omitted a native dependency declared only in the nested API workspace, and the deployed handler crashed at module initialization with `ERR_MODULE_NOT_FOUND`.

**How to apply:** When a root-level function imports an external package (especially native packages such as `sharp`), keep the root manifest and pnpm lockfile in sync, then rebuild and smoke-test the generated function bundle.
