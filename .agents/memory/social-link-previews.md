---
name: Social link previews
description: Server-generated metadata and public URL handling for share previews in Zenkatu.
---

Social link previews must be generated from server-rendered HTML; changing document metadata in the SPA is not sufficient because many crawlers do not execute JavaScript. When the Vite proxy uses `changeOrigin`, preserve the incoming public host and protocol so canonical and image URLs do not point to the internal API address.

**Why:** The web artifact serves a static SPA, while chat and social preview bots need project-specific Open Graph metadata in the initial response.

**How to apply:** For future share-card changes, keep project metadata on a server endpoint, use absolute public URLs, and test both crawler HTML and the normal browser redirect through the same public-facing proxy.
