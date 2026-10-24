import { Mailer, SendEmailOptions, SendEmailResult } from "./types";

export class ConsoleMailer implements Mailer {
  constructor() {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "CRITICAL: ConsoleMailer cannot be used in production. Configure SMTP2GO_API_KEY and MAIL_FROM."
      );
    }
  }

  async send(options: SendEmailOptions): Promise<SendEmailResult> {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "CRITICAL: ConsoleMailer cannot be used in production. Configure SMTP2GO_API_KEY and MAIL_FROM."
      );
    }

    const messageId = `console_msg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    console.log("\n==================== [DEV CONSOLE MAILER] ====================");
    console.log(`To:        ${options.to}`);
    const bodyText = options.text || options.html || "";
    console.log(`Subject:   ${options.subject || "No Subject"}`);
    console.log(`Priority:  ${options.priority || "notification"}`);
    console.log(`MessageId: ${messageId}`);
    console.log("----------------------- Plaintext Body -----------------------");
    console.log(bodyText);

    // Scan and highlight any verification or reset URL
    const urlMatch = bodyText.match(/https?:\/\/[^\s]+/i);
    if (urlMatch) {
      console.log("---------------------- Action Link Detected -------------------");
      console.log(`🔗 ${urlMatch[0]}`);
    }
    console.log("==============================================================\n");

    return {
      success: true,
      messageId,
    };
  }
}
