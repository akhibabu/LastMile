import { z } from "zod";

export const testEmailSchema = z
  .object({
    email: z.string().trim().email("Enter a valid email address"),
  })
  .strict();
