import type { CookieOptions, Response } from "express";
import { loadEnv } from "../config/env.js";

export const ACCESS_TOKEN_COOKIE = "access_token";

export function expiresToMs(value: string): number {
  const match = /^(\d+)([smhd])$/i.exec(value.trim());
  if (!match) return 7 * 24 * 60 * 60 * 1000;
  const amount = Number(match[1]);
  const unit = match[2].toLowerCase();
  const multipliers: Record<string, number> = {
    s: 1000,
    m: 60_000,
    h: 3_600_000,
    d: 86_400_000,
  };
  return amount * (multipliers[unit] ?? 86_400_000);
}

export function authCookieOptions(): CookieOptions {
  const env = loadEnv();
  const production = env.NODE_ENV === "production";
  return {
    httpOnly: true,
    secure: production,
    sameSite: production ? "none" : "lax",
    path: "/",
    maxAge: expiresToMs(env.JWT_EXPIRES_IN),
  };
}

export function setAuthCookie(res: Response, token: string) {
  res.cookie(ACCESS_TOKEN_COOKIE, token, authCookieOptions());
}

export function clearAuthCookie(res: Response) {
  const options = authCookieOptions();
  res.clearCookie(ACCESS_TOKEN_COOKIE, {
    httpOnly: options.httpOnly,
    secure: options.secure,
    sameSite: options.sameSite,
    path: options.path,
  });
}
