import type { Response } from "express";

export function success<T>(res: Response, data: T, message = "OK", status = 200) {
  return res.status(status).json({ success: true, data, message });
}

export function created<T>(res: Response, data: T, message = "Created") {
  return success(res, data, message, 201);
}
