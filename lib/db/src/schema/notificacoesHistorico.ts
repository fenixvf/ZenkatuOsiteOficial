import { pgTable, serial, text, varchar, timestamp } from "drizzle-orm/pg-core";

export const notificacoesHistoricoTable = pgTable("notificacoes_historico", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  body: text("body").notNull(),
  image: text("image"),
  url: text("url"),
  type: varchar("type", { length: 32 }).notNull().default("custom"),
  sentAt: timestamp("sent_at").defaultNow().notNull(),
});

export type NotificacaoHistorico = typeof notificacoesHistoricoTable.$inferSelect;
