import { pgTable, serial, varchar, integer, timestamp, unique } from "drizzle-orm/pg-core";
import { obrasTable } from "./obras";

// `uid` não tem FK para `users`: os usuários passaram a viver no segundo banco
// (Supabase #2) e o Postgres não permite FK entre bancos diferentes.
export const listaObrasTable = pgTable("lista_obras", {
  id: serial("id").primaryKey(),
  uid: varchar("uid", { length: 128 }).notNull(),
  obraId: integer("obra_id").notNull().references(() => obrasTable.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => [
  unique("lista_obras_uid_obra_id_unique").on(t.uid, t.obraId),
]);

export type ListaObra = typeof listaObrasTable.$inferSelect;
