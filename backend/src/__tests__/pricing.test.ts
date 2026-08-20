import { describe, expect, it } from "vitest";
import {
  buildPricingBreakdown,
  calculateBillableWeight,
  calculateCodSurcharge,
  calculateShippingCharge,
  calculateVolumetricWeight,
  determineRateScope,
  selectRateCard,
  type RateCardLike,
} from "../lib/pricing.js";

const intraB2C: RateCardLike = {
  id: "rc-b2c-intra",
  name: "B2C HYD_WEST → HYD_WEST",
  orderType: "B2C",
  rateScope: "INTRA_ZONE",
  sourceZoneId: "z-west",
  destinationZoneId: "z-west",
  baseRate: 55,
  perKgRate: 10,
  minimumChargeableWeight: 0.5,
  volumetricDivisor: 5000,
  codSurcharge: 40,
  active: true,
};

const interB2C: RateCardLike = {
  ...intraB2C,
  id: "rc-b2c-inter",
  name: "B2C HYD_WEST → HYD_CENTRAL",
  rateScope: "INTER_ZONE",
  sourceZoneId: "z-west",
  destinationZoneId: "z-central",
  baseRate: 85,
  perKgRate: 12,
  codSurcharge: 50,
};

const intraB2B: RateCardLike = {
  ...intraB2C,
  id: "rc-b2b-intra",
  name: "B2B HYD_WEST → HYD_WEST",
  orderType: "B2B",
  baseRate: 45,
  perKgRate: 8,
  codSurcharge: 25,
};

const interB2B: RateCardLike = {
  ...intraB2B,
  id: "rc-b2b-inter",
  name: "B2B HYD_WEST → HYD_CENTRAL",
  rateScope: "INTER_ZONE",
  sourceZoneId: "z-west",
  destinationZoneId: "z-central",
  baseRate: 70,
  perKgRate: 10,
  codSurcharge: 35,
};

const globalFallback: RateCardLike = {
  ...interB2C,
  id: "rc-global",
  name: "B2C Inter-zone default",
  sourceZoneId: null,
  destinationZoneId: null,
};

