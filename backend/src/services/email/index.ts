import { loadEnv, resendApiKey } from "../../config/env.js";
import { logger } from "../../config/logger.js";
import { DevEmailProvider } from "./dev.provider.js";
import { ResendEmailProvider } from "./resend.provider.js";
import { UnconfiguredEmailProvider } from "./unconfigured.provider.js";
import { EmailService } from "./email.service.js";
import type { EmailProvider } from "./types.js";

export { EmailService };

export function logEmailProviderStatus(env = loadEnv()) {
  if (resendApiKey(env)) {
    logger.info("Resend email provider configured.");
    return;
  }
  if (env.NODE_ENV === "production") {
    logger.error("RESEND_API_KEY is missing in production. Emails will be recorded as FAILED.");
    return;
  }
  logger.info("Resend email provider not configured. Development email logging is enabled.");
}

export function createEmailProvider(): EmailProvider {
  const env = loadEnv();
  const apiKey = resendApiKey(env);

  if (apiKey) {
    return new ResendEmailProvider(apiKey, env.FROM_EMAIL, env.FROM_NAME);
  }

  if (env.NODE_ENV === "production") {
    return new UnconfiguredEmailProvider();
  }

  return new DevEmailProvider();
}

export function createEmailService(): EmailService {
  return new EmailService(createEmailProvider());
}
