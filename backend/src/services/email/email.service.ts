import type { EmailMessage, EmailProvider, EmailSendResult } from "./types.js";

export class EmailService {
  constructor(private readonly provider: EmailProvider) {}

  send(message: EmailMessage): Promise<EmailSendResult> {
    return this.provider.send(message);
  }
}
