import { Router } from "express";
import {
  assignOrder,
  autoAssignOrder,
  createOrder,
  getOrder,
  getTracking,
  listOrders,
  previewPrice,
  rescheduleOrder,
  unassignOrder,
  updateStatus,
} from "../controllers/order.controller.js";
import { authenticate, requireRoles } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import {
  assignOrderSchema,
  createOrderSchema,
  pricingPreviewSchema,
  rescheduleSchema,
  statusUpdateSchema,
} from "../validators/order.validators.js";

export const orderRouter = Router();

orderRouter.use(authenticate);

orderRouter.post("/preview-price", validate(pricingPreviewSchema), previewPrice);
orderRouter.post("/", requireRoles("CUSTOMER", "ADMIN"), validate(createOrderSchema), createOrder);
orderRouter.get("/", listOrders);
orderRouter.get("/:id", getOrder);
orderRouter.get("/:id/tracking", getTracking);
orderRouter.post("/:id/assign", requireRoles("ADMIN"), validate(assignOrderSchema), assignOrder);
orderRouter.post("/:id/auto-assign", requireRoles("ADMIN"), autoAssignOrder);
orderRouter.post("/:id/unassign", requireRoles("ADMIN"), unassignOrder);
orderRouter.post("/:id/status", requireRoles("ADMIN", "AGENT"), validate(statusUpdateSchema), updateStatus);
orderRouter.post("/:id/reschedule", requireRoles("CUSTOMER", "ADMIN"), validate(rescheduleSchema), rescheduleOrder);
