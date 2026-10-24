import { getEnvVar } from "../env";
import {
  SmsSender,
  SendOtpOptions,
  SendOtpResult,
  CheckOtpResult,
  SendMessageResult,
} from "./types";

interface TokenCache {
  token: string;
  expiresAt: number;
}

let cachedAuthToken: TokenCache | null = null;

export class MessageCentralSmsSender implements SmsSender {
  private customerId: string;
  private key: string;
  private email: string;
  private senderId: string;
  private defaultCountryCode: string;
  private baseUrl = "https://cpaas.messagecentral.com";

  constructor() {
    this.customerId = getEnvVar("MESSAGECENTRAL_CUSTOMER_ID") || "";
    this.key = getEnvVar("MESSAGECENTRAL_KEY") || "";
    this.email = getEnvVar("MESSAGECENTRAL_EMAIL") || "";
    this.senderId = getEnvVar("MESSAGECENTRAL_SENDER_ID") || "DOCARC";
    this.defaultCountryCode = getEnvVar("MESSAGECENTRAL_COUNTRY_CODE") || "91";
  }

  /**
   * Fetches and caches Message Central temporary authentication token.
   * Cached for 50 minutes (tokens typically valid for 60 minutes).
   */
  private async getAuthToken(): Promise<string> {
    if (cachedAuthToken && Date.now() < cachedAuthToken.expiresAt) {
      return cachedAuthToken.token;
    }

    if (!this.customerId || !this.key) {
      throw new Error(
        "Message Central credentials not configured. Set MESSAGECENTRAL_CUSTOMER_ID and MESSAGECENTRAL_KEY."
      );
    }

    const params = new URLSearchParams({
      customerId: this.customerId,
      key: this.key,
      scope: "NEW",
      country: this.defaultCountryCode,
      email: this.email,
    });

    const url = `${this.baseUrl}/auth/v1/authentication/token?${params.toString()}`;
    const res = await fetch(url, {
      method: "GET",
      headers: { accept: "*/*" },
    });

    if (!res.ok) {
      throw new Error(`Message Central token generation failed: HTTP ${res.status}`);
    }

    const data = await res.json().catch(() => null);
    const token = data?.token || data?.data?.token;

    if (!token) {
      throw new Error(
        `Invalid token response from Message Central: ${JSON.stringify(data || {})}`
      );
    }

    // Cache for 50 minutes safely in memory
    cachedAuthToken = {
      token,
      expiresAt: Date.now() + 50 * 60 * 1000,
    };

    return token;
  }

  async sendOtp(options: SendOtpOptions): Promise<SendOtpResult> {
    try {
      const authToken = await this.getAuthToken();
      let cleanCountryCode = (options.countryCode || "").replace(/[^0-9]/g, "") || this.defaultCountryCode;
      let cleanMobile = (options.nationalNumber || "").replace(/[^0-9]/g, "");

      if (!cleanMobile && options.phoneE164) {
        const digits = options.phoneE164.replace(/[^0-9]/g, "");
        if (digits.startsWith("91") && digits.length === 12) {
          cleanCountryCode = "91";
          cleanMobile = digits.slice(2);
        } else if (digits.startsWith("1") && digits.length === 11) {
          cleanCountryCode = "1";
          cleanMobile = digits.slice(1);
        } else {
          cleanMobile = digits;
        }
      }

      const params = new URLSearchParams({
        countryCode: cleanCountryCode,
        flowType: "SMS",
        mobileNumber: cleanMobile,
        otpLength: "6",
      });

      if (this.customerId) {
        params.append("customerId", this.customerId);
      }

      const url = `${this.baseUrl}/verification/v3/send?${params.toString()}`;
      const response = await fetch(url, {
        method: "POST",
        headers: {
          authToken,
          accept: "*/*",
        },
      });

      const data = await response.json().catch(() => null);

      if (!response.ok || (data?.responseCode && data.responseCode !== 200 && data.responseCode !== "200")) {
        const errorMsg =
          data?.errorMessage ||
          data?.message ||
          data?.data?.errorMessage ||
          `SMS dispatch failed (${response.status})`;
        console.error("[MessageCentral Error] sendOtp failed:", errorMsg);
        return {
          success: false,
          error: String(errorMsg),
        };
      }

      const verificationId =
        data?.data?.verificationId || data?.verificationId || `mc_${Date.now()}`;

      return {
        success: true,
        verificationId,
      };
    } catch (err: any) {
      console.error("[MessageCentral Exception] sendOtp exception:", err);
      return {
        success: false,
        error: err.message || "Failed to dispatch SMS verification",
      };
    }
  }

  async checkOtp(
    verificationId: string,
    code: string,
    _phoneE164?: string
  ): Promise<CheckOtpResult> {
    try {
      const authToken = await this.getAuthToken();
      const params = new URLSearchParams({
        verificationId,
        code: code.trim(),
      });

      const url = `${this.baseUrl}/verification/v3/validateOtp?${params.toString()}`;
      const response = await fetch(url, {
        method: "GET",
        headers: {
          authToken,
          accept: "*/*",
        },
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        return {
          success: false,
          verified: false,
          error: data?.message || `Validation request failed with status ${response.status}`,
        };
      }

      const verificationStatus =
        data?.data?.verificationStatus || data?.verificationStatus || "";
      const isVerified = verificationStatus === "VERIFICATION_COMPLETED";

      if (!isVerified) {
        return {
          success: true,
          verified: false,
          error: data?.data?.errorMessage || "Invalid verification code",
        };
      }

      return {
        success: true,
        verified: true,
      };
    } catch (err: any) {
      console.error("[MessageCentral Exception] checkOtp exception:", err);
      return {
        success: false,
        verified: false,
        error: err.message || "Error validating OTP code",
      };
    }
  }

  async sendMessage(
    phoneE164: string,
    body: string,
    _dltTemplateId?: string,
    _userId?: string
  ): Promise<SendMessageResult> {
    try {
      const authToken = await this.getAuthToken();
      const cleanPhone = phoneE164.replace(/[^0-9]/g, "");

      const payload = {
        flowType: "SMS",
        type: "SMS",
        mobileNumber: cleanPhone,
        countryCode: cleanPhone.startsWith("91") ? "91" : this.defaultCountryCode,
        senderId: this.senderId,
        messageType: "TRANSACTION",
        message: body,
      };

      const response = await fetch(`${this.baseUrl}/verification/v3/send`, {
        method: "POST",
        headers: {
          authToken,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        return {
          success: false,
          error: data?.message || `Failed to send SMS message (HTTP ${response.status})`,
        };
      }

      return {
        success: true,
        messageId: data?.data?.messageId || data?.messageId || `msg_${Date.now()}`,
      };
    } catch (err: any) {
      return {
        success: false,
        error: err.message || "Failed to dispatch SMS notification",
      };
    }
  }
}
