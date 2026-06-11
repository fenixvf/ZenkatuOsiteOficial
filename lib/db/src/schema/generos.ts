import { pgTable, serial, varchar, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const generosTable = pgTable("generos", {
  id: serial("id").primaryKey(),
  nome: varchar("nome", { length: 100 }).notNull().unique(),
  slug: varchar("slug", { length: 100 }).notNull().unique(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertGeneroSchema = createInsertSchema(generosTable).omit({ id: true, createdAt: true });
export type InsertGenero = z.infer<typeof insertGeneroSchema>;
export type Genero = typeof generosTable.$inferSelect;
