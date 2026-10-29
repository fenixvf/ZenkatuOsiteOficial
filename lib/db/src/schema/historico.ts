import { pgTable, serial, varchar, integer, timestamp, unique } from "drizzle-orm/pg-core";
import { episodiosTable } from "./episodios";
import { obrasTable } from "./obras";

// `uid` não tem FK para `users`: os usuários passaram a viver no segundo banco
// (Supabase #2) e o Postgres não permite FK entre bancos diferentes.
export const historicoTable = pgTable("historico", {
  id: serial("id").primaryKey(),
  uid: varchar("uid", { length: 128 }).notNull(),
  episodioId: integer("episodio_id").notNull().references(() => episodiosTable.id, { onDelete: "cascade" }),
  obraId: integer("obra_id").notNull().references(() => obrasTable.id, { onDelete: "cascade" }),
  watchedAt: timestamp("watched_at").defaultNow().notNull(),
}, (t) => [
  unique("historico_uid_episodio_unique").on(t.uid, t.episodioId),
]);

export type Historico = typeof historicoTable.$inferSelect;
