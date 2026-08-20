import { logger } from "../../config/logger.js";
import type { EmailMessage, EmailProvider, EmailSendResult } from "./types.js";

export class ResendEmailProvider implements EmailProvider {
  readonly name = "resend";

  constructor(
    private readonly apiKey: string,
    private readonly fromEmail: string,
    private readonly fromName: string,
  ) {}

  async send(message: EmailMessage): Promise<EmailSendResult> {
    const from = this.fromName ? `${this.fromName} <${this.fromEmail}>` : this.fromEmail;
    try {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from,
          to: [message.to],
          subject: message.subject,
          text: message.text,
          html: message.html ?? `<pre>${message.text}</pre>`,
        }),
      });

      const body = (await response.json()) as { id?: string; message?: string };
      if (!response.ok) {
        logger.error({ message: body.message }, "Resend email failed");
        return {
          ok: false,
          provider: this.name,
          error: body.message ?? "Resend request failed",
          devMode: false,
        };
      }

      return {
        ok: true,
        provider: this.name,
        messageId: body.id,
        devMode: false,
      };
    } catch (error) {
      const errMessage = error instanceof Error ? error.message : "Unknown email error";
      logger.error({ err: error }, "Resend email exception");
      return { ok: false, provider: this.name, error: errMessage, devMode: false };
    }
  }
}
