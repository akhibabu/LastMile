import type { Request } from "express";
import { AppError } from "./errors.js";

export function param(req: Request, key: string): string {
  const value = req.params[key];
  if (typeof value !== "string" || !value) {
    throw new AppError(`Missing route parameter ${key}`, 400, "BAD_REQUEST");
  }
  return value;
}
