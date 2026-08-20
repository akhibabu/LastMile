import { Router } from "express";
import {
  createAgent,
  getMeAgent,
  listAgents,
  listAvailableAgents,
  updateAvailability,
  updateLocation,
} from "../controllers/agent.controller.js";
import { authenticate, requireRoles } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { createAgentSchema } from "../validators/auth.validators.js";
import { availabilitySchema, locationSchema } from "../validators/agent.validators.js";

export const agentRouter = Router();

agentRouter.use(authenticate);
agentRouter.get("/", requireRoles("ADMIN"), listAgents);
agentRouter.get("/available", requireRoles("ADMIN"), listAvailableAgents);
agentRouter.get("/me", requireRoles("AGENT", "ADMIN"), getMeAgent);
agentRouter.post("/", requireRoles("ADMIN"), validate(createAgentSchema), createAgent);
agentRouter.patch("/:id/location", requireRoles("AGENT", "ADMIN"), validate(locationSchema), updateLocation);
agentRouter.patch("/:id/availability", requireRoles("AGENT", "ADMIN"), validate(availabilitySchema), updateAvailability);
