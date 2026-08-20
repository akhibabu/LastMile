export interface GeoPoint {
  latitude: number;
  longitude: number;
}

export interface AssignableAgent {
  id: string;
  userId: string;
  name: string;
  status: "AVAILABLE" | "BUSY" | "OFFLINE";
  isAvailable: boolean;
  currentLatitude: number | null;
  currentLongitude: number | null;
  currentZoneId: string | null;
  activeOrderCount: number;
  maxActiveOrders: number;
}

export type AssignmentReason =
  | "NEAREST_GEOGRAPHIC"
  | "SAME_ZONE_FALLBACK"
  | "ANY_AVAILABLE_FALLBACK";

export interface AssignmentResult {
  agent: AssignableAgent;
  distanceKm: number | null;
  reason: AssignmentReason;
}

const EARTH_RADIUS_KM = 6371;

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

export function haversineKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_KM * c;
}

export function isAgentEligible(agent: AssignableAgent): boolean {
  return (
    agent.isAvailable &&
    agent.status === "AVAILABLE" &&
    agent.activeOrderCount < agent.maxActiveOrders
  );
}

export function selectNearestAgent(
  agents: AssignableAgent[],
  pickup: { latitude: number | null; longitude: number | null; zoneId: string | null },
): AssignmentResult | null {
  const eligible = agents
    .filter(isAgentEligible)
    .slice()
    .sort((a, b) => a.id.localeCompare(b.id));

  if (eligible.length === 0) {
    return null;
  }

  const pickupHasCoords =
    pickup.latitude !== null &&
    pickup.longitude !== null &&
    Number.isFinite(pickup.latitude) &&
    Number.isFinite(pickup.longitude);

  const withCoords = eligible.filter(
    (agent) =>
      agent.currentLatitude !== null &&
      agent.currentLongitude !== null &&
      Number.isFinite(agent.currentLatitude) &&
      Number.isFinite(agent.currentLongitude),
  );

  if (pickupHasCoords && withCoords.length > 0) {
    const ranked = withCoords
      .map((agent) => ({
        agent,
        distanceKm: haversineKm(
          pickup.latitude as number,
          pickup.longitude as number,
          agent.currentLatitude as number,
          agent.currentLongitude as number,
        ),
      }))
      .sort((a, b) => {
        if (a.distanceKm !== b.distanceKm) return a.distanceKm - b.distanceKm;
        return a.agent.id.localeCompare(b.agent.id);
      });

    const winner = ranked[0];
    return {
      agent: winner.agent,
      distanceKm: Math.round(winner.distanceKm * 1000) / 1000,
      reason: "NEAREST_GEOGRAPHIC",
    };
  }

  if (pickup.zoneId) {
    const sameZone = eligible.filter((agent) => agent.currentZoneId === pickup.zoneId);
    if (sameZone.length > 0) {
      return {
        agent: sameZone[0],
        distanceKm: null,
        reason: "SAME_ZONE_FALLBACK",
      };
    }
  }

  return {
    agent: eligible[0],
    distanceKm: null,
    reason: "ANY_AVAILABLE_FALLBACK",
  };
}
