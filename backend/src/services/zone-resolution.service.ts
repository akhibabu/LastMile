import { prisma } from "../config/prisma.js";
import { logger } from "../config/logger.js";
import { AppError, NotFoundError } from "../utils/errors.js";
import { extractPincode, normalizeAreaName } from "../utils/geo.js";
import { findAddressZoneConflict, normalizePincode } from "../lib/zone-match.js";

export interface ResolvedZone {
  id: string;
  code: string;
  name: string;
  method: "PINCODE";
  pincode: string;
  areaName: string | null;
  city: string | null;
  latitude: number | null;
  longitude: number | null;
  warning?: string;
}

interface ResolveInput {
  address: string;
  pincode?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  label?: string;
}

export class ZoneResolutionService {
  async resolve(input: ResolveInput): Promise<ResolvedZone> {
    const pincode = normalizePincode(input.pincode) ?? extractPincode(input.address);

    if (!pincode) {
      throw new AppError(
        "A 6-digit pincode is required to determine the delivery zone.",
        422,
        "ZONE_UNRESOLVED",
      );
    }

    const areas = await prisma.zoneArea.findMany({
      where: { pincode, zone: { active: true } },
      include: { zone: true },
    });

    if (areas.length === 0) {
      logger.warn({ address: input.address, pincode }, "Unmapped pincode");
      throw new AppError(
        `Pincode ${pincode} is not mapped to a delivery zone. Add it in Admin → Zones.`,
        422,
        "ZONE_UNRESOLVED",
      );
    }

    const zoneIds = new Set(areas.map((row) => row.zoneId));
    if (zoneIds.size > 1) {
      throw new AppError(
        `Pincode ${pincode} is mapped to more than one zone. Fix the mapping in Admin → Zones.`,
        422,
        "ZONE_UNRESOLVED",
      );
    }

    const haystack = normalizeAreaName(input.address);
    const area =
      areas.find((row) => row.areaName && haystack.includes(normalizeAreaName(row.areaName))) ?? areas[0];

    const mappedAreas = await prisma.zoneArea.findMany({
      where: { zone: { active: true }, areaName: { not: null } },
      select: { zoneId: true, areaName: true, city: true, pincode: true },
    });
    const conflict = findAddressZoneConflict(input.address, area.zoneId, mappedAreas);

    const resolved: ResolvedZone = {
      id: area.zone.id,
      code: area.zone.code,
      name: area.zone.name,
      method: "PINCODE",
      pincode,
      areaName: area.areaName,
      city: area.city,
      latitude: input.latitude ?? area.latitude ?? area.zone.centroidLat,
      longitude: input.longitude ?? area.longitude ?? area.zone.centroidLng,
    };

    if (conflict) {
      const place = input.label ?? "This";
      throw new AppError(
        `${place} pincode is not mapped to the selected address/area. "${conflict.areaName}" is in a different zone than pincode ${pincode} (${area.zone.code}).`,
        422,
        "ADDRESS_PINCODE_MISMATCH",
      );
    }

    return resolved;
  }

  async lookupPincode(pincodeRaw: string) {
    const pincode = normalizePincode(pincodeRaw);
    if (!pincode) {
      throw new AppError("Enter a valid 6-digit pincode", 422, "ZONE_UNRESOLVED");
    }
    const areas = await prisma.zoneArea.findMany({
      where: { pincode, zone: { active: true } },
      include: { zone: true },
      orderBy: { areaName: "asc" },
    });
    if (areas.length === 0) {
      throw new AppError(`Pincode ${pincode} is not mapped to a delivery zone.`, 404, "ZONE_UNRESOLVED");
    }
    const area = areas[0];
    const areaNames = [...new Set(areas.map((row) => row.areaName).filter(Boolean))];
    return {
      pincode,
      areaName: areaNames.join(" / ") || area.areaName,
      city: area.city,
      zone: { id: area.zone.id, code: area.zone.code, name: area.zone.name },
      source: "PINCODE" as const,
    };
  }

  async getZoneOrThrow(id: string) {
    const zone = await prisma.zone.findUnique({ where: { id } });
    if (!zone) throw new NotFoundError("Zone not found");
    return zone;
  }
}

export const zoneResolutionService = new ZoneResolutionService();
