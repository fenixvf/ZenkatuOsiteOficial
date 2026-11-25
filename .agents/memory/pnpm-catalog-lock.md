---
name: Vercel frozen lockfile
description: Keep pnpm workspace catalogs and the lockfile synchronized for Vercel builds.
---

When a dependency version changes through a pnpm workspace `catalog:`, refresh and commit `pnpm-lock.yaml`; Vercel's frozen install rejects catalog drift before running the configured build.

**Why:** The workspace catalog can be newer than the lockfile even when package manifests still refer to `catalog:`. A local non-frozen install may hide this until CI or Vercel installs reproducibly.

**How to apply:** Before publishing after catalog edits, run `pnpm install --lockfile-only --no-frozen-lockfile`, then verify with `pnpm install --frozen-lockfile` and the production build command.
