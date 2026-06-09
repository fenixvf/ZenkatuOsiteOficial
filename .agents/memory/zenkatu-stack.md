---
name: Zenkatu stack decisions
description: Firebase Auth + PostgreSQL mirror pattern used in Zenkatu; VITE_ env vars required for frontend Firebase.
---

**Auth pattern:** Firebase Auth (Google OAuth) for login UX; on every login, upsert user to PostgreSQL via `POST /api/usuarios`. Role `admin` is auto-assigned server-side for the admin email.

**VITE_ env vars:** Frontend uses `import.meta.env.VITE_FIREBASE_*`. These are set as env vars mirroring the secret values (cannot pass secrets directly to VITE_).

**Avatar storage:** Files saved to `dist/avatars/` on disk as WebP. Client converts any image to WebP via Canvas API before upload. Old file deleted before saving new one.

**Player field:** `playerContent` in episodios accepts URL, `<iframe>`, or full HTML embed. Render logic detects content type at runtime.

**Why:** Comments in PostgreSQL (not Firestore) for consistent querying and admin control. Formspree only for email notifications.
