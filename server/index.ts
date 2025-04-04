import dotenv from "dotenv";
dotenv.config();

import express from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import setupTables from "./setup-dynamodb";
import { setupBot } from "./discord/bot";
import { storage } from './storage';
import { docClient } from './dynamodb';
import { ScanCommand } from "@aws-sdk/lib-dynamodb";
import { TableNames } from './dynamodb';

const requiredEnvVars = ['AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY', 'AWS_REGION', 'DISCORD_TOKEN'];
for (const varName of requiredEnvVars) {
  if (!process.env[varName]) {
    throw new Error(`Missing required environment variable: ${varName}`);
  }
}

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

const bot = setupBot(process.env.DISCORD_TOKEN);

// Middleware de logging simplificado
app.use((req, res, next) => {
  if (req.path.startsWith("/api")) {
    const start = Date.now();
    res.on("finish", () => {
      const duration = Date.now() - start;
      log(`${req.method} ${req.path} ${res.statusCode} in ${duration}ms`);
    });
  }
  next();
});

async function processShops() {
  try {
    const response = await docClient.send(new ScanCommand({
      TableName: TableNames.SHOPS
    }));
    const allShops = response.Items || [];
    const now = new Date();

    for (const shop of allShops) {
      const baseEarnings = {
        'chico': 250,
        'mediano': 500,
        'grande': 750
      };

      const d20Roll = Math.floor(Math.random() * 20) + 1;
      const baseValue = baseEarnings[shop.size as keyof typeof baseEarnings];

      const multipliers = {
        '1-5': 0.5,
        '6-10': 1,
        '11-15': 1.25,
        '16-19': 1.5,
        '20': 2
      };

      let multiplier = 1;
      if (d20Roll <= 5) multiplier = multipliers['1-5'];
      else if (d20Roll <= 10) multiplier = multipliers['6-10'];
      else if (d20Roll <= 15) multiplier = multipliers['11-15'];
      else if (d20Roll <= 19) multiplier = multipliers['16-19'];
      else multiplier = multipliers['20'];

      const earnings = Math.floor(baseValue * multiplier);
      const tax = Math.floor(earnings * 0.1);
      const earningsAfterTax = earnings - tax;

      const wallet = await storage.getUserWallet(shop.guildId, shop.userId);
      if (!wallet) continue;

      const currencies = await storage.getCurrencies(shop.guildId);
      if (!currencies.length) continue;

      const currency = currencies[0];
      const updatedWallet = { 
        ...wallet.wallet,
        [currency.name]: (wallet.wallet[currency.name] || 0) + earningsAfterTax 
      };

      // Get bot's wallet and update it with tax
      const botWallet = await storage.getUserWallet(shop.guildId, bot.user!.id);
      if (botWallet) {
        const updatedBotWallet = {
          ...botWallet.wallet,
          [currency.name]: (botWallet.wallet[currency.name] || 0) + tax
        };
        await storage.updateUserWallet(botWallet.id, updatedBotWallet);
      }

      await Promise.all([
        storage.updateUserWallet(wallet.id, updatedWallet),
        storage.updateShopPayout(shop.id, now),
        logTransaction(shop, earnings, tax, earningsAfterTax, currency, d20Roll, baseValue, now)
      ]);
    }
  } catch (error) {
    console.error("Error procesando pagos de comercios:", error);
  }
}

async function logTransaction(shop: any, earnings: number, tax: number, earningsAfterTax: number, currency: any, d20Roll: number, baseValue: number, now: Date) {
  const settings = await storage.getGuildSettings(shop.guildId);
  if (!settings?.transactionLogChannel) return;

  try {
    const guild = await bot.guilds.fetch(shop.guildId);
    const channel = await guild.channels.fetch(settings.transactionLogChannel);
    if (!channel?.isTextBased()) return;

    const rollDescriptions = {
      '1-5': "¡Mala suerte! Solo 50% de las ganancias base",
      '6-10': "Día normal, ganancias base",
      '11-15': "¡Buen día! +25% de ganancias",
      '16-19': "¡Excelente día! +50% de ganancias",
      '20': "¡CRÍTICO! Doble de ganancias"
    };

    let rollExplanation = rollDescriptions['6-10'];
    if (d20Roll <= 5) rollExplanation = rollDescriptions['1-5'];
    else if (d20Roll <= 15) rollExplanation = rollDescriptions['11-15'];
    else if (d20Roll <= 19) rollExplanation = rollDescriptions['16-19'];
    else rollExplanation = rollDescriptions['20'];

    await channel.send(
      `💰 Ganancias de comercio:\n` +
      `Comercio: ${shop.name}\n` +
      `Dueño: <@${shop.userId}>\n` +
      `Ganancia bruta: ${earnings} ${currency.symbol}\n` +
      `Impuesto (10%): ${tax} ${currency.symbol}\n` +
      `Ganancia neta: ${earningsAfterTax} ${currency.symbol}\n` +
      `Tirada d20: ${d20Roll} - ${rollExplanation}\n` +
      `Valor base: ${baseValue} ${currency.symbol}\n` +
      `Fecha: ${now.toLocaleString()}`
    );
  } catch (error) {
    console.error("Error al enviar log de ganancias:", error);
  }
}

(async () => {
  try {
    console.log("🔄 Iniciando aplicación...");
    await setupTables();
    const server = await registerRoutes(app);

    app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
      console.error("❌ Error en la aplicación:", err);
      res.status(err.status || 500).json({ message: err.message || "Error interno del servidor" });
    });

    if (app.get("env") === "development") {
      await setupVite(app, server);
    } else {
      serveStatic(app);
    }

    const port = process.env.PORT || 3000;
    server.listen(port, "0.0.0.0", () => {
      console.log(`✅ Servidor iniciado en puerto ${port}`);
    });

    process.on('SIGTERM', () => server.close(() => process.exit(0)));
    process.on('SIGINT', () => server.close(() => process.exit(0)));

    setInterval(processShops, 7 * 24 * 60 * 60 * 1000); // 1 week in milliseconds
  } catch (error) {
    console.error("❌ Error fatal durante el inicio de la aplicación:", error);
    process.exit(1);
  }
})();