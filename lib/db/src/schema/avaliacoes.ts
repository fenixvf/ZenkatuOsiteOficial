import { pgTable, serial, varchar, integer, timestamp, unique } from "drizzle-orm/pg-core";
import { obrasTable } from "./obras";

// Avaliações em estrelas (1–5) feitas pelas contas vinculadas à Zenkatu.
// `uid` não tem FK para `users`: os perfis vivem no 2º banco (Supabase #2).
export const avaliacoesTable = pgTable(
  "avaliacoes",
  {
    id: serial("id").primaryKey(),
    obraId: integer("obra_id")
      .notNull()
      .references(() => obrasTable.id, { onDelete: "cascade" }),
    uid: varchar("uid", { length: 128 }).notNull(),
    estrelas: integer("estrelas").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [
    unique("avaliacoes_obra_uid_unique").on(t.obraId, t.uid),
  ],
);

export type Avaliacao = typeof avaliacoesTable.$inferSelect;
