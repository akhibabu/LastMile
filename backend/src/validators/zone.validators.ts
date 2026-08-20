import { z } from "zod";

export const zoneSchema = z.object({
  name: z.string().min(2).max(80),
  code: z.string().min(2).max(20).regex(/^[A-Z0-9_]+$/),
  description: z.string().max(250).optional(),
  active: z.boolean().optional(),
  centroidLat: z.number().optional().nullable(),
  centroidLng: z.number().optional().nullable(),
});

export const zoneAreaSchema = z.object({
  pincode: z.string().regex(/^\d{6}$/, "Pincode must be 6 digits"),
  areaName: z.string().min(2).max(80).optional(),
  city: z.string().max(80).optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
});
