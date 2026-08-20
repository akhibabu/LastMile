import { z } from "zod";

export const pricingPreviewSchema = z.object({
  pickupAddress: z.string().min(5).max(300),
  pickupPincode: z.string().regex(/^\d{6}$/, "Pickup pincode must be 6 digits"),
  pickupLatitude: z.number().optional(),
  pickupLongitude: z.number().optional(),
  dropAddress: z.string().min(5).max(300),
  dropPincode: z.string().regex(/^\d{6}$/, "Drop pincode must be 6 digits"),
  dropLatitude: z.number().optional(),
  dropLongitude: z.number().optional(),
  length: z.number().positive(),
  breadth: z.number().positive(),
  height: z.number().positive(),
  actualWeight: z.number().positive(),
  orderType: z.enum(["B2B", "B2C"]),
  paymentType: z.enum(["PREPAID", "COD"]),
});

export const createOrderSchema = pricingPreviewSchema.extend({
  customerId: z.string().optional(),
  notes: z.string().max(400).optional(),
});

export const assignOrderSchema = z.object({
  agentId: z.string().min(1),
});

export const statusUpdateSchema = z.object({
  status: z.enum([
    "CREATED",
    "ASSIGNED",
    "PICKED_UP",
    "IN_TRANSIT",
    "OUT_FOR_DELIVERY",
    "DELIVERED",
    "FAILED",
    "RESCHEDULED",
    "CANCELLED",
  ]),
  note: z.string().max(400).optional(),
  reason: z
    .enum(["CUSTOMER_UNAVAILABLE", "WRONG_ADDRESS", "ACCESS_ISSUE", "CUSTOMER_REFUSED", "OTHER"])
    .optional(),
  override: z.boolean().optional(),
});

export const rescheduleSchema = z.object({
  scheduledDeliveryDate: z.string().datetime().or(z.string().min(8)),
  note: z.string().max(400).optional(),
});
