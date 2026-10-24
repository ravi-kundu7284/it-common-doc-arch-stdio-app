import {
  SmsSender,
  SendOtpOptions,
  SendOtpResult,
  CheckOtpResult,
  SendMessageResult,
} from "./types";

interface DevOtpEntry {
  code: string;
  phoneE164: string;
  createdAt: number;
}

const devOtpStore = new Map<string, DevOtpEntry>();

export class ConsoleSmsSender implements SmsSender {
  constructor() {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "CRITICAL: ConsoleSmsSender cannot be used in production. Configure Message Central credentials."
      );
    }
  }

  async sendOtp(options: SendOtpOptions): Promise<SendOtpResult> {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "CRITICAL: ConsoleSmsSender cannot be used in production. Configure Message Central credentials."
      );
    }

    // Generate deterministic/readable 6-digit test OTP
    const generatedOtp = Math.floor(100000 + Math.random() * 900000).toString();
    const verificationId = `dev_verif_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    devOtpStore.set(verificationId, {
      code: generatedOtp,
      phoneE164: options.phoneE164,
      createdAt: Date.now(),
    });

    console.log("\n=================== [DEV CONSOLE SMS OTP] ===================");
    console.log(`To Phone:       ${options.phoneE164}`);
    console.log(`Country Code:   +${options.countryCode}`);
    console.log(`VerificationId: ${verificationId}`);
    console.log(`🔑 OTP Code:    ${generatedOtp}`);
    console.log("=============================================================\n");

    return {
      success: true,
      verificationId,
    };
  }

  async checkOtp(
    verificationId: string,
    code: string,
    _phoneE164?: string
  ): Promise<CheckOtpResult> {
    if (process.env.NODE_ENV === "production") {
      throw new Error("CRITICAL: ConsoleSmsSender cannot be used in production.");
    }

    const entry = devOtpStore.get(verificationId);
    if (!entry) {
      return {
        success: true,
        verified: false,
        error: "Verification record expired or invalid",
      };
    }

    // Check code match (or universal test override 123456 in dev/test)
    const isMatch = entry.code === code.trim() || code.trim() === "123456";

    if (!isMatch) {
      return {
        success: true,
        verified: false,
        error: "Invalid OTP code",
      };
    }

    devOtpStore.delete(verificationId);
    return {
      success: true,
      verified: true,
    };
  }

  async sendMessage(
    phoneE164: string,
    body: string,
    _dltTemplateId?: string,
    _userId?: string
  ): Promise<SendMessageResult> {
    if (process.env.NODE_ENV === "production") {
      throw new Error("CRITICAL: ConsoleSmsSender cannot be used in production.");
    }

    const messageId = `console_sms_${Date.now()}`;
    console.log("\n================ [DEV CONSOLE SMS NOTIFICATION] ================");
    console.log(`To Phone:  ${phoneE164}`);
    console.log(`Body:      ${body}`);
    console.log(`MessageId: ${messageId}`);
    console.log("=================================================================\n");

    return {
      success: true,
      messageId,
    };
  }
}
