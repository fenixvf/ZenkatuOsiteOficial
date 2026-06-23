import { pgTable, text } from "drizzle-orm/pg-core";

export const siteConfigTable = pgTable("site_config", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
});

export type SiteConfig = typeof siteConfigTable.$inferSelect;
