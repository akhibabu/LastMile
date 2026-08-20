import { loadEnv } from "../../config/env.js";
import { logger } from "../../config/logger.js";
import { DevEmailProvider } from "./dev.provider.js";
import { ResendEmailProvider } from "./resend.provider.js";
import type { EmailProvider } from "./types.js";

export function createEmailProvider(): EmailProvider {
  const env = loadEnv();
  if (env.EMAIL_PROVIDER === "resend" && env.EMAIL_API_KEY) {
    logger.info("Email provider: Resend");
    return new ResendEmailProvider(env.EMAIL_API_KEY, env.FROM_EMAIL);
  }

  if (env.EMAIL_PROVIDER !== "dev") {
    logger.warn(
      { provider: env.EMAIL_PROVIDER },
      "Email credentials missing — falling back to DEV MODE logger",
    );
  } else {
    logger.info("Email provider: DEV MODE (emails are logged, not sent)");
  }

  return new DevEmailProvider();
}
