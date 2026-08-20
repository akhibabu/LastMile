import { logger } from "../../config/logger.js";
import type { EmailMessage, EmailProvider, EmailSendResult } from "./types.js";

export class UnconfiguredEmailProvider implements EmailProvider {
  readonly name = "unconfigured";

  async send(message: EmailMessage): Promise<EmailSendResult> {
    logger.error(
      { to: message.to, subject: message.subject },
      "RESEND_API_KEY is not configured in production. Email was not sent.",
    );
    return {
      ok: false,
      provider: this.name,
      error: "Email is not configured: RESEND_API_KEY is missing",
      devMode: false,
    };
  }
}
