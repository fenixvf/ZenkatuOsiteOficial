import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

const connectionString = process.env.SUPABASE_DATABASE_URL || process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error(
    "SUPABASE_DATABASE_URL or DATABASE_URL must be set.",
  );
}

const isSupabase = connectionString.includes("supabase.com");

export const pool = new Pool({
  connectionString,
  ...(isSupabase ? { ssl: { rejectUnauthorized: false } } : {}),
});
export const db = drizzle(pool, { schema });

// ── Segundo banco (Supabase #2) ─────────────────────────────────────────────
// Guarda somente dados de usuários (users, profile_images, push/onesignal
// subscriptions, zenkatuber_requests e convites de cast) para não sobrecarregar
// o primeiro banco, que continua com o conteúdo (obras, episódios, comentários,
// listas e histórico).
//
// Enquanto SUPABASE2_DATABASE_URL não estiver configurado o segundo banco cai
// para o mesmo endereço do primeiro, então nada quebra em desenvolvimento.
const usersConnectionString =
  process.env.SUPABASE2_DATABASE_URL || connectionString;

const isUsersSupabase = usersConnectionString.includes("supabase.com");

export const pool2 = new Pool({
  connectionString: usersConnectionString,
  ...(isUsersSupabase ? { ssl: { rejectUnauthorized: false } } : {}),
});
export const db2 = drizzle(pool2, { schema });

export * from "./schema";
