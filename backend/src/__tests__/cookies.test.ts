import { describe, expect, it } from "vitest";
import { expiresToMs } from "../utils/cookies.js";

describe("auth cookie expiry", () => {
  it("parses JWT_EXPIRES_IN values", () => {
    expect(expiresToMs("7d")).toBe(7 * 24 * 60 * 60 * 1000);
    expect(expiresToMs("15m")).toBe(15 * 60 * 1000);
    expect(expiresToMs("bogus")).toBe(7 * 24 * 60 * 60 * 1000);
  });
});
