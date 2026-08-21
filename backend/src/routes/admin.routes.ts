import { Router } from "express";
import { dashboard } from "../controllers/order.controller.js";
import { listCustomers, listNotifications, sendTestEmail } from "../controllers/notification.controller.js";
import { authenticate, requireRoles } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { testEmailSchema } from "../validators/notification.validators.js";

export const adminRouter = Router();

adminRouter.use(authenticate);
adminRouter.get("/dashboard", dashboard);
adminRouter.get("/notifications", listNotifications);
adminRouter.post("/notifications/test-email", requireRoles("ADMIN"), validate(testEmailSchema), sendTestEmail);
adminRouter.get("/customers", requireRoles("ADMIN"), listCustomers);
