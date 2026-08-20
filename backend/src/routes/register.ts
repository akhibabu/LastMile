import { notificationRouter } from "./notification.routes.js";
import { authRouter } from "./auth.routes.js";
import { orderRouter } from "./order.routes.js";
import { locationRouter } from "./location.routes.js";
import { zoneRouter } from "./zone.routes.js";
import { rateCardRouter } from "./rateCard.routes.js";
import { agentRouter } from "./agent.routes.js";
import { adminRouter } from "./admin.routes.js";
import type { Express } from "express";
import swaggerUi from "swagger-ui-express";
import { openApiSpec } from "./openapi.js";
import { loadEnv } from "../config/env.js";
import { success } from "../utils/apiResponse.js";

export function registerRoutes(app: Express) {
  app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(openApiSpec, { customSiteTitle: "LastMile API Docs" }));
  app.get("/api/docs.json", (_req, res) => res.json(openApiSpec));
  app.get("/api/config", (_req, res) => {
    const env = loadEnv();
    return success(res, {
      appName: env.FROM_NAME || "LastMile",
      locationUpdateIntervalMs: env.LOCATION_UPDATE_INTERVAL,
      locationStaleThresholdMs: env.LOCATION_STALE_THRESHOLD,
    });
  });
  app.use("/api/auth", authRouter);
  app.use("/api/orders", orderRouter);
  app.use("/api/zones", zoneRouter);
  app.use("/api/locations", locationRouter);
  app.use("/api/rate-cards", rateCardRouter);
  app.use("/api/agents", agentRouter);
  app.use("/api/admin", adminRouter);
  app.use("/api/notifications", notificationRouter);
}
