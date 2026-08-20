import { isLocationFresh } from "./assignment.js";

export type LocationStatus = "FRESH" | "STALE" | "UNAVAILABLE";

export function decorateAgentLocation<
  T extends {
    currentLatitude?: number | null;
    currentLongitude?: number | null;
    locationUpdatedAt?: Date | null;
  },
>(agent: T, staleThresholdMs: number, now = Date.now()) {
  const hasCoords = agent.currentLatitude != null && agent.currentLongitude != null;
  const locationFresh = Boolean(
    hasCoords && isLocationFresh(agent.locationUpdatedAt ?? null, staleThresholdMs, now),
  );
  const locationAgeMs = agent.locationUpdatedAt
    ? now - new Date(agent.locationUpdatedAt).getTime()
    : null;
  const locationStatus: LocationStatus =
    !hasCoords || !agent.locationUpdatedAt ? "UNAVAILABLE" : locationFresh ? "FRESH" : "STALE";

  return {
    ...agent,
    locationFresh,
    locationAgeMs,
    locationStatus,
    locationStaleThresholdMs: staleThresholdMs,
  };
}
