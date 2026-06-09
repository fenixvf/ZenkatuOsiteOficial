---
name: Orval Params collision
description: GET endpoints with query params generate *Params names that collide between generated/api.ts and generated/types/, causing TS2308.
---

When a GET endpoint in openapi.yaml has query parameters, Orval (in `mode: "split"` with `schemas: { path: "generated/types", type: "typescript" }`) generates:
1. A Zod schema named `ListXxxParams` in `generated/api.ts`
2. A TypeScript interface named `ListXxxParams` in `generated/types/`

Both are exported from the `lib/api-zod` barrel (`export * from "./generated/api"` + `export * from "./generated/types"`), causing TS2308.

**Why:** Orval regenerates `lib/api-zod/src/index.ts` on every codegen run, so editing the barrel is overwritten.

**How to apply:** Remove ALL query params from GET endpoints in the OpenAPI spec. Handle filtering client-side in the frontend, or use path-based routing (e.g. `/obras/top10` instead of `/obras?sort=views&limit=10`).
