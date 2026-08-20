import { logger } from "../../config/logger.js";
import { extractPincode } from "../../utils/geo.js";
import type { GeocodedLocation, GeocodingProvider } from "./types.js";

const cache = new Map<string, GeocodedLocation | null>();

export class NominatimGeocodingProvider implements GeocodingProvider {
  constructor(private readonly userAgent: string) {}

  async geocode(address: string): Promise<GeocodedLocation | null> {
    const key = address.trim().toLowerCase();
    if (cache.has(key)) {
      return cache.get(key) ?? null;
    }

    try {
      const url = new URL("https://nominatim.openstreetmap.org/search");
      url.searchParams.set("q", address);
      url.searchParams.set("format", "json");
      url.searchParams.set("limit", "1");
      url.searchParams.set("addressdetails", "1");

      const response = await fetch(url, {
        headers: { "User-Agent": this.userAgent, Accept: "application/json" },
      });

      if (!response.ok) {
        logger.warn({ status: response.status }, "Nominatim geocoding failed");
        cache.set(key, null);
        return null;
      }

      const results = (await response.json()) as Array<{
        lat: string;
        lon: string;
        display_name: string;
        address?: { postcode?: string };
      }>;

      if (!results[0]) {
        cache.set(key, null);
        return null;
      }

      const first = results[0];
      const location: GeocodedLocation = {
        latitude: Number(first.lat),
        longitude: Number(first.lon),
        displayName: first.display_name,
        pincode: first.address?.postcode ?? extractPincode(address),
      };
      cache.set(key, location);
      return location;
    } catch (error) {
      logger.warn({ err: error }, "Nominatim geocoding exception");
      return null;
    }
  }
}
