import dotenv from "dotenv";
// Cargar variables de entorno antes que cualquier otra importación
dotenv.config();

import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import setupTables from "./setup-dynamodb";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  try {
    console.log("🔄 Iniciando aplicación...");

    // Verificar variables de entorno críticas
    const requiredEnvVars = ['AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY', 'AWS_REGION', 'DISCORD_TOKEN'];
    const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);

    if (missingEnvVars.length > 0) {
      console.error("❌ Faltan las siguientes variables de entorno:");
      missingEnvVars.forEach(varName => console.error(`   - ${varName}`));
      throw new Error("Variables de entorno faltantes");
    }

    // Configurar DynamoDB primero
    console.log("⏳ Configurando DynamoDB...");
    await setupTables();
    console.log("✅ DynamoDB configurado exitosamente");

    const server = await registerRoutes(app);

    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";
      console.error("❌ Error en la aplicación:", err);
      res.status(status).json({ message });
      throw err;
    });

    if (app.get("env") === "development") {
      await setupVite(app, server);
    } else {
      serveStatic(app);
    }

    const port = 5000;
    server.listen({
      port,
      host: "0.0.0.0",
      reusePort: true,
    }, () => {
      const replUrl = `https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co`;
      log(`✅ Servidor iniciado en puerto ${port}`);
      log(`📡 URL del Repl: ${replUrl}`);
      log(`🔗 URL para UptimeRobot: ${replUrl}/ping`);
    });
  } catch (error) {
    console.error("❌ Error fatal durante el inicio de la aplicación:", error);
    process.exit(1);
  }
})();