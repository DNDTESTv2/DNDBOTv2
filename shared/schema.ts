import { pgTable, text, serial, integer, boolean, json, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const currencies = pgTable("currencies", {
  id: serial("id").primaryKey(),
  guildId: text("guild_id").notNull(),
  name: text("name").notNull(),
  symbol: text("symbol").notNull(),
});

export const userWallets = pgTable("user_wallets", {
  id: serial("id").primaryKey(),
  guildId: text("guild_id").notNull(),
  userId: text("user_id").notNull(),
  wallet: json("wallet").$type<Record<string, number>>().notNull().default({}),
});

export const guildSettings = pgTable("guild_settings", {
  id: serial("id").primaryKey(),
  guildId: text("guild_id").notNull(),
  transactionLogChannel: text("transaction_log_channel"),
});

export const transactions = pgTable("transactions", {
  id: serial("id").primaryKey(),
  guildId: text("guild_id").notNull(),
  fromUserId: text("from_user_id").notNull(),
  toUserId: text("to_user_id").notNull(),
  currencyName: text("currency_name").notNull(),
  amount: integer("amount").notNull(),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
});

export const insertCurrencySchema = createInsertSchema(currencies).pick({
  guildId: true,
  name: true,
  symbol: true,
});

export const insertUserWalletSchema = createInsertSchema(userWallets).pick({
  guildId: true,
  userId: true,
});

export const insertGuildSettingsSchema = createInsertSchema(guildSettings).pick({
  guildId: true,
  transactionLogChannel: true,
});

export const insertTransactionSchema = createInsertSchema(transactions).pick({
  guildId: true,
  fromUserId: true,
  toUserId: true,
  currencyName: true,
  amount: true,
});

export type Currency = typeof currencies.$inferSelect;
export type InsertCurrency = z.infer<typeof insertCurrencySchema>;

export type UserWallet = typeof userWallets.$inferSelect;
export type InsertUserWallet = z.infer<typeof insertUserWalletSchema>;

export type GuildSettings = typeof guildSettings.$inferSelect;
export type InsertGuildSettings = z.infer<typeof insertGuildSettingsSchema>;

export type Transaction = typeof transactions.$inferSelect;
export type InsertTransaction = z.infer<typeof insertTransactionSchema>;