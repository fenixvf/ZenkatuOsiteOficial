import { defineConfig } from "drizzle-kit";
import path from "path";

// Cria/atualiza APENAS as tabelas de usuários no segundo Supabase.
// Uso: pnpm --filter @workspace/db run push:users
const url = process.env.SUPABASE2_DATABASE_URL;

if (!url) {
  throw new Error("SUPABASE2_DATABASE_URL must be set");
}

export default defineConfig({
  schema: path.join(__dirname, "./src/schema-users.ts"),
  dialect: "postgresql",
  dbCredentials: { url },
});
