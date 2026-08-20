import type { Prisma } from "@prisma/client";
import { prisma } from "../config/prisma.js";
import { NotFoundError } from "../utils/errors.js";

export class RateCardService {
  list() {
    return prisma.rateCard.findMany({
      include: { sourceZone: true, destinationZone: true },
      orderBy: [{ orderType: "asc" }, { rateScope: "asc" }, { createdAt: "desc" }],
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

  create(data: {
    name: string;
    orderType: "B2B" | "B2C";
    rateScope: "INTRA_ZONE" | "INTER_ZONE";
    sourceZoneId?: string | null;
    destinationZoneId?: string | null;
    baseRate: number;
    perKgRate: number;
    minimumChargeableWeight?: number;
    volumetricDivisor?: number;
    codSurcharge?: number;
    active?: boolean;
  }) {
    return prisma.rateCard.create({
      data: {
        name: data.name,
        orderType: data.orderType,
        rateScope: data.rateScope,
        sourceZoneId: data.sourceZoneId ?? null,
        destinationZoneId: data.destinationZoneId ?? null,
        baseRate: data.baseRate,
        perKgRate: data.perKgRate,
        minimumChargeableWeight: data.minimumChargeableWeight ?? 0.5,
        volumetricDivisor: data.volumetricDivisor ?? 5000,
        codSurcharge: data.codSurcharge ?? 0,
        active: data.active ?? true,
      },
    });
  }

  async update(id: string, data: Prisma.RateCardUpdateInput) {
    await this.get(id);
    return prisma.rateCard.update({ where: { id }, data });
  }

  async remove(id: string) {
    await this.get(id);
    await prisma.rateCard.delete({ where: { id } });
    return { id };
  }
}

export const rateCardService = new RateCardService();
