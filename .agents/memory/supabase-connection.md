---
name: Supabase connection
description: How Supabase connects from Replit — IPv6 blocker, correct pooler host, port layout.
---

# Supabase connection from Replit

**Why:** Replit environment is IPv4-only. Supabase direct host (`db.{ref}.supabase.co`) resolves to IPv6 only → `EAFNOSUPPORT`. Must use the connection pooler.

## Correct pooler URL format
`postgresql://postgres.{ref}:{password}@aws-1-sa-east-1.pooler.supabase.com:6543/postgres`

- Host: `aws-1-sa-east-1.pooler.supabase.com` (NOT `aws-0-...`) — resolves to IPv4
- User: `postgres.{ref}` (project ref appended)
- Port: 6543 (transaction mode)
- SSL: `rejectUnauthorized: false`

## Password quirks
- Password may contain special chars (`@`, `#`, `$`, `[`, `]`) — always `encodeURIComponent(pass)` before building URL
- Supabase dashboard shows `[YOUR-PASSWORD]` as placeholder — user must replace with actual password
- Brackets in the password itself (e.g. `[M4ur1c18m1m2]`) → strip brackets, actual password is `M4ur1c18m1m2`

## Port layout (this project)
- `PORT=8080` set as shared env var → artifact API Server picks it up automatically
- Main "API Server" workflow: `PORT=8099` (avoids conflict)
- Vite proxy (`/api`): `http://localhost:8099`
- `lib/db/src/index.ts` and `lib/db/drizzle.config.ts`: use `SUPABASE_DATABASE_URL || DATABASE_URL`

## Tables (all 8 created via drizzle-kit push --force)
obras, users, episodios, generos, lista_obras, historico, comentarios, profile_images
