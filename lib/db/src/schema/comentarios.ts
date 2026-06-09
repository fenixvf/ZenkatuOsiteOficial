import { pgTable, serial, integer, varchar, text, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { obrasTable } from "./obras";

export const comentariosTable = pgTable("comentarios", {
  id: serial("id").primaryKey(),
  obraId: integer("obra_id").references(() => obrasTable.id, { onDelete: "cascade" }).notNull(),
  userId: varchar("user_id", { length: 128 }).notNull(),
  username: varchar("username", { length: 100 }).notNull(),
  userPhoto: text("user_photo"),
  texto: text("texto").notNull(),
  parentId: integer("parent_id"),
  editado: boolean("editado").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertComentarioSchema = createInsertSchema(comentariosTable).omit({ id: true, editado: true, createdAt: true, updatedAt: true });
export type InsertComentario = z.infer<typeof insertComentarioSchema>;
export type Comentario = typeof comentariosTable.$inferSelect;
