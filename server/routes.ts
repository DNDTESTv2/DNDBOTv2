
import type { Express } from "express";
import { createServer } from "http";

export async function registerRoutes(app: Express) {
  return createServer(app);
}
