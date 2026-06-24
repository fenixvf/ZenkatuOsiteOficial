import { pgTable, serial, varchar, text, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const usersTable = pgTable("users", {
  id: serial("id").primaryKey(),
  uid: varchar("uid", { length: 128 }).unique().notNull(),
  email: varchar("email", { length: 255 }).unique().notNull(),
  username: varchar("username", { length: 20 }).unique(),
  photoUrl: text("photo_url"),
  role: varchar("role", { length: 20 }).default("user").notNull(),
  isZenkatuber: boolean("is_zenkatuber").default(false).notNull(),
  verifiedAt: timestamp("verified_at"),
  contactWhatsapp: text("contact_whatsapp"),
  contactInstagram: text("contact_instagram"),
  contactDiscord: text("contact_discord"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertUserSchema = createInsertSchema(usersTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof usersTable.$inferSelect;
