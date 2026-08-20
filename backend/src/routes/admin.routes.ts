import { Router } from "express";
import { dashboard } from "../controllers/order.controller.js";
import { listCustomers, listNotifications } from "../controllers/notification.controller.js";
import { authenticate, requireRoles } from "../middleware/auth.js";

export const adminRouter = Router();

adminRouter.use(authenticate);
adminRouter.get("/dashboard", dashboard);
adminRouter.get("/notifications", listNotifications);
adminRouter.get("/customers", requireRoles("ADMIN"), listCustomers);
