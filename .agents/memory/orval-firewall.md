---
name: Orval firewall
description: Workspace-specific constraint affecting OpenAPI client regeneration when the package firewall blocks Orval downloads.
---

When the Replit package firewall blocks the pinned Orval archive, the application can still build from the checked-in generated clients. Keep the OpenAPI contract and generated TypeScript/Zod outputs synchronized manually until codegen is available again; do not bypass the firewall or make the app depend on a live codegen step.

**Why:** The API specification package may have no local Orval installation even though the dependency is declared, while the frontend and API builds remain fully usable.

**How to apply:** If codegen fails with a package-firewall 403, update the spec and corresponding generated outputs together, validate with the workspace typecheck/build, and retry codegen only after the dependency can be installed normally.