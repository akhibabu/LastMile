import { prisma } from "../config/prisma.js";
import { ConflictError, NotFoundError } from "../utils/errors.js";
import { zoneResolutionService } from "./zone-resolution.service.js";

export class ZoneService {
  list() {
    return prisma.zone.findMany({
      include: { areas: { orderBy: { pincode: "asc" } }, _count: { select: { pickupOrders: true, dropOrders: true } } },
      orderBy: { code: "asc" },
    });
  }

  async get(id: string) {
    const zone = await prisma.zone.findUnique({
      where: { id },
      include: { areas: true },
    });
    if (!zone) throw new NotFoundError("Zone not found");
    return zone;
  }

  async create(data: {
    name: string;
    code: string;
    description?: string;
    active?: boolean;
    centroidLat?: number | null;
    centroidLng?: number | null;
  }) {
    const existing = await prisma.zone.findUnique({ where: { code: data.code } });
    if (existing) throw new ConflictError("A zone with this code already exists");
    return prisma.zone.create({ data });
  }

  async update(
    id: string,
    data: Partial<{
      name: string;
      code: string;
      description: string;
      active: boolean;
      centroidLat: number | null;
      centroidLng: number | null;
    }>,
  ) {
    await this.get(id);
    return prisma.zone.update({ where: { id }, data });
  }

  async deactivate(id: string) {
    await this.get(id);
    return prisma.zone.update({ where: { id }, data: { active: false } });
  }

  async addArea(
    zoneId: string,
    data: {
      pincode?: string;
      areaName?: string;
      city?: string;
      latitude?: number;
      longitude?: number;
    },
  ) {
    await this.get(zoneId);
    return prisma.zoneArea.create({
      data: { zoneId, ...data },
    });
  }

  lookupPincode(pincode: string) {
    return zoneResolutionService.lookupPincode(pincode);
  }

  async removeArea(zoneId: string, areaId: string) {
    const area = await prisma.zoneArea.findFirst({ where: { id: areaId, zoneId } });
    if (!area) throw new NotFoundError("Zone area not found");
    await prisma.zoneArea.delete({ where: { id: areaId } });
    return { id: areaId };
  }
}

export const zoneService = new ZoneService();
