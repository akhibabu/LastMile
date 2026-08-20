import { prisma } from "../config/prisma.js";
import { matchesLocationQuery } from "../lib/location-search.js";

export interface ServiceLocation {
  id: string;
  locality: string;
  area: string;
  city: string;
  state: string;
  pincode: string;
  zoneId: string;
  zoneName: string;
  zoneCode: string;
  isActive: boolean;
}

function toLocation(row: {
  id: string;
  areaName: string | null;
  city: string | null;
  pincode: string | null;
  zoneId: string;
  zone: { name: string; code: string; active: boolean };
}): ServiceLocation | null {
  if (!row.areaName?.trim() || !row.pincode?.trim()) return null;
  const city = row.city?.trim() || "Hyderabad";
  return {
    id: row.id,
    locality: row.areaName,
    area: row.areaName,
    city,
    state: city.toLowerCase() === "hyderabad" ? "Telangana" : "",
    pincode: row.pincode,
    zoneId: row.zoneId,
    zoneName: row.zone.name,
    zoneCode: row.zone.code,
    isActive: row.zone.active,
  };
}

export class LocationService {
  async search(query = ""): Promise<ServiceLocation[]> {
    const rows = await prisma.zoneArea.findMany({
      include: { zone: true },
      orderBy: [{ areaName: "asc" }, { pincode: "asc" }],
    });

    return rows
      .map(toLocation)
      .filter((location): location is ServiceLocation => Boolean(location))
      .filter((location) => matchesLocationQuery(query, location));
  }
}

export const locationService = new LocationService();
