import { loadEnv } from "../../config/env.js";
import { NominatimGeocodingProvider } from "./nominatim.provider.js";
import type { GeocodingProvider } from "./types.js";

export function createGeocodingProvider(): GeocodingProvider {
  const env = loadEnv();
  return new NominatimGeocodingProvider(env.GEOCODING_USER_AGENT);
}

export type { GeocodingProvider, GeocodedLocation } from "./types.js";
