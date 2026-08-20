import { Router } from "express";
import { listLocations, searchLocations } from "../controllers/location.controller.js";

export const locationRouter = Router();

locationRouter.get("/", listLocations);
locationRouter.get("/search", searchLocations);
