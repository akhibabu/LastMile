import type { Request, Response } from "express";
import { authService } from "../services/auth.service.js";
import { created, success } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const register = asyncHandler(async (req: Request, res: Response) => {
  const result = await authService.register(req.body);
  return created(res, result, "Account created");
});

export const login = asyncHandler(async (req: Request, res: Response) => {
  const result = await authService.login(req.body.email, req.body.password);
  return success(res, result, "Logged in");
});

export const logout = asyncHandler(async (_req: Request, res: Response) => {
  return success(res, { loggedOut: true }, "Logged out");
});

export const me = asyncHandler(async (req: Request, res: Response) => {
  const user = await authService.me(req.user!.id);
  return success(res, user);
});
