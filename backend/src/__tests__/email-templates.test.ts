import { describe, expect, it } from "vitest";
import { renderOrderEmail, statusLabel } from "../services/email/templates.js";

describe("order email templates", () => {
  it("renders a reusable out-for-delivery email", () => {
    const email = renderOrderEmail("ORDER_OUT_FOR_DELIVERY", {
      appName: "LastMile",
      customerName: "Asha",
      orderNumber: "ORD-1042",
      pickup: "Gachibowli, Hyderabad",
      drop: "Hitech City, Hyderabad",
    });

    expect(email.subject).toContain("ORD-1042");
    expect(email.subject.toLowerCase()).toContain("out for delivery");
    expect(email.text).toContain("Hello Asha");
    expect(email.text).toContain("Gachibowli, Hyderabad");
    expect(email.text).toContain("Hitech City, Hyderabad");
    expect(email.text).toContain("OUT FOR DELIVERY");
    expect(email.html).toContain("ORD-1042");
    expect(statusLabel("ORDER_OUT_FOR_DELIVERY")).toBe("OUT FOR DELIVERY");
  });
});
