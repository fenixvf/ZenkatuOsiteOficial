import { pgTable, serial, varchar, text, timestamp, boolean } from "drizzle-orm/pg-core";

export const zenkatuberRequestsTable = pgTable("zenkatuber_requests", {
  id: serial("id").primaryKey(),
  uid: varchar("uid", { length: 128 }).notNull(),
  email: varchar("email", { length: 255 }).notNull(),
  username: varchar("username", { length: 100 }).notNull(),
  whatsapp: text("whatsapp"),
  instagram: text("instagram"),
  discord: text("discord"),
  fandubLink: text("fandub_link").notNull(),
  categoria: varchar("categoria", { length: 50 }).notNull(),
  equipe: text("equipe"),
  aceitouTermos: boolean("aceitou_termos").default(false).notNull(),
  status: varchar("status", { length: 20 }).default("pending").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type ZenkatuberRequest = typeof zenkatuberRequestsTable.$inferSelect;
