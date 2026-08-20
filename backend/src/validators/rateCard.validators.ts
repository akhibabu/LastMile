import { z } from "zod";

const rateCardFields = {
  name: z.string().min(2).max(120),
  orderType: z.enum(["B2B", "B2C"]),
  rateScope: z.enum(["INTRA_ZONE", "INTER_ZONE"]),
  isFallback: z.boolean().optional().default(false),
  sourceZoneId: z.string().min(1).nullable().optional(),
  destinationZoneId: z.string().min(1).nullable().optional(),
  baseRate: z.number().min(0),
  perKgRate: z.number().min(0),
  minimumChargeableWeight: z.number().min(0).optional(),
  volumetricDivisor: z.number().int().positive().optional(),
  codSurcharge: z.number().min(0).optional(),
  active: z.boolean().optional(),
};

function refineRateCard(
  data: {
    isFallback?: boolean;
    rateScope?: "INTRA_ZONE" | "INTER_ZONE";
    sourceZoneId?: string | null;
    destinationZoneId?: string | null;
  },
  ctx: z.RefinementCtx,
  requireRoute: boolean,
) {
  if (data.isFallback) {
    if (data.sourceZoneId || data.destinationZoneId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Fallback cards cannot target a specific zone pair.",
        path: ["sourceZoneId"],
      });
    }
    return;
  }

  if (!requireRoute) return;

  if (!data.sourceZoneId || !data.destinationZoneId) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Exact route cards require both source and destination zones.",
      path: ["sourceZoneId"],
    });
    return;
  }

  const sameZone = data.sourceZoneId === data.destinationZoneId;
  if (data.rateScope === "INTRA_ZONE" && !sameZone) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Intra-zone cards must use the same source and destination zone.",
      path: ["destinationZoneId"],
    });
  }
  if (data.rateScope === "INTER_ZONE" && sameZone) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Inter-zone cards must use two different zones.",
      path: ["destinationZoneId"],
    });
  }
}

export const rateCardSchema = z.object(rateCardFields).superRefine((data, ctx) => refineRateCard(data, ctx, true));

export const rateCardUpdateSchema = z
  .object(rateCardFields)
  .partial()
  .superRefine((data, ctx) => {
    const touchingRoute =
      data.isFallback !== undefined ||
      data.sourceZoneId !== undefined ||
      data.destinationZoneId !== undefined ||
      data.rateScope !== undefined;
    refineRateCard(data, ctx, touchingRoute && data.isFallback !== true);
  });
