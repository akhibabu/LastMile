import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import { loadEnv } from "./config/env.js";
import { apiLimiter } from "./middleware/rateLimit.js";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler.js";
import { registerRoutes } from "./routes/register.js";

function isAllowedOrigin(origin: string | undefined, configured: string[]) {
  if (!origin) return true;
  if (configured.includes(origin)) return true;
  if (/^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin)) return true;
  return false;
}

export function createApp() {
  const env = loadEnv();
  const app = express();
  const configuredOrigins = env.FRONTEND_URL.split(",").map((value) => value.trim()).filter(Boolean);

  app.set("trust proxy", 1);
  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginResourcePolicy: { policy: "cross-origin" },
      crossOriginOpenerPolicy: { policy: "same-origin-allow-popups" },
    }),
  );
  app.use(
    cors({
      origin(origin, callback) {
        callback(null, isAllowedOrigin(origin, configuredOrigins));
      },
      credentials: true,
    }),
  );
  app.use(express.json({ limit: "1mb" }));
  app.use(cookieParser());
  app.use("/api", apiLimiter);

  app.get("/health", (_req, res) => {
    res.json({ success: true, data: { status: "ok" }, message: "LastMile API" });
  });

  registerRoutes(app);
  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
