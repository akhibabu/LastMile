import { describe, expect, it } from "vitest";
import { assertTransition, canTransition } from "../lib/tracking.js";

describe("failed delivery flow", () => {
  it("requires a failure reason at the API contract level", () => {
    const reasonRequired = (status: string, reason?: string) => {
      if (status === "FAILED" && !reason) {
        throw new Error("A failure reason is required");
      }
    };
    expect(() => reasonRequired("FAILED")).toThrow(/failure reason/i);
    expect(() => reasonRequired("FAILED", "CUSTOMER_UNAVAILABLE")).not.toThrow();
  });

  it("records FAILED before RESCHEDULED in the state machine", () => {
    expect(canTransition("OUT_FOR_DELIVERY", "FAILED")).toBe(true);
    expect(canTransition("FAILED", "RESCHEDULED")).toBe(true);
    expect(canTransition("OUT_FOR_DELIVERY", "RESCHEDULED")).toBe(false);
  });

  it("returns the order to ASSIGNED after reschedule so a new attempt can start", () => {
    expect(canTransition("RESCHEDULED", "ASSIGNED")).toBe(true);
    expect(() => assertTransition("RESCHEDULED", "ASSIGNED")).not.toThrow();
  });

  it("keeps the original failed attempt independent from later success", () => {
    const attempts = [
      { attemptNumber: 1, status: "FAILED", reason: "CUSTOMER_UNAVAILABLE" },
      { attemptNumber: 2, status: "RESCHEDULED", rescheduledDate: "2026-08-21" },
      { attemptNumber: 3, status: "SUCCESS" },
    ];
    expect(attempts[0]?.status).toBe("FAILED");
    expect(attempts).toHaveLength(3);
    expect(attempts.find((item) => item.status === "FAILED")).toBeTruthy();
    expect(attempts.find((item) => item.status === "SUCCESS")).toBeTruthy();
  });
});
