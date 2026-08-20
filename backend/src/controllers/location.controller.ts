import type { Request, Response } from "express";
import { locationService } from "../services/location.service.js";
import { success } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export function locationQuery(req: Request) {
  const value = req.query.search ?? req.query.q ?? req.query.query;
  return typeof value === "string" ? value : "";
}

export const listLocations = asyncHandler(async (req: Request, res: Response) => {
  return success(res, await locationService.search(locationQuery(req)));
});

export const searchLocations = asyncHandler(async (req: Request, res: Response) => {
  return success(res, await locationService.search(locationQuery(req)));
});
