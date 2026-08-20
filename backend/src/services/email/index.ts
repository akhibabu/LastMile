import { loadEnv, resendApiKey } from "../../config/env.js";
import { logger } from "../../config/logger.js";
import { DevEmailProvider } from "./dev.provider.js";
import { ResendEmailProvider } from "./resend.provider.js";
import { UnconfiguredEmailProvider } from "./unconfigured.provider.js";
import type { EmailProvider } from "./types.js";

export function createEmailProvider(): EmailProvider {
  const env = loadEnv();
  const apiKey = resendApiKey(env);

  if (apiKey) {
    logger.info("Email provider: Resend");
    return new ResendEmailProvider(apiKey, env.FROM_EMAIL, env.FROM_NAME);
  }

  if (env.NODE_ENV === "production") {
    logger.error("RESEND_API_KEY is missing in production. Emails will be recorded as FAILED.");
    return new UnconfiguredEmailProvider();
  }

  logger.info("Email provider: DEVELOPMENT fallback (emails are logged, not sent)");
  return new DevEmailProvider();
}

import { EmailService } from "./email.service.js";

export { EmailService };

export function createEmailService(): EmailService {
  return new EmailService(createEmailProvider());
}
