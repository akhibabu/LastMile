import { logger } from "../../config/logger.js";
import type { EmailMessage, EmailProvider, EmailSendResult } from "./types.js";

export class DevEmailProvider implements EmailProvider {
  readonly name = "dev";

  async send(message: EmailMessage): Promise<EmailSendResult> {
    logger.info(
      {
        to: message.to,
        subject: message.subject,
        text: message.text,
      },
      "[DEV MODE EMAIL] External delivery disabled. Email logged only.",
    );
    return {
      ok: true,
      provider: this.name,
      messageId: `dev-${Date.now()}`,
      devMode: true,
    };
  }
}
