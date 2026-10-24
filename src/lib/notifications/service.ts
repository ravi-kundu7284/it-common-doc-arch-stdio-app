import { getEnvVar } from "../env";
import {
  Mailer,
  SmsSender,
  NotificationChannel,
  NotificationTemplateType,
  NotificationPriority,
  NotificationPreferences,
  DEFAULT_NOTIFICATION_PREFS,
  SendEmailOptions,
  SendEmailResult,
  SendOtpOptions,
  SendOtpResult,
  CheckOtpResult,
} from "./types";
import { Smtp2goMailer } from "./smtp2go-mailer";
import { ConsoleMailer } from "./console-mailer";
import { MessageCentralSmsSender } from "./message-central-sms";
import { ConsoleSmsSender } from "./console-sms";
import { guardEmailUsage, guardSmsUsage } from "./cost-guards";
import { dbLogNotification, dbFindUserById } from "../supabase";
import {
  renderVerifyEmailTemplate,
  renderPasswordResetTemplate,
  renderPasswordChangedTemplate,
  renderExportAlertTemplate,
  renderAuditAlertTemplate,
  renderAdrAlertTemplate,
} from "./templates";

class NotificationServiceImpl {
  private mailerInstance?: Mailer;
  private smsSenderInstance?: SmsSender;

  constructor() {}

  public getMailer(): Mailer {
    if (!this.mailerInstance) {
      this.mailerInstance = this.resolveMailer();
    }
    return this.mailerInstance;
  }

  public getSmsSender(): SmsSender {
    if (!this.smsSenderInstance) {
      this.smsSenderInstance = this.resolveSmsSender();
    }
    return this.smsSenderInstance;
  }

  private resolveMailer(): Mailer {
    const provider = getEnvVar("EMAIL_PROVIDER")?.toLowerCase();
    const hasSmtpKey = Boolean(getEnvVar("SMTP2GO_API_KEY"));

    if (provider === "smtp2go" || (provider !== "console" && hasSmtpKey)) {
      return new Smtp2goMailer();
    }
    return new ConsoleMailer();
  }

  private resolveSmsSender(): SmsSender {
    const provider = getEnvVar("SMS_PROVIDER")?.toLowerCase();
    const hasMcKey = Boolean(getEnvVar("MESSAGECENTRAL_CUSTOMER_ID") && getEnvVar("MESSAGECENTRAL_KEY"));

    if (provider === "messagecentral" || (provider !== "console" && hasMcKey)) {
      return new MessageCentralSmsSender();
    }
    return new ConsoleSmsSender();
  }

  /**
   * Check if a user has opted in for a given notification channel and event.
   * Security notifications (verify-email, password-reset, password-changed) are mandatory and always return true.
   */
  async shouldSendNotification(
    userId: string | undefined,
    channel: NotificationChannel,
    template: NotificationTemplateType
  ): Promise<boolean> {
    if (
      template === "verify-email" ||
      template === "password-reset" ||
      template === "password-changed"
    ) {
      return true;
    }

    if (!userId) return true;

    try {
      const user = await dbFindUserById(userId);
      if (!user) return true;

      const prefs: NotificationPreferences = {
        ...DEFAULT_NOTIFICATION_PREFS,
        ...(user.notification_prefs || {}),
      };

      if (channel === "email") {
        if (template === "export-alert") return prefs.email.export !== false;
        if (template === "audit-alert") return prefs.email.audit !== false;
        if (template === "adr-alert") return prefs.email.adr !== false;
      } else if (channel === "sms") {
        // SMS notifications require verified phone
        if (!user.phone_verified_at) return false;
        if (template === "export-alert") return Boolean(prefs.sms?.export);
        if (template === "audit-alert") return Boolean(prefs.sms?.audit);
        if (template === "adr-alert") return Boolean(prefs.sms?.adr);
      }
      return true;
    } catch {
      return true;
    }
  }

