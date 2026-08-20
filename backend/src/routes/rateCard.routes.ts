import { Router } from "express";
import {
  createRateCard,
  deleteRateCard,
  listRateCards,
  updateRateCard,
} from "../controllers/rateCard.controller.js";
import { authenticate, requireRoles } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { rateCardSchema, rateCardUpdateSchema } from "../validators/rateCard.validators.js";

export const rateCardRouter = Router();

rateCardRouter.use(authenticate);
rateCardRouter.get("/", requireRoles("ADMIN", "CUSTOMER"), listRateCards);
rateCardRouter.post("/", requireRoles("ADMIN"), validate(rateCardSchema), createRateCard);
rateCardRouter.put("/:id", requireRoles("ADMIN"), validate(rateCardUpdateSchema), updateRateCard);
rateCardRouter.delete("/:id", requireRoles("ADMIN"), deleteRateCard);
