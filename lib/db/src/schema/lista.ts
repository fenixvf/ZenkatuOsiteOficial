import { pgTable, serial, varchar, integer, timestamp, unique } from "drizzle-orm/pg-core";
import { obrasTable } from "./obras";
import { usersTable } from "./users";

export const listaObrasTable = pgTable("lista_obras", {
  id: serial("id").primaryKey(),
  uid: varchar("uid", { length: 128 }).notNull().references(() => usersTable.uid, { onDelete: "cascade" }),
  obraId: integer("obra_id").notNull().references(() => obrasTable.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => [
  unique("lista_obras_uid_obra_id_unique").on(t.uid, t.obraId),
]);

export type ListaObra = typeof listaObrasTable.$inferSelect;
