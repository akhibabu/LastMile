import { Router } from "express";
import { listNotifications } from "../controllers/notification.controller.js";
import { authenticate } from "../middleware/auth.js";

export const notificationRouter = Router();

notificationRouter.use(authenticate);
notificationRouter.get("/", listNotifications);
