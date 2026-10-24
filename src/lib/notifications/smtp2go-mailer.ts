import { getEnvVar } from "../env";
import { Mailer, SendEmailOptions, SendEmailResult } from "./types";

export class Smtp2goMailer implements Mailer {
  private apiKey: string;
  private mailFrom: string;

  constructor(apiKey?: string, mailFrom?: string) {
    this.apiKey = apiKey || getEnvVar("SMTP2GO_API_KEY") || "";
    this.mailFrom = mailFrom || getEnvVar("MAIL_FROM") || "no-reply@docarch.ai";
  }

  async send(options: SendEmailOptions): Promise<SendEmailResult> {
    if (!this.apiKey) {
      return {
        success: false,
        error: "SMTP2GO API key is not configured. Configure SMTP2GO_API_KEY or switch to console mode.",
      };
    }

    try {
      const response = await fetch("https://api.smtp2go.com/v3/email/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Smtp2go-Api-Key": this.apiKey,
        },
        body: JSON.stringify({
          api_key: this.apiKey,
          sender: this.mailFrom,
          to: [options.to],
          subject: options.subject,
          html_body: options.html,
          text_body: options.text,
        }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok || (data && data.data && data.data.failed > 0)) {
        const errorMsg =
          data?.data?.error ||
          data?.error ||
          (data?.data?.failures && data.data.failures[0]) ||
          `SMTP2GO API error (${response.status} ${response.statusText})`;
        console.error(`[Smtp2goMailer Error] Failed to send email to ${options.to}:`, errorMsg);
        return {
          success: false,
          error: String(errorMsg),
        };
      }

      const messageId = data?.data?.email_id || data?.request_id || `smtp2go_${Date.now()}`;
      return {
        success: true,
        messageId,
      };
    } catch (err: any) {
      console.error(`[Smtp2goMailer Exception] Network error sending to ${options.to}:`, err);
      return {
        success: false,
        error: err.message || "Network error while connecting to SMTP2GO API",
      };
    }
  }
}