describe("pricing engine", () => {
  it("calculates volumetric weight as L×B×H / 5000", () => {
    expect(calculateVolumetricWeight(40, 30, 20, 5000)).toBe(4.8);
  });

  it("calculates 100×100×100 cm as 200 kg volumetric weight", () => {
    expect(calculateVolumetricWeight(100, 100, 100, 5000)).toBe(200);
  });

  it("uses actual weight when it is higher than volumetric", () => {
    expect(calculateBillableWeight(6, 4.8)).toBe(6);
  });

  it("uses volumetric weight when it is higher than actual", () => {
    expect(calculateBillableWeight(3, 4.8)).toBe(4.8);
  });

  it("does not cap volumetric or billable weight", () => {
    expect(calculateBillableWeight(10, 200)).toBe(200);
  });

  it("detects intra-zone scope", () => {
    expect(determineRateScope("Z1", "Z1")).toBe("INTRA_ZONE");
  });

  it("detects inter-zone scope", () => {
    expect(determineRateScope("Z1", "Z2")).toBe("INTER_ZONE");
  });

  it("applies intra-zone B2C pricing", () => {
    const quote = buildPricingBreakdown(
      {
        pickupZoneId: "z-west",
        pickupZoneCode: "HYD_WEST",
        pickupZoneName: "Hyderabad West",
        dropZoneId: "z-west",
        dropZoneCode: "HYD_WEST",
        dropZoneName: "Hyderabad West",
        length: 40,
        breadth: 30,
        height: 20,
        actualWeight: 3,
        orderType: "B2C",
        paymentType: "PREPAID",
      },
      intraB2C,
    );
    expect(quote.zoneScope).toBe("INTRA_ZONE");
    expect(quote.shippingCharge).toBe(55 + 4.8 * 10);
    expect(quote.codSurcharge).toBe(0);
    expect(quote.totalCharge).toBe(103);
  });

  it("applies inter-zone B2C pricing", () => {
    const quote = buildPricingBreakdown(
      {
        pickupZoneId: "z-west",
        pickupZoneCode: "HYD_WEST",
        pickupZoneName: "Hyderabad West",
        dropZoneId: "z-central",
        dropZoneCode: "HYD_CENTRAL",
        dropZoneName: "Hyderabad Central",
        length: 40,
        breadth: 30,
        height: 20,
        actualWeight: 3,
        orderType: "B2C",
        paymentType: "PREPAID",
      },
      interB2C,
    );
    expect(quote.zoneScope).toBe("INTER_ZONE");
    expect(quote.baseRate).toBe(85);
    expect(quote.weightCharge).toBe(57.6);
    expect(quote.shippingCharge).toBe(142.6);
  });

  it("applies B2B pricing separately from B2C", () => {
    const quote = buildPricingBreakdown(
      {
        pickupZoneId: "z-west",
        pickupZoneCode: "HYD_WEST",
        pickupZoneName: "Hyderabad West",
        dropZoneId: "z-west",
        dropZoneCode: "HYD_WEST",
        dropZoneName: "Hyderabad West",
        length: 10,
        breadth: 10,
        height: 10,
        actualWeight: 2,
        orderType: "B2B",
        paymentType: "PREPAID",
      },
      intraB2B,
    );
    expect(quote.orderType).toBe("B2B");
    expect(quote.billableWeight).toBe(2);
    expect(quote.shippingCharge).toBe(45 + 2 * 8);
  });

  it("sets COD surcharge to 0 for prepaid orders", () => {
    expect(calculateCodSurcharge("PREPAID", 40)).toBe(0);
  });

  it("adds COD surcharge for COD orders", () => {
    const quote = buildPricingBreakdown(
      {
        pickupZoneId: "z-west",
        pickupZoneCode: "HYD_WEST",
        pickupZoneName: "Hyderabad West",
        dropZoneId: "z-central",
        dropZoneCode: "HYD_CENTRAL",
        dropZoneName: "Hyderabad Central",
        length: 40,
        breadth: 30,
        height: 20,
        actualWeight: 3,
        orderType: "B2C",
        paymentType: "COD",
      },
      interB2C,
    );
    expect(quote.codSurcharge).toBe(50);
    expect(quote.totalCharge).toBe(192.6);
  });

  it("prices the Gachibowli → Hitech City assignment example from the configured intra-zone card", () => {
    const quote = buildPricingBreakdown(
      {
        pickupZoneId: "z-west",
        pickupZoneCode: "HYD_WEST",
        pickupZoneName: "Hyderabad West",
        dropZoneId: "z-west",
        dropZoneCode: "HYD_WEST",
        dropZoneName: "Hyderabad West",
        length: 100,
        breadth: 100,
        height: 100,
        actualWeight: 10,
        orderType: "B2C",
        paymentType: "COD",
      },
      intraB2C,
    );
    expect(quote.volumetricWeight).toBe(200);
    expect(quote.billableWeight).toBe(200);
    expect(quote.zoneScope).toBe("INTRA_ZONE");
    expect(quote.shippingCharge).toBe(2055);
    expect(quote.codSurcharge).toBe(40);
    expect(quote.totalCharge).toBe(2095);
  });

  it("returns null when no matching rate card exists", () => {
    const selected = selectRateCard([intraB2C], "B2B", "INTER_ZONE", "z-west", "z-central");
    expect(selected).toBeNull();
  });

  it("does not use a generic null/null fallback rate card", () => {
    const selected = selectRateCard([globalFallback], "B2C", "INTER_ZONE", "z-west", "z-central");
    expect(selected).toBeNull();
  });

  it("selects only the exact source and destination zone pair", () => {
    const otherPair: RateCardLike = {
      ...interB2C,
      id: "other",
      sourceZoneId: "z-west",
      destinationZoneId: "z-east",
    };
    const selected = selectRateCard([globalFallback, otherPair, interB2C], "B2C", "INTER_ZONE", "z-west", "z-central");
    expect(selected?.id).toBe("rc-b2c-inter");
  });

  it("returns a complete breakdown with all required fields", () => {
    const quote = buildPricingBreakdown(
      {
        pickupZoneId: "z-west",
        pickupZoneCode: "HYD_WEST",
        pickupZoneName: "Hyderabad West",
        dropZoneId: "z-central",
        dropZoneCode: "HYD_CENTRAL",
        dropZoneName: "Hyderabad Central",
        length: 40,
        breadth: 30,
        height: 20,
        actualWeight: 3,
        orderType: "B2C",
        paymentType: "COD",
      },
      interB2C,
    );
    expect(quote).toMatchObject({
      actualWeight: 3,
      volumetricWeight: 4.8,
      billableWeight: 4.8,
      baseRate: 85,
      perKgRate: 12,
      shippingCharge: 142.6,
      codSurcharge: 50,
      totalCharge: 192.6,
    });
    expect(calculateShippingCharge(85, 4.8, 12)).toBe(142.6);
    expect(interB2B.baseRate).toBe(70);
  });
});
