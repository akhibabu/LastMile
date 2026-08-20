import { describe, expect, it } from "vitest";
import { TrackingService } from "../services/tracking.service.js";
import { assertTransition, canTransition, ALLOWED_TRANSITIONS } from "../lib/tracking.js";

describe("status transitions", () => {
  it("allows the happy-path transitions", () => {
    expect(canTransition("CREATED", "ASSIGNED")).toBe(true);
    expect(canTransition("ASSIGNED", "PICKED_UP")).toBe(true);
    expect(canTransition("PICKED_UP", "IN_TRANSIT")).toBe(true);
    expect(canTransition("IN_TRANSIT", "OUT_FOR_DELIVERY")).toBe(true);
    expect(canTransition("OUT_FOR_DELIVERY", "DELIVERED")).toBe(true);
  });

  it("rejects invalid jumps", () => {
    expect(canTransition("CREATED", "DELIVERED")).toBe(false);
    expect(canTransition("DELIVERED", "ASSIGNED")).toBe(false);
    expect(() => assertTransition("CREATED", "DELIVERED")).toThrow(/Invalid status transition/);
  });

  it("allows admin override of otherwise illegal jumps", () => {
    expect(() => assertTransition("CREATED", "DELIVERED", { override: true, actorRole: "ADMIN" })).not.toThrow();
  });

  it("prevents agents from skipping the state machine", () => {
    expect(() => assertTransition("ASSIGNED", "DELIVERED", { actorRole: "AGENT" })).toThrow();
    expect(() => assertTransition("OUT_FOR_DELIVERY", "FAILED", { actorRole: "AGENT" })).not.toThrow();
  });

  it("supports the failed-delivery recovery path", () => {
    expect(canTransition("OUT_FOR_DELIVERY", "FAILED")).toBe(true);
    expect(canTransition("FAILED", "RESCHEDULED")).toBe(true);
    expect(canTransition("RESCHEDULED", "ASSIGNED")).toBe(true);
  });

  it("does not expose update or delete history operations", () => {
    const proto = TrackingService.prototype as Record<string, unknown>;
    expect(typeof proto.appendHistory).toBe("function");
    expect(typeof proto.getTimeline).toBe("function");
    expect(proto.updateHistory).toBeUndefined();
    expect(proto.deleteHistory).toBeUndefined();
    expect(proto.editHistory).toBeUndefined();
  });

  it("keeps delivered and cancelled terminal", () => {
    expect(ALLOWED_TRANSITIONS.DELIVERED).toEqual([]);
    expect(ALLOWED_TRANSITIONS.CANCELLED).toEqual([]);
  });
});
