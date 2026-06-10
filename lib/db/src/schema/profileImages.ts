import { pgTable, varchar, text, timestamp } from "drizzle-orm/pg-core";

export const profileImagesTable = pgTable("profile_images", {
  uid: varchar("uid", { length: 128 }).primaryKey(),
  imageData: text("image_data").notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
