import { z } from "zod";

export const rateCardSchema = z
  .object({
    name: z.string().min(2).max(120),
    orderType: z.enum(["B2B", "B2C"]),
    rateScope: z.enum(["INTRA_ZONE", "INTER_ZONE"]),
    sourceZoneId: z.string().min(1, "Source zone is required"),
    destinationZoneId: z.string().min(1, "Destination zone is required"),
    baseRate: z.number().min(0),
    perKgRate: z.number().min(0),
    minimumChargeableWeight: z.number().min(0).optional(),
    volumetricDivisor: z.number().int().positive().optional(),
    codSurcharge: z.number().min(0).optional(),
    active: z.boolean().optional(),
  })
  .refine(
    (data) =>
      data.rateScope === "INTRA_ZONE"
        ? data.sourceZoneId === data.destinationZoneId
        : data.sourceZoneId !== data.destinationZoneId,
    {
      message:
        "Intra-zone cards must use the same source and destination zone; inter-zone cards must use two different zones.",
    },
  );

export const rateCardUpdateSchema = z.object({
  name: z.string().min(2).max(120).optional(),
  orderType: z.enum(["B2B", "B2C"]).optional(),
  rateScope: z.enum(["INTRA_ZONE", "INTER_ZONE"]).optional(),
  sourceZoneId: z.string().min(1).nullable().optional(),
  destinationZoneId: z.string().min(1).nullable().optional(),
  baseRate: z.number().min(0).optional(),
  perKgRate: z.number().min(0).optional(),
  minimumChargeableWeight: z.number().min(0).optional(),
  volumetricDivisor: z.number().int().positive().optional(),
  codSurcharge: z.number().min(0).optional(),
  active: z.boolean().optional(),
});
