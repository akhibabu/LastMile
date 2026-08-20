import type { Request, Response } from "express";
import { agentService } from "../services/agent.service.js";
import { agentLocationService } from "../services/agent-location.service.js";
import { authService } from "../services/auth.service.js";
import { created, success } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { param } from "../utils/params.js";

export const listAgents = asyncHandler(async (_req: Request, res: Response) => {
  return success(res, await agentService.list());
});

export const listAvailableAgents = asyncHandler(async (_req: Request, res: Response) => {
  return success(res, await agentService.available());
});

export const createAgent = asyncHandler(async (req: Request, res: Response) => {
  return created(res, await authService.createAgent(req.body), "Agent created");
});

export const updateMyLocation = asyncHandler(async (req: Request, res: Response) => {
  return success(
    res,
    await agentLocationService.updateMyLocation(req.user!.id, {
      latitude: req.body.latitude,
      longitude: req.body.longitude,
    }),
    "Location updated",
  );
});

export const updateLocation = asyncHandler(async (req: Request, res: Response) => {
  const raw = param(req, "id");
  if (raw === "me") {
    return success(
      res,
      await agentLocationService.updateMyLocation(req.user!.id, {
        latitude: req.body.latitude,
        longitude: req.body.longitude,
      }),
      "Location updated",
    );
  }
  return success(res, await agentService.updateLocation(raw, req.user!, req.body), "Location updated");
});

export const updateAvailability = asyncHandler(async (req: Request, res: Response) => {
  const raw = param(req, "id");
  const id = raw === "me" ? (await agentService.getByUserId(req.user!.id)).id : raw;
  return success(res, await agentService.updateAvailability(id, req.user!, req.body), "Availability updated");
});

export const getMeAgent = asyncHandler(async (req: Request, res: Response) => {
  return success(res, await agentService.getByUserId(req.user!.id));
});
