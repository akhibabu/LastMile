import { describe, expect, it } from "vitest";
import { TEST_EMAIL_SUBJECT, TEST_EMAIL_TEXT } from "../services/email/test-email.js";
import { testEmailSchema } from "../validators/notification.validators.js";

describe("Resend test email", () => {
  it("uses the required professional subject and body", () => {
    expect(TEST_EMAIL_SUBJECT).toBe("Last-Mile Delivery Tracker — Email Test");
    expect(TEST_EMAIL_TEXT).toContain("This is a test email from the Last-Mile Delivery Tracker.");
    expect(TEST_EMAIL_TEXT).toContain("Your Resend email integration is configured correctly.");
  });

  it("requires a valid recipient address", () => {
    expect(testEmailSchema.safeParse({ email: "not-an-email" }).success).toBe(false);
    expect(testEmailSchema.safeParse({ email: "test@example.com" }).success).toBe(true);
  });
});
