import { prisma } from "../config/prisma.js";
import { AppError, NotFoundError } from "../utils/errors.js";

type RateCardInput = {
  name: string;
  orderType: "B2B" | "B2C";
  rateScope: "INTRA_ZONE" | "INTER_ZONE";
  isFallback?: boolean;
  sourceZoneId?: string | null;
  destinationZoneId?: string | null;
  baseRate: number;
  perKgRate: number;
  minimumChargeableWeight?: number;
  volumetricDivisor?: number;
  codSurcharge?: number;
  active?: boolean;
};

export class RateCardService {
  list() {
    return prisma.rateCard.findMany({
      include: { sourceZone: true, destinationZone: true },
      orderBy: [{ isFallback: "asc" }, { orderType: "asc" }, { rateScope: "asc" }, { createdAt: "desc" }],
    });
  }

  async get(id: string) {
    const card = await prisma.rateCard.findUnique({
      where: { id },
      include: { sourceZone: true, destinationZone: true },
    });
    if (!card) throw new NotFoundError("Rate card not found");
    return card;
  }

  async create(data: RateCardInput) {
    await this.assertUniqueFallback(data);
    return prisma.rateCard.create({
      data: {
        name: data.name,
        orderType: data.orderType,
        rateScope: data.rateScope,
        isFallback: data.isFallback ?? false,
        sourceZoneId: data.isFallback ? null : (data.sourceZoneId ?? null),
        destinationZoneId: data.isFallback ? null : (data.destinationZoneId ?? null),
        baseRate: data.baseRate,
        perKgRate: data.perKgRate,
        minimumChargeableWeight: data.minimumChargeableWeight ?? 0.5,
        volumetricDivisor: data.volumetricDivisor ?? 5000,
        codSurcharge: data.codSurcharge ?? 0,
        active: data.active ?? true,
      },
    });
  }

  async update(id: string, data: Partial<RateCardInput>) {
    const current = await this.get(id);
    const next = {
      orderType: data.orderType ?? current.orderType,
      rateScope: data.rateScope ?? current.rateScope,
      isFallback: data.isFallback ?? current.isFallback,
      active: data.active ?? current.active,
    };
    await this.assertUniqueFallback(next, id);

    return prisma.rateCard.update({
      where: { id },
      data: {
        ...data,
        sourceZoneId: next.isFallback ? null : data.sourceZoneId,
        destinationZoneId: next.isFallback ? null : data.destinationZoneId,
      },
    });
  }

  async remove(id: string) {
    await this.get(id);
    await prisma.rateCard.delete({ where: { id } });
    return { id };
  }

  private async assertUniqueFallback(
    data: { orderType: "B2B" | "B2C"; rateScope: "INTRA_ZONE" | "INTER_ZONE"; isFallback?: boolean; active?: boolean },
    excludeId?: string,
  ) {
    if (!data.isFallback || data.active === false) return;
    const existing = await prisma.rateCard.findFirst({
      where: {
        isFallback: true,
        active: true,
        orderType: data.orderType,
        rateScope: data.rateScope,
        ...(excludeId ? { NOT: { id: excludeId } } : {}),
      },
    });
    if (existing) {
      throw new AppError(
        "An active fallback card already exists for this order type and scope.",
        422,
        "DUPLICATE_FALLBACK_CARD",
      );
    }
  }
}

export const rateCardService = new RateCardService();
