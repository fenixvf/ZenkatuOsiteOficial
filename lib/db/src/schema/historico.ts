import { pgTable, serial, varchar, integer, timestamp, unique } from "drizzle-orm/pg-core";
import { episodiosTable } from "./episodios";
import { obrasTable } from "./obras";
import { usersTable } from "./users";

export const historicoTable = pgTable("historico", {
  id: serial("id").primaryKey(),
  uid: varchar("uid", { length: 128 }).notNull().references(() => usersTable.uid, { onDelete: "cascade" }),
  episodioId: integer("episodio_id").notNull().references(() => episodiosTable.id, { onDelete: "cascade" }),
  obraId: integer("obra_id").notNull().references(() => obrasTable.id, { onDelete: "cascade" }),
  watchedAt: timestamp("watched_at").defaultNow().notNull(),
}, (t) => [
  unique("historico_uid_episodio_unique").on(t.uid, t.episodioId),
]);

export type Historico = typeof historicoTable.$inferSelect;