  /**
   * Dispatches an email with free-tier cost guards, preference checks, and retry with jitter.
   */
  async sendEmail(
    options: SendEmailOptions,
    asyncDispatch = false
  ): Promise<SendEmailResult> {
    const template = options.template || "generic-event";
    const priority = options.priority || "notification";

    // 1. Check user preferences
    const isOptedIn = await this.shouldSendNotification(options.userId, "email", template);
    if (!isOptedIn) {
      await dbLogNotification({
        user_id: options.userId || null,
        channel: "email",
        template,
        recipient: options.to,
        status: "dropped",
        error: "User opted out of this notification type in preferences",
      });
      return { success: true, dropped: true };
    }

    // 2. Check cost guards (hard caps and security priority)
    const guard = await guardEmailUsage(priority);
    if (!guard.allowed) {
      await dbLogNotification({
        user_id: options.userId || null,
        channel: "email",
        template,
        recipient: options.to,
        status: "dropped",
        error: guard.reason || "Quota limit exceeded",
      });
      return {
        success: false,
        dropped: true,
        error: guard.reason,
      };
    }

    // 3. Render template if html/subject/text not explicitly provided
    let effectiveSubject = options.subject || "";
    let effectiveHtml = options.html || "";
    let effectiveText = options.text || "";

    if (!effectiveHtml || !effectiveSubject || !effectiveText) {
      const appBaseUrl = getEnvVar("APP_BASE_URL") || "http://localhost:3000";
      const data = options.data || {};
      const ctx = {
        appBaseUrl,
        username: data.name || data.username,
        email: options.to,
        ...data,
      };

      if (template === "verify-email") {
        const token = data.token || (data.verificationLink ? data.verificationLink.split("token=")[1] : "");
        const t = renderVerifyEmailTemplate({ ...ctx, token });
        effectiveSubject = effectiveSubject || t.subject;
        effectiveHtml = effectiveHtml || t.html;
        effectiveText = effectiveText || t.text;
      } else if (template === "password-reset") {
        const token = data.token || (data.resetLink ? data.resetLink.split("token=")[1] : "");
        const t = renderPasswordResetTemplate({ ...ctx, token });
        effectiveSubject = effectiveSubject || t.subject;
        effectiveHtml = effectiveHtml || t.html;
        effectiveText = effectiveText || t.text;
      } else if (template === "password-changed") {
        const t = renderPasswordChangedTemplate(ctx);
        effectiveSubject = effectiveSubject || t.subject;
        effectiveHtml = effectiveHtml || t.html;
        effectiveText = effectiveText || t.text;
      } else if (template === "export-alert") {
        const t = renderExportAlertTemplate({
          ...ctx,
          projectName: data.projectName || "Architecture Package",
          format: data.format || "HTML",
        });
        effectiveSubject = effectiveSubject || t.subject;
        effectiveHtml = effectiveHtml || t.html;
        effectiveText = effectiveText || t.text;
      } else if (template === "audit-alert") {
        const t = renderAuditAlertTemplate({
          ...ctx,
          projectName: data.projectName || "Architecture Review",
          score: data.score || 100,
          findingsCount: data.totalFindings || data.criticalFindings || 0,
        });
        effectiveSubject = effectiveSubject || t.subject;
        effectiveHtml = effectiveHtml || t.html;
        effectiveText = effectiveText || t.text;
      } else if (template === "adr-alert") {
        const t = renderAdrAlertTemplate({
          ...ctx,
          projectName: data.projectName || "Architecture Workspace",
          adrTitle: data.adrTitle || "Architecture Decision",
          status: data.status || "PROPOSED",
        });
        effectiveSubject = effectiveSubject || t.subject;
        effectiveHtml = effectiveHtml || t.html;
        effectiveText = effectiveText || t.text;
      } else {
        effectiveSubject = effectiveSubject || "DocArch Notification";
        effectiveHtml = effectiveHtml || `<p>${data.message || "Notification from DocArch Studio"}</p>`;
        effectiveText = effectiveText || data.message || "Notification from DocArch Studio";
      }
    }

    const resolvedOptions: SendEmailOptions = {
      ...options,
      subject: effectiveSubject,
      html: effectiveHtml,
      text: effectiveText,
    };

    // Execution routine with exponential backoff & jitter
    const executeSend = async (): Promise<SendEmailResult> => {
      let result: SendEmailResult = { success: false };
      const maxRetries = priority === "security" ? 2 : 1;

      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        if (attempt > 0) {
          const jitter = Math.random() * 200;
          const delay = Math.pow(2, attempt) * 500 + jitter;
          await new Promise((r) => setTimeout(r, delay));
        }

        result = await this.getMailer().send(resolvedOptions);
        if (result.success) break;
      }

      await dbLogNotification({
        user_id: options.userId || null,
        channel: "email",
        template,
        recipient: options.to,
        status: result.success ? "sent" : "failed",
        provider_message_id: result.messageId || null,
        error: result.error || null,
      });

      return result;
    };

