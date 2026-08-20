import type { Request, Response } from "express";
import { zoneService } from "../services/zone.service.js";
import { created, success } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { param } from "../utils/params.js";

export const listZones = asyncHandler(async (_req: Request, res: Response) => {
  return success(res, await zoneService.list());
});

export const lookupPincode = asyncHandler(async (req: Request, res: Response) => {
  const pincode = typeof req.query.pincode === "string" ? req.query.pincode : "";
  return success(res, await zoneService.lookupPincode(pincode));
});

export const getZone = asyncHandler(async (req: Request, res: Response) => {
  return success(res, await zoneService.get(param(req, "id")));
});

export const createZone = asyncHandler(async (req: Request, res: Response) => {
  return created(res, await zoneService.create(req.body), "Zone created");
});

export const updateZone = asyncHandler(async (req: Request, res: Response) => {
  return success(res, await zoneService.update(param(req, "id"), req.body), "Zone updated");
});

export const deleteZone = asyncHandler(async (req: Request, res: Response) => {
  return success(res, await zoneService.deactivate(param(req, "id")), "Zone deactivated");
});

export const addZoneArea = asyncHandler(async (req: Request, res: Response) => {
  return created(res, await zoneService.addArea(param(req, "id"), req.body), "Area mapped");
});

export const removeZoneArea = asyncHandler(async (req: Request, res: Response) => {
  return success(res, await zoneService.removeArea(param(req, "id"), param(req, "areaId")), "Area removed");
});
