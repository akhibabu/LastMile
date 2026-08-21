import { Resend } from "resend";
import { logger } from "../../config/logger.js";
import type { EmailMessage, EmailProvider, EmailSendResult } from "./types.js";

function formatFrom(fromEmail: string, fromName: string): string {
  const email = fromEmail.trim();
  const name = fromName.trim();
  return name ? `${name} <${email}>` : email;
}

export class ResendEmailProvider implements EmailProvider {
  readonly name = "resend";
  private readonly client: Resend;
  private readonly from: string;

  constructor(apiKey: string, fromEmail: string, fromName: string) {
    this.client = new Resend(apiKey);
    this.from = formatFrom(fromEmail, fromName);
  }

  async send(message: EmailMessage): Promise<EmailSendResult> {
    try {
      const { data, error } = await this.client.emails.send({
        from: this.from,
        to: [message.to],
        subject: message.subject,
        text: message.text,
        html: message.html ?? `<pre>${message.text}</pre>`,
      });

      if (error) {
        logger.error({ provider: this.name, message: error.message }, "Resend email failed");
        return {
          ok: false,
          provider: this.name,
          error: error.message || "Resend request failed",
          devMode: false,
        };
      }

      return {
        ok: true,
        provider: this.name,
        messageId: data?.id,
        devMode: false,
      };
    } catch (error) {
      const errMessage = error instanceof Error ? error.message : "Unknown email error";
      logger.error({ provider: this.name, message: errMessage }, "Resend email exception");
      return { ok: false, provider: this.name, error: errMessage, devMode: false };
    }
  }
}