    if (asyncDispatch) {
      // Non-blocking background dispatch
      executeSend().catch((err) =>
        console.error(`[NotificationService] Background email dispatch error to ${options.to}:`, err)
      );
      return { success: true };
    }

    return executeSend();
  }

  /**
   * Dispatches phone OTP verification.
   * Note: OTP sends are NEVER retried automatically to prevent duplicate charges or spamming.
   */
  async sendOtp(options: SendOtpOptions): Promise<SendOtpResult> {
    const guard = await guardSmsUsage(options.userId, options.ip);
    if (!guard.allowed) {
      await dbLogNotification({
        user_id: options.userId || null,
        channel: "sms",
        template: "verify-phone-otp",
        recipient: options.phoneE164,
        status: "dropped",
        error: guard.reason || "SMS quota exceeded",
      });
      return {
        success: false,
        error: guard.reason,
      };
    }

    const result = await this.getSmsSender().sendOtp(options);

    await dbLogNotification({
      user_id: options.userId || null,
      channel: "sms",
      template: "verify-phone-otp",
      recipient: options.phoneE164,
      status: result.success ? "sent" : "failed",
      provider_message_id: result.verificationId || null,
      error: result.error || null,
    });

    return result;
  }

  /**
   * Validates received OTP code against verification ID.
   */
  async checkOtp(
    verificationIdOrPhone: string,
    code: string,
    phoneOrVerificationId?: string
  ): Promise<CheckOtpResult> {
    let verificationId = verificationIdOrPhone;
    let phoneE164 = phoneOrVerificationId;
    if (verificationIdOrPhone.startsWith("+") || /^\d{10,}$/.test(verificationIdOrPhone)) {
      phoneE164 = verificationIdOrPhone;
      verificationId = phoneOrVerificationId || verificationIdOrPhone;
    }
    return this.getSmsSender().checkOtp(verificationId, code, phoneE164);
  }

  /**
   * Dispatches transactional SMS notification (if user opted in and phone verified).
   */
  async sendSms(
    phoneE164: string,
    body: string,
    template: NotificationTemplateType = "generic-event",
    dltTemplateId?: string,
    userId?: string,
    asyncDispatch = true
  ): Promise<SendEmailResult> {
    const isOptedIn = await this.shouldSendNotification(userId, "sms", template);
    if (!isOptedIn) {
      return { success: true, dropped: true };
    }

    const guard = await guardSmsUsage(userId);
    if (!guard.allowed) {
      await dbLogNotification({
        user_id: userId || null,
        channel: "sms",
        template,
        recipient: phoneE164,
        status: "dropped",
        error: guard.reason,
      });
      return { success: false, dropped: true, error: guard.reason };
    }

    const executeSend = async () => {
      const result = await this.getSmsSender().sendMessage(phoneE164, body, dltTemplateId, userId);
      await dbLogNotification({
        user_id: userId || null,
        channel: "sms",
        template,
        recipient: phoneE164,
        status: result.success ? "sent" : "failed",
        provider_message_id: result.messageId || null,
        error: result.error || null,
      });
      return result;
    };

    if (asyncDispatch) {
      executeSend().catch((err) =>
        console.error(`[NotificationService] Background SMS error to ${phoneE164}:`, err)
      );
      return { success: true };
    }

    return executeSend();
  }
}

export const NotificationService = new NotificationServiceImpl();
