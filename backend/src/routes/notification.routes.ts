import { Router } from "express";
import { listNotifications, retryNotification } from "../controllers/notification.controller.js";
import { authenticate, requireRoles } from "../middleware/auth.js";

export const notificationRouter = Router();

notificationRouter.use(authenticate);
notificationRouter.get("/", listNotifications);
notificationRouter.post("/:id/retry", requireRoles("ADMIN"), retryNotification);
