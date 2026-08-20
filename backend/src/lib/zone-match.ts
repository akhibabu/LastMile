import { normalizeAreaName } from "../utils/geo.js";

export function normalizePincode(value?: string | null): string | null {
  if (!value) return null;
  const match = value.replace(/\s/g, "").match(/\b(\d{6})\b/) ?? value.replace(/\D/g, "").match(/(\d{6})/);
  return match ? match[1] : null;
}

export interface AreaHint {
  zoneId: string;
  areaName: string | null;
  city: string | null;
  pincode: string | null;
}

export function findAddressZoneConflict(
  address: string,
  pincodeZoneId: string,
  areas: AreaHint[],
): { areaName: string } | null {
  const haystack = normalizeAreaName(address);
  if (!haystack) return null;

  const ranked = areas
    .filter((area) => area.areaName && area.areaName.trim().length >= 4)
    .slice()
    .sort((a, b) => (b.areaName?.length ?? 0) - (a.areaName?.length ?? 0));

  for (const area of ranked) {
    const token = normalizeAreaName(area.areaName ?? "");
    if (token.length < 4) continue;
    if (haystack.includes(token) && area.zoneId !== pincodeZoneId) {
      return { areaName: area.areaName as string };
    }
  }
  return null;
}
