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
  lastWorked: timestamp("last_worked"),
  lastStolen: timestamp("last_stolen"), 
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

export const characters = pgTable("characters", {
  id: serial("id").primaryKey(),
  guildId: text("guild_id").notNull(),
  userId: text("user_id").notNull(),
  name: text("name").notNull(),
  level: integer("level").notNull(),
  class: text("class").notNull(),
  race: text("race").notNull(),
  alignment: text("alignment"),
  languages: text("languages").array(),
  imageUrl: text("image_url"),
  n20Url: text("n20_url"),
  rank: text("rank").notNull().default('Rango E'),
  createdAt: timestamp("created_at").notNull().defaultNow(),
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

export const insertCharacterSchema = createInsertSchema(characters).pick({
  guildId: true,
  userId: true,
  name: true,
  level: true,
  class: true,
  race: true,
  imageUrl: true,
  n20Url: true,
  rank: true,
});

export type Currency = typeof currencies.$inferSelect;
export type InsertCurrency = z.infer<typeof insertCurrencySchema>;

export type UserWallet = typeof userWallets.$inferSelect;
export type InsertUserWallet = z.infer<typeof insertUserWalletSchema>;

export type GuildSettings = typeof guildSettings.$inferSelect;
export type InsertGuildSettings = z.infer<typeof insertGuildSettingsSchema>;

export type Transaction = typeof transactions.$inferSelect;
export type InsertTransaction = z.infer<typeof insertTransactionSchema>;

export const shops = pgTable("shops", {
  id: serial("id").primaryKey(),
  guildId: text("guild_id").notNull(),
  userId: text("user_id").notNull(),
  name: text("name").notNull(),
  type: text("type").notNull(),
  size: text("size").notNull(),
  imageUrl: text("image_url"),
  lastPayout: timestamp("last_payout").notNull().defaultNow(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertShopSchema = createInsertSchema(shops).pick({
  guildId: true,
  userId: true,
  name: true,
  type: true,
  size: true,
  imageUrl: true,
});

export type Shop = typeof shops.$inferSelect;
export const reputation = pgTable("reputation", {
  id: serial("id").primaryKey(),
  guildId: text("guild_id").notNull(),
  userId: text("user_id").notNull(),
  points: integer("points").notNull().default(0),
});

export const insertReputationSchema = createInsertSchema(reputation).pick({
  guildId: true,
  userId: true,
  points: true,
});

export type InsertShop = z.infer<typeof insertShopSchema>;
export type Reputation = typeof reputation.$inferSelect;
export type InsertReputation = z.infer<typeof insertReputationSchema>;

export type Character = typeof characters.$inferSelect;
export type InsertCharacter = z.infer<typeof insertCharacterSchema>;