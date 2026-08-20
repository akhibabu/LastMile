import type { Request, Response } from "express";
import { authService } from "../services/auth.service.js";
import { created, success } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { clearAuthCookie, setAuthCookie } from "../utils/cookies.js";

export const register = asyncHandler(async (req: Request, res: Response) => {
  const { user, token } = await authService.register(req.body);
  setAuthCookie(res, token);
  return created(res, { user }, "Account created");
});

export const login = asyncHandler(async (req: Request, res: Response) => {
  const { user, token } = await authService.login(req.body.email, req.body.password);
  setAuthCookie(res, token);
  return success(res, { user }, "Logged in");
});

export const logout = asyncHandler(async (_req: Request, res: Response) => {
  clearAuthCookie(res);
  return success(res, { loggedOut: true }, "Logged out");
});

export const me = asyncHandler(async (req: Request, res: Response) => {
  const user = await authService.me(req.user!.id);
  return success(res, user);
});
