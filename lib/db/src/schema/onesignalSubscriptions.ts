import { pgTable, serial, text, varchar, boolean, timestamp } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const onesignalSubscriptionsTable = pgTable("onesignal_subscriptions", {
  id: serial("id").primaryKey(),
  uid: varchar("uid", { length: 128 }).notNull().references(() => usersTable.uid, { onDelete: "cascade" }),
  playerId: text("player_id").notNull().unique(),
  notifyEpisodios: boolean("notify_episodios").default(true).notNull(),
  notifyObras: boolean("notify_obras").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type OnesignalSubscription = typeof onesignalSubscriptionsTable.$inferSelect;
