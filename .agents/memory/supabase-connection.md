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
- Project ref: `uaggmlgoyhqmzlycfpyo`
- Env var: `SUPABASE_DATABASE_URL` set in shared environment

## Password quirks
- Password may contain special chars (`@`, `#`, `$`, `[`, `]`) — always `encodeURIComponent(pass)` before building URL
- Brackets in the password (e.g. `[M4ur1c18m1m2]`) → strip brackets, actual password is `M4ur1c18m1m2`

## Port layout (this project)
- Main "API Server" workflow: `PORT=8099` (set in workflow command)
- Vite proxy (`/api`): `http://localhost:8099`
- `lib/db/src/index.ts` and `lib/db/drizzle.config.ts`: use `SUPABASE_DATABASE_URL || DATABASE_URL`

## Tables (created via drizzle-kit push)
obras, users, episodios, generos, lista_obras, historico, comentarios, profile_images, zenkatuber_requests
