import { describe, expect, it } from "vitest";
import { matchesLocationQuery } from "../lib/location-search.js";

const gachibowli = {
  area: "Gachibowli",
  city: "Hyderabad",
  pincode: "500084",
  zoneName: "Hyderabad West",
  zoneCode: "HYD_WEST",
};

describe("location search", () => {
  it("matches area prefixes", () => {
    expect(matchesLocationQuery("gachi", { ...gachibowli, locality: "Gachibowli" })).toBe(true);
  });

  it("matches pincode", () => {
    expect(matchesLocationQuery("500084", gachibowli)).toBe(true);
  });

  it("rejects unrelated queries", () => {
    expect(matchesLocationQuery("miyapur", gachibowli)).toBe(false);
  });

  it("returns all locations for a blank query", () => {
    expect(matchesLocationQuery("", gachibowli)).toBe(true);
  });
});
