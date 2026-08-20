import { describe, expect, it } from "vitest";
import { loginSchema, registerSchema } from "../validators/auth.validators.js";

describe("auth validation", () => {
  it("rejects a client-supplied role on public signup", () => {
    const result = registerSchema.safeParse({
      name: "Rahul Sharma",
      email: "rahul@example.com",
      phone: "9876543210",
      password: "Secret123!",
      role: "ADMIN",
    });
    expect(result.success).toBe(false);
  });

  it("requires phone, a valid email, and a password of at least 8 characters", () => {
    expect(
      registerSchema.safeParse({
        name: "Rahul",
        email: "not-an-email",
        phone: "9876543210",
        password: "Secret123!",
      }).success,
    ).toBe(false);
    expect(
      registerSchema.safeParse({
        name: "Rahul Sharma",
        email: "rahul@example.com",
        password: "Secret123!",
      }).success,
    ).toBe(false);
    expect(
      registerSchema.safeParse({
        name: "Rahul Sharma",
        email: "rahul@example.com",
        phone: "9876543210",
        password: "short",
      }).success,
    ).toBe(false);
  });

  it("accepts a complete customer registration payload", () => {
    const result = registerSchema.safeParse({
      name: "Rahul Sharma",
      email: "Rahul@Example.com",
      phone: "9876543210",
      password: "Secret123!",
      address: "Gachibowli, Hyderabad",
      pincode: "500084",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.email).toBe("rahul@example.com");
    }
  });

  it("does not accept login without an email and password", () => {
    expect(loginSchema.safeParse({ email: "rahul@example.com" }).success).toBe(false);
    expect(loginSchema.safeParse({ email: "rahul@example.com", password: "Secret123!" }).success).toBe(true);
  });
});
