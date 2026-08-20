export function matchesLocationQuery(
  query: string,
  location: {
    locality?: string | null;
    area?: string | null;
    city?: string | null;
    pincode?: string | null;
    zoneName?: string | null;
    zoneCode?: string | null;
  },
): boolean {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  return [location.locality, location.area, location.city, location.pincode, location.zoneName, location.zoneCode]
    .filter((value): value is string => Boolean(value))
    .some((value) => value.toLowerCase().includes(needle));
}
