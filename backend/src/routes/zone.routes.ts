import { Router } from "express";
import {
  addZoneArea,
  createZone,
  deleteZone,
  getZone,
  listZones,
  lookupPincode,
  removeZoneArea,
  updateZone,
} from "../controllers/zone.controller.js";
import { listLocations } from "../controllers/location.controller.js";
import { authenticate, requireRoles } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { zoneAreaSchema, zoneSchema } from "../validators/zone.validators.js";

export const zoneRouter = Router();

zoneRouter.use(authenticate);
zoneRouter.get("/", listZones);
zoneRouter.get("/locations", listLocations);
zoneRouter.get("/lookup", lookupPincode);
zoneRouter.get("/:id", getZone);
zoneRouter.post("/", requireRoles("ADMIN"), validate(zoneSchema), createZone);
zoneRouter.put("/:id", requireRoles("ADMIN"), validate(zoneSchema.partial()), updateZone);
zoneRouter.delete("/:id", requireRoles("ADMIN"), deleteZone);
zoneRouter.post("/:id/areas", requireRoles("ADMIN"), validate(zoneAreaSchema), addZoneArea);
zoneRouter.delete("/:id/areas/:areaId", requireRoles("ADMIN"), removeZoneArea);
