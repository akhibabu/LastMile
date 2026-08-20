import { api } from "./api";
import { matchesLocationQuery } from "./locationSearch";
import type { ServiceLocation, Zone } from "../types";

function unwrapList(payload: unknown): unknown[] {
  if (Array.isArray(payload)) return payload;
  if (payload && typeof payload === "object") {
    const root = payload as Record<string, unknown>;
    if (Array.isArray(root.data)) return root.data;
    if (root.data && typeof root.data === "object") {
      const nested = root.data as Record<string, unknown>;
      if (Array.isArray(nested.data)) return nested.data;
    }
  }
  return [];
}

export function normalizeLocation(raw: unknown): ServiceLocation | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;
  const locality = String(row.locality ?? row.area ?? row.areaName ?? "").trim();
  const pincode = String(row.pincode ?? "").trim();
  if (!locality || !/^\d{6}$/.test(pincode)) return null;
  const city = String(row.city ?? "Hyderabad");
  const zone = row.zone && typeof row.zone === "object" ? (row.zone as Record<string, unknown>) : {};
  const isActive = typeof row.isActive === "boolean" ? row.isActive : Boolean(row.active ?? zone.active ?? true);
  return {
    id: String(row.id ?? `${pincode}-${locality}`),
    locality,
    area: locality,
    city,
    state: String(row.state ?? (city.toLowerCase() === "hyderabad" ? "Telangana" : "")),
    pincode,
    zoneId: String(row.zoneId ?? zone.id ?? ""),
    zoneName: String(row.zoneName ?? zone.name ?? ""),
    zoneCode: String(row.zoneCode ?? zone.code ?? ""),
    isActive,
  };
}

export function localityName(location: Pick<ServiceLocation, "locality" | "area">) {
  return location.locality || location.area || "";
}

function fromZones(zones: Zone[], search: string): ServiceLocation[] {
  const rows: ServiceLocation[] = [];
  for (const zone of zones) {
    for (const area of zone.areas ?? []) {
      const location = normalizeLocation({
        id: area.id,
        locality: area.areaName,
        city: area.city,
        pincode: area.pincode,
        zoneId: zone.id,
        zoneName: zone.name,
        zoneCode: zone.code,
        isActive: zone.active,
      });
      if (location) rows.push(location);
    }
  }
  return rows
    .filter((location) =>
      matchesLocationQuery(search, {
        locality: location.locality,
        area: location.area,
        city: location.city,
        pincode: location.pincode,
        zoneName: location.zoneName,
        zoneCode: location.zoneCode,
      }),
    )
    .sort((a, b) => a.locality.localeCompare(b.locality));
}

async function fromLocationsEndpoint(search: string): Promise<ServiceLocation[] | null> {
  try {
    const params = search ? { search, q: search } : undefined;
    const res = await api.get("/locations", { params });
    const rows = unwrapList(res.data).map(normalizeLocation).filter((row): row is ServiceLocation => Boolean(row));
    if (!search && rows.length === 0) return null;
    return rows;
  } catch {
    return null;
  }
}

async function fromZonesEndpoint(search: string): Promise<ServiceLocation[]> {
  const res = await api.get("/zones");
  return fromZones(unwrapList(res.data) as Zone[], search);
}

export async function fetchLocations(search = ""): Promise<ServiceLocation[]> {
  const dedicated = await fromLocationsEndpoint(search);
  if (dedicated) return dedicated;
  try {
    return await fromZonesEndpoint(search);
  } catch {
    if (dedicated === null) {
      throw new Error("Unable to load delivery locations. Please try again.");
    }
    return [];
  }
}
