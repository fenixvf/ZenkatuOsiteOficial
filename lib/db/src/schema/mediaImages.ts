import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

// Imagens enviadas pelos formulários (capa, banner, tipografia, fotos de elenco).
// Guardadas em base64 já convertidas para WebP pelo servidor.
export const mediaImagesTable = pgTable("media_images", {
  id: serial("id").primaryKey(),
  imageData: text("image_data").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type MediaImage = typeof mediaImagesTable.$inferSelect;
