import { describe, expect, it } from "vitest";
import { isAllowedOrigin } from "../app.js";

const configured = ["https://last-mile-frontend.vercel.app"];

describe("isAllowedOrigin", () => {
  it("allows configured production frontends", () => {
    expect(isAllowedOrigin("https://last-mile-frontend.vercel.app", configured)).toBe(true);
  });

  it("allows local Vite origins without listing every port", () => {
    expect(isAllowedOrigin("http://localhost:5174", configured)).toBe(true);
  });

  it("allows Vercel preview hosts over https", () => {
    expect(isAllowedOrigin("https://last-mile-frontend-git-main-akhibabu.vercel.app", [])).toBe(true);
  });

  it("rejects lookalike hosts and http vercel urls", () => {
    expect(isAllowedOrigin("https://evilvercel.app", [])).toBe(false);
    expect(isAllowedOrigin("http://last-mile-frontend.vercel.app", [])).toBe(false);
    expect(isAllowedOrigin("https://example.com", configured)).toBe(false);
  });
});
