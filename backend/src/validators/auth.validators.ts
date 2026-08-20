import { z } from "zod";

const optionalPincode = z
  .string()
  .trim()
  .optional()
  .transform((value) => (value ? value : undefined))
  .pipe(z.string().regex(/^\d{6}$/, "Pincode must be 6 digits").optional());

export const registerSchema = z
  .object({
    name: z.string().trim().min(2, "Full name is required").max(80),
    email: z.string().trim().email("Invalid email").toLowerCase(),
    phone: z.string().trim().min(8, "Phone number is required").max(20),
    password: z.string().min(8, "Password must be at least 8 characters").max(100),
    address: z.string().trim().max(250).optional(),
    city: z.string().trim().max(80).optional(),
    pincode: optionalPincode,
  })
  .strict();

export const loginSchema = z
  .object({
    email: z.string().trim().email("Invalid email").toLowerCase(),
    password: z.string().min(1, "Password is required"),
  })
  .strict();

export const createAgentSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().email().toLowerCase(),
  phone: z.string().trim().min(8).max(20).optional(),
  password: z.string().min(8, "Password must be at least 8 characters").max(100),
  currentZoneId: z.string().optional(),
  currentLatitude: z.number().optional(),
  currentLongitude: z.number().optional(),
  isAvailable: z.boolean().optional(),
});
