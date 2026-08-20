import type { NextFunction, Request, Response } from "express";
import { ZodSchema } from "zod";
import { ValidationError } from "../utils/errors.js";

export function validate(schema: ZodSchema, source: "body" | "query" | "params" = "body") {
  return (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      const errors = result.error.issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message,
      }));
      next(new ValidationError("Validation failed", errors));
      return;
    }
    req[source] = result.data as never;
    next();
  };
}
