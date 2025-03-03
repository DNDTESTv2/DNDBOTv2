import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupBot } from "./discord/bot";

if (!process.env.DISCORD_TOKEN) {
  throw new Error("DISCORD_TOKEN environment variable is required");
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Initialize Discord bot
  const bot = setupBot(process.env.DISCORD_TOKEN as string);

  const httpServer = createServer(app);
  return httpServer;
}