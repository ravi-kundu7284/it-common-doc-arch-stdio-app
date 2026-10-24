/**
 * Notification System Type Definitions
 */

export type NotificationChannel = "email" | "sms";

export type NotificationTemplateType =
  | "verify-email"
  | "password-reset"
  | "password-changed"
  | "export-alert"
  | "audit-alert"
  | "adr-alert"
  | "generic-event";

export type NotificationPriority = "security" | "notification";

export interface SendEmailOptions {
  to: string;
  subject?: string;
  html?: string;
  text?: string;
  data?: Record<string, any>;
  priority?: NotificationPriority;
  template?: NotificationTemplateType;
  userId?: string;
}

export interface SendEmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
  dropped?: boolean;
}

export interface Mailer {
  send(options: SendEmailOptions): Promise<SendEmailResult>;
}

export interface SendOtpOptions {
  phoneE164: string;
  countryCode?: string;
  nationalNumber?: string;
  userId?: string;
  ip?: string;
}

export interface SendOtpResult {
  success: boolean;
  verificationId?: string;
  error?: string;
}

export interface CheckOtpResult {
  success: boolean;
  verified: boolean;
  error?: string;
}

export interface SendMessageResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export interface SmsSender {
  sendOtp(options: SendOtpOptions): Promise<SendOtpResult>;
  checkOtp(
    verificationId: string,
    code: string,
    phoneE164?: string
  ): Promise<CheckOtpResult>;
  sendMessage(
    phoneE164: string,
    body: string,
    dltTemplateId?: string,
    userId?: string
  ): Promise<SendMessageResult>;
}

export interface NotificationPreferences {
  email: {
    verify: boolean;
    password_reset: boolean;
    export: boolean;
    audit: boolean;
    adr: boolean;
  };
  sms: {
    audit: boolean;
    adr: boolean;
    export: boolean;
  };
}

export const DEFAULT_NOTIFICATION_PREFS: NotificationPreferences = {
  email: {
    verify: true,
    password_reset: true,
    export: true,
    audit: true,
    adr: true,
  },
  sms: {
    audit: false,
    adr: false,
    export: false,
  },
};

export interface UsageCapsConfig {
  emailDailyCap: number;
  emailMonthlyCap: number;
  smsDailyCap: number;
  smsPerUserDailyCap: number;
  smsPerIpDailyCap: number;
}
