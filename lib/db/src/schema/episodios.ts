import { pgTable, serial, integer, varchar, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { obrasTable } from "./obras";

export const episodiosTable = pgTable("episodios", {
  id: serial("id").primaryKey(),
  obraId: integer("obra_id").references(() => obrasTable.id, { onDelete: "cascade" }).notNull(),
  temporada: integer("temporada").default(1).notNull(),
  numero: integer("numero").notNull(),
  titulo: varchar("titulo", { length: 255 }).notNull(),
  thumbnailUrl: text("thumbnail_url"),
  playerContent: text("player_content").notNull(),
  publishedAt: timestamp("published_at").defaultNow().notNull(),
});

export const insertEpisodioSchema = createInsertSchema(episodiosTable).omit({ id: true });
export type InsertEpisodio = z.infer<typeof insertEpisodioSchema>;
export type Episodio = typeof episodiosTable.$inferSelect;
