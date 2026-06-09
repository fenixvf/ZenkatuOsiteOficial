import { pgTable, serial, varchar, text, integer, real, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const obrasTable = pgTable("obras", {
  id: serial("id").primaryKey(),
  titulo: varchar("titulo", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 255 }).unique().notNull(),
  sinopse: text("sinopse").notNull(),
  generos: text("generos").array().default([]).notNull(),
  status: varchar("status", { length: 50 }).default("Em Exibição").notNull(),
  ano: integer("ano").notNull(),
  nota: real("nota"),
  totalEps: integer("total_eps"),
  capaUrl: text("capa_url").notNull(),
  bannerUrl: text("banner_url").notNull(),
  tipografiaUrl: text("tipografia_url"),
  showInBanner: boolean("show_in_banner").default(false).notNull(),
  bannerOrder: integer("banner_order"),
  views: integer("views").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertObraSchema = createInsertSchema(obrasTable).omit({ id: true, views: true, createdAt: true, updatedAt: true });
export type InsertObra = z.infer<typeof insertObraSchema>;
export type Obra = typeof obrasTable.$inferSelect;
