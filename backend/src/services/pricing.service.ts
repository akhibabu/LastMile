import { prisma } from "../config/prisma.js";
import { logger } from "../config/logger.js";
import { AppError } from "../utils/errors.js";
import {
  buildPricingBreakdown,
  selectRateCard,
  type PricingBreakdown,
  type RateCardLike,
} from "../lib/pricing.js";
import { zoneResolutionService, type ResolvedZone } from "./zone-resolution.service.js";

export interface QuoteRequest {
  pickupAddress: string;
  pickupPincode?: string | null;
  pickupLatitude?: number | null;
  pickupLongitude?: number | null;
  dropAddress: string;
  dropPincode?: string | null;
  dropLatitude?: number | null;
  dropLongitude?: number | null;
  length: number;
  breadth: number;
  height: number;
  actualWeight: number;
  orderType: "B2B" | "B2C";
  paymentType: "PREPAID" | "COD";
}

export type QuoteResult = PricingBreakdown & {
  pickup: ResolvedZone;
  drop: ResolvedZone;
  pickupAddress: string;
  dropAddress: string;
  length: number;
  breadth: number;
  height: number;
};

export class PricingService {
  async quote(input: QuoteRequest): Promise<QuoteResult> {
    const pickup = await zoneResolutionService.resolve({
      address: input.pickupAddress,
      pincode: input.pickupPincode,
      latitude: input.pickupLatitude,
      longitude: input.pickupLongitude,
      label: "Pickup",
    });
    const drop = await zoneResolutionService.resolve({
      address: input.dropAddress,
      pincode: input.dropPincode,
      latitude: input.dropLatitude,
      longitude: input.dropLongitude,
      label: "Drop",
    });

    const cards = await prisma.rateCard.findMany({ where: { active: true } });
    const mapped: RateCardLike[] = cards.map((card) => ({
      id: card.id,
      name: card.name,
      orderType: card.orderType,
      rateScope: card.rateScope,
      sourceZoneId: card.sourceZoneId,
      destinationZoneId: card.destinationZoneId,
      baseRate: Number(card.baseRate),
      perKgRate: Number(card.perKgRate),
      minimumChargeableWeight: Number(card.minimumChargeableWeight),
      volumetricDivisor: card.volumetricDivisor,
      codSurcharge: Number(card.codSurcharge),
      active: card.active,
    }));

    const zoneScope = pickup.id === drop.id ? "INTRA_ZONE" : "INTER_ZONE";
    const rateCard = selectRateCard(mapped, input.orderType, zoneScope, pickup.id, drop.id);

    if (!rateCard) {
      throw new AppError(
        `No rate card is configured for this route (${input.orderType} ${zoneScope === "INTRA_ZONE" ? "intra-zone" : "inter-zone"}: ${pickup.code} → ${drop.code}).`,
        422,
        "MISSING_RATE_CARD",
      );
    }

    const breakdown = buildPricingBreakdown(
      {
        pickupZoneId: pickup.id,
        pickupZoneCode: pickup.code,
        pickupZoneName: pickup.name,
        dropZoneId: drop.id,
        dropZoneCode: drop.code,
        dropZoneName: drop.name,
        length: input.length,
        breadth: input.breadth,
        height: input.height,
        actualWeight: input.actualWeight,
        orderType: input.orderType,
        paymentType: input.paymentType,
      },
      rateCard,
    );

    logger.info(
      {
        pickupZone: pickup.code,
        dropZone: drop.code,
        zoneScope: breakdown.zoneScope,
        totalCharge: breakdown.totalCharge,
        billableWeight: breakdown.billableWeight,
      },
      "pricing calculated",
    );

    return {
      ...breakdown,
      pickup,
      drop,
      pickupAddress: input.pickupAddress,
      dropAddress: input.dropAddress,
      length: input.length,
      breadth: input.breadth,
      height: input.height,
    };
  }
}

export const pricingService = new PricingService();
