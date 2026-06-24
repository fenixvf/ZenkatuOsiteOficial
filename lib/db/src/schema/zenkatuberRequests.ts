import { pgTable, serial, varchar, text, timestamp, boolean, integer } from "drizzle-orm/pg-core";

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
  redesocial: varchar("redesocial", { length: 30 }),
  seguidores: integer("seguidores"),
  aceitouTermos: boolean("aceitou_termos").default(false).notNull(),
  status: varchar("status", { length: 20 }).default("pending").notNull(),
  stage: integer("stage").default(1).notNull(),
  postUrl: text("post_url"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type ZenkatuberRequest = typeof zenkatuberRequestsTable.$inferSelect;
