import { describe, expect, it } from "vitest";
import { haversineKm, isAgentEligible, selectNearestAgent, type AssignableAgent } from "../lib/assignment.js";

function agent(partial: Partial<AssignableAgent> & Pick<AssignableAgent, "id" | "name">): AssignableAgent {
  return {
    userId: partial.id,
    status: "AVAILABLE",
    isAvailable: true,
    currentLatitude: null,
    currentLongitude: null,
    currentZoneId: null,
    locationUpdatedAt: null,
    activeOrderCount: 0,
    maxActiveOrders: 5,
    ...partial,
  };
}

const fresh = new Date();
const stale = new Date(Date.now() - 20 * 60 * 1000);

describe("auto-assignment", () => {
  it("selects the nearest available agent by haversine distance", () => {
    const agents = [
      agent({ id: "far", name: "Far", currentLatitude: 26.2, currentLongitude: 91.9, currentZoneId: "a", locationUpdatedAt: fresh }),
      agent({ id: "near", name: "Near", currentLatitude: 26.145, currentLongitude: 91.736, currentZoneId: "a", locationUpdatedAt: fresh }),
    ];
    const result = selectNearestAgent(agents, { latitude: 26.1445, longitude: 91.7362, zoneId: "a" });
    expect(result?.agent.id).toBe("near");
    expect(result?.reason).toBe("NEAREST_GEOGRAPHIC");
    expect(result?.distanceKm).not.toBeNull();
  });

  it("excludes unavailable, offline, and overloaded agents", () => {
    const agents = [
      agent({ id: "busy", name: "Busy", status: "BUSY", isAvailable: false, currentLatitude: 26.14, currentLongitude: 91.73, locationUpdatedAt: fresh }),
      agent({ id: "off", name: "Off", status: "OFFLINE", isAvailable: false, currentLatitude: 26.14, currentLongitude: 91.73, locationUpdatedAt: fresh }),
      agent({
        id: "full",
        name: "Full",
        activeOrderCount: 5,
        maxActiveOrders: 5,
        currentLatitude: 26.14,
        currentLongitude: 91.73,
        locationUpdatedAt: fresh,
      }),
    ];
    expect(agents.every((item) => !isAgentEligible(item) || item.id === "full" ? !isAgentEligible(item) : true)).toBe(true);
    const result = selectNearestAgent(agents, { latitude: 26.14, longitude: 91.73, zoneId: "a" });
    expect(result).toBeNull();
  });

  it("falls back to same-zone matching when coordinates are missing", () => {
    const agents = [
      agent({ id: "z-b", name: "Zone B", currentZoneId: "b" }),
      agent({ id: "z-a", name: "Zone A", currentZoneId: "a" }),
    ];
    const result = selectNearestAgent(agents, { latitude: null, longitude: null, zoneId: "a" });
    expect(result?.agent.id).toBe("z-a");
    expect(result?.reason).toBe("SAME_ZONE_FALLBACK");
  });

  it("returns null when no agent is available", () => {
    const result = selectNearestAgent([], { latitude: 26.14, longitude: 91.73, zoneId: "a" });
    expect(result).toBeNull();
  });

  it("computes a sane haversine distance for nearby points", () => {
    const km = haversineKm(26.1445, 91.7362, 26.1455, 91.7372);
    expect(km).toBeGreaterThan(0);
    expect(km).toBeLessThan(1);
  });

  it("prefers a fresh nearby agent over a closer stale agent", () => {
    const agents = [
      agent({
        id: "stale-near",
        name: "Stale",
        currentLatitude: 26.145,
        currentLongitude: 91.736,
        currentZoneId: "a",
        locationUpdatedAt: stale,
      }),
      agent({
        id: "fresh-far",
        name: "Fresh",
        currentLatitude: 26.2,
        currentLongitude: 91.9,
        currentZoneId: "b",
        locationUpdatedAt: fresh,
      }),
    ];
    const result = selectNearestAgent(
      agents,
      { latitude: 26.1445, longitude: 91.7362, zoneId: "a" },
      { staleThresholdMs: 300_000 },
    );
    expect(result?.agent.id).toBe("fresh-far");
    expect(result?.reason).toBe("NEAREST_GEOGRAPHIC");
    expect(result?.locationFresh).toBe(true);
  });

  it("falls back to the same zone when all coordinates are stale", () => {
    const agents = [
      agent({
        id: "stale-b",
        name: "Zone B",
        currentLatitude: 26.2,
        currentLongitude: 91.9,
        currentZoneId: "b",
        locationUpdatedAt: stale,
      }),
      agent({
        id: "stale-a",
        name: "Zone A",
        currentLatitude: 26.145,
        currentLongitude: 91.736,
        currentZoneId: "a",
        locationUpdatedAt: stale,
      }),
    ];
    const result = selectNearestAgent(
      agents,
      { latitude: 26.1445, longitude: 91.7362, zoneId: "a" },
      { staleThresholdMs: 300_000 },
    );
    expect(result?.agent.id).toBe("stale-a");
    expect(result?.reason).toBe("SAME_ZONE_FALLBACK");
    expect(result?.locationFresh).toBe(false);
  });
});
