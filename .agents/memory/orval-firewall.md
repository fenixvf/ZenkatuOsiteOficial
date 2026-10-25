---
name: Orval firewall
description: Workspace-specific constraint affecting OpenAPI client regeneration when the package firewall blocks Orval downloads.
---

When the Replit package firewall blocks the Orval archive, app packages can still install and build from checked-in generated clients. In this workspace, filter installation to the frontend and API dependency closures so the codegen-only api-spec package is excluded. Keep generated contracts synchronized manually until codegen is available again; do not bypass the firewall or make the app depend on live codegen.

**Why:** The API specification package may have no local Orval installation even though the dependency is declared, while the frontend and API builds remain fully usable.

**How to apply:** If a full workspace install fails on Orval with a package-firewall 403, install only app packages and their workspace dependencies. If codegen itself is required, update the spec and generated outputs together and retry codegen only after the dependency can be installed normally.