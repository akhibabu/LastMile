import { Router } from "express";
import { listLocations, searchLocations } from "../controllers/location.controller.js";
import { authenticate } from "../middleware/auth.js";

export const locationRouter = Router();

locationRouter.use(authenticate);
locationRouter.get("/", listLocations);
locationRouter.get("/search", searchLocations);
