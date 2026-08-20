import { z } from "zod";

export const locationSchema = z.object({
  latitude: z.number().gte(-90).lte(90),
  longitude: z.number().gte(-180).lte(180),
  zoneId: z.string().optional(),
});

export const availabilitySchema = z.object({
  isAvailable: z.boolean(),
  status: z.enum(["AVAILABLE", "BUSY", "OFFLINE"]).optional(),
});
