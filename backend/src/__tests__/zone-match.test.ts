import { describe, expect, it } from "vitest";
import { findAddressZoneConflict, normalizePincode } from "../lib/zone-match.js";

const areas = [
  { zoneId: "west", areaName: "Gachibowli", city: "Hyderabad", pincode: "500084" },
  { zoneId: "west", areaName: "Hitech City", city: "Hyderabad", pincode: "500081" },
  { zoneId: "central", areaName: "Abids", city: "Hyderabad", pincode: "500001" },
  { zoneId: "south", areaName: "Santoshnagar", city: "Hyderabad", pincode: "500018" },
];

describe("zone matching", () => {
  it("normalizes a 6-digit pincode", () => {
    expect(normalizePincode("500084")).toBe("500084");
    expect(normalizePincode(" 500084 ")).toBe("500084");
    expect(normalizePincode("pin 500081 hyd")).toBe("500081");
    expect(normalizePincode("18")).toBeNull();
  });

  it("does not flag Gachibowli with its own west-zone pincode", () => {
    expect(findAddressZoneConflict("Gachibowli, Hyderabad", "west", areas)).toBeNull();
  });

  it("flags Gachibowli when the pincode belongs to another zone", () => {
    const conflict = findAddressZoneConflict("Gachibowli, Hyderabad", "south", areas);
    expect(conflict?.areaName).toBe("Gachibowli");
  });

  it("flags Hitech City when paired with Santoshnagar pincode 500018", () => {
    const conflict = findAddressZoneConflict("Hitech City, Hyderabad", "south", areas);
    expect(conflict?.areaName).toBe("Hitech City");
  });
});
