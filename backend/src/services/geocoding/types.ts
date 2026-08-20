export interface GeocodedLocation {
  latitude: number;
  longitude: number;
  displayName: string;
  pincode?: string | null;
}

export interface GeocodingProvider {
  geocode(address: string): Promise<GeocodedLocation | null>;
}
