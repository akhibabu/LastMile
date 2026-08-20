import type { Request, Response } from "express";
import { rateCardService } from "../services/rate-card.service.js";
import { created, success } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { param } from "../utils/params.js";

export const listRateCards = asyncHandler(async (_req: Request, res: Response) => {
  return success(res, await rateCardService.list());
});

export const createRateCard = asyncHandler(async (req: Request, res: Response) => {
  return created(res, await rateCardService.create(req.body), "Rate card created");
});

export const updateRateCard = asyncHandler(async (req: Request, res: Response) => {
  return success(res, await rateCardService.update(param(req, "id"), req.body), "Rate card updated");
});

export const deleteRateCard = asyncHandler(async (req: Request, res: Response) => {
  return success(res, await rateCardService.remove(param(req, "id")), "Rate card deleted");
});
