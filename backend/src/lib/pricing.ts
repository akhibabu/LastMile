export const DEFAULT_VOLUMETRIC_DIVISOR = 5000;

export type PaymentType = "PREPAID" | "COD";
export type OrderType = "B2B" | "B2C";
export type RateScope = "INTRA_ZONE" | "INTER_ZONE";

export interface RateCardLike {
  id: string;
  name: string;
  orderType: OrderType;
  rateScope: RateScope;
  sourceZoneId: string | null;
  destinationZoneId: string | null;
  baseRate: number;
  perKgRate: number;
  minimumChargeableWeight: number;
  volumetricDivisor: number;
  codSurcharge: number;
  active: boolean;
  isFallback?: boolean;
}

export type RateResolutionType = "EXACT_ZONE_PAIR" | "INTRA_ZONE_FALLBACK" | "INTER_ZONE_FALLBACK";

export interface RateSelection {
  card: RateCardLike;
  resolutionType: RateResolutionType;
}

export interface PricingInput {
  pickupZoneId: string;
  pickupZoneCode: string;
  pickupZoneName: string;
  dropZoneId: string;
  dropZoneCode: string;
  dropZoneName: string;
  length: number;
  breadth: number;
  height: number;
  actualWeight: number;
  orderType: OrderType;
  paymentType: PaymentType;
}

export interface PricingBreakdown {
  pickupZone: { id: string; code: string; name: string };
  dropZone: { id: string; code: string; name: string };
  zoneScope: RateScope;
  orderType: OrderType;
  paymentType: PaymentType;
  actualWeight: number;
  volumetricWeight: number;
  billableWeight: number;
  volumetricDivisor: number;
  rateCardId: string;
  rateCardName: string;
  baseRate: number;
  perKgRate: number;
  shippingCharge: number;
  weightCharge: number;
  codSurcharge: number;
  totalCharge: number;
  resolutionType: RateResolutionType;
}

export function roundTo(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

export function calculateVolumetricWeight(
  length: number,
  breadth: number,
  height: number,
  divisor: number = DEFAULT_VOLUMETRIC_DIVISOR,
): number {
  if (length <= 0 || breadth <= 0 || height <= 0) {
    throw new Error("Package dimensions must be greater than 0");
  }
  if (divisor <= 0) {
    throw new Error("Volumetric divisor must be greater than 0");
  }
  return roundTo((length * breadth * height) / divisor, 3);
}

export function calculateBillableWeight(
  actualWeight: number,
  volumetricWeight: number,
  minimumChargeableWeight = 0,
): number {
  if (actualWeight <= 0) {
    throw new Error("Actual weight must be greater than 0");
  }
  return roundTo(Math.max(actualWeight, volumetricWeight, minimumChargeableWeight), 3);
}

export function determineRateScope(pickupZoneId: string, dropZoneId: string): RateScope {
  return pickupZoneId === dropZoneId ? "INTRA_ZONE" : "INTER_ZONE";
}

/**
 * shippingCharge = baseRate + (billableWeight × perKgRate)
 */
export function calculateShippingCharge(
  baseRate: number,
  billableWeight: number,
  perKgRate: number,
): number {
  return roundTo(baseRate + billableWeight * perKgRate, 2);
}

export function calculateCodSurcharge(paymentType: PaymentType, surcharge: number): number {
  if (paymentType !== "COD") {
    return 0;
  }
  return roundTo(surcharge, 2);
}

export function selectRateCard(
  cards: RateCardLike[],
  orderType: OrderType,
  rateScope: RateScope,
  pickupZoneId: string,
  dropZoneId: string,
): RateSelection | null {
  const eligible = cards.filter(
    (card) => card.active && card.orderType === orderType && card.rateScope === rateScope,
  );

  const exact = eligible.find(
    (card) =>
      card.isFallback !== true &&
      card.sourceZoneId === pickupZoneId &&
      card.destinationZoneId === dropZoneId,
  );
  if (exact) {
    return { card: exact, resolutionType: "EXACT_ZONE_PAIR" };
  }

  const fallback = eligible.find(
    (card) =>
      card.isFallback === true &&
      card.sourceZoneId == null &&
      card.destinationZoneId == null,
  );
  if (fallback) {
    return {
      card: fallback,
      resolutionType: rateScope === "INTRA_ZONE" ? "INTRA_ZONE_FALLBACK" : "INTER_ZONE_FALLBACK",
    };
  }

  return null;
}

export function buildPricingBreakdown(
  input: PricingInput,
  rateCard: RateCardLike,
  resolutionType: RateResolutionType = "EXACT_ZONE_PAIR",
): PricingBreakdown {
  const divisor = rateCard.volumetricDivisor || DEFAULT_VOLUMETRIC_DIVISOR;
  const volumetricWeight = calculateVolumetricWeight(
    input.length,
    input.breadth,
    input.height,
    divisor,
  );
  const billableWeight = calculateBillableWeight(
    input.actualWeight,
    volumetricWeight,
    Number(rateCard.minimumChargeableWeight),
  );
  const zoneScope = determineRateScope(input.pickupZoneId, input.dropZoneId);
  const shippingCharge = calculateShippingCharge(
    rateCard.baseRate,
    billableWeight,
    rateCard.perKgRate,
  );
  const weightCharge = roundTo(billableWeight * rateCard.perKgRate, 2);
  const codSurcharge = calculateCodSurcharge(input.paymentType, rateCard.codSurcharge);
  const totalCharge = roundTo(shippingCharge + codSurcharge, 2);

  return {
    pickupZone: {
      id: input.pickupZoneId,
      code: input.pickupZoneCode,
      name: input.pickupZoneName,
    },
    dropZone: {
      id: input.dropZoneId,
      code: input.dropZoneCode,
      name: input.dropZoneName,
    },
    zoneScope,
    orderType: input.orderType,
    paymentType: input.paymentType,
    actualWeight: roundTo(input.actualWeight, 3),
    volumetricWeight,
    billableWeight,
    volumetricDivisor: divisor,
    rateCardId: rateCard.id,
    rateCardName: rateCard.name,
    baseRate: roundTo(rateCard.baseRate, 2),
    perKgRate: roundTo(rateCard.perKgRate, 2),
    shippingCharge,
    weightCharge,
    codSurcharge,
    totalCharge,
    resolutionType,
  };
}
