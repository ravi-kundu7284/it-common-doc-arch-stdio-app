import { NextRequest, NextResponse } from "next/server";
import { parsePhoneNumberFromString, CountryCode } from "libphonenumber-js";
import {
  dbFindUserById,
  dbCreatePhoneVerification,
  dbRecordAuditLog,
} from "@/lib/supabase";
import { NotificationService } from "@/lib/notifications";
import { getAuthenticatedUser } from "@/lib/api-auth";
import { getClientIp } from "@/lib/rate-limit";
import { getEnvVar } from "@/lib/env";

export const runtime = "edge";

// Cooldown tracking per user (60 seconds)
const userSmsCooldownMap = new Map<string, number>();

async function verifyTurnstile(token: string, ip: string): Promise<boolean> {
  const secretKey = getEnvVar("TURNSTILE_SECRET_KEY");
  if (!secretKey) return true; // Turnstile not configured, bypass

  try {
    const formData = new URLSearchParams();
    formData.append("secret", secretKey);
    formData.append("response", token);
    formData.append("remoteip", ip);

    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      body: formData,
    });
    const data = await res.json();
    return Boolean(data.success);
  } catch (err) {
    console.error("Turnstile verification error:", err);
    return false;
  }
}

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    const userAgent = req.headers.get("user-agent") || "Unknown Client";

    // 1. Authenticate user
    const authUser = await getAuthenticatedUser(req);
    if (!authUser?.userId || authUser.userId === "00000000-0000-0000-0000-000000000001") {
      return NextResponse.json(
        { success: false, error: "Authentication required to configure phone verification." },
        { status: 401 }
      );
    }

    const user = await dbFindUserById(authUser.userId);
    if (!user) {
      return NextResponse.json(
        { success: false, error: "User account not found." },
        { status: 404 }
      );
    }

    // 2. Email verification requirement check
    if (!user.email_verified_at) {
      return NextResponse.json(
        {
          success: false,
          error: "Email verification is required before initiating SMS phone verification.",
          requiresEmailVerification: true,
        },
        { status: 403 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const { phone, countryCode, captchaToken } = body;

    if (!phone || typeof phone !== "string") {
      return NextResponse.json(
        { success: false, error: "Please enter a valid phone number." },
        { status: 400 }
      );
    }

    // 3. CAPTCHA verification (if configured)
    const turnstileSecret = getEnvVar("TURNSTILE_SECRET_KEY");
    if (turnstileSecret) {
      if (!captchaToken) {
        return NextResponse.json(
          { success: false, error: "Security check (CAPTCHA) required." },
          { status: 400 }
        );
      }
      const isCaptchaValid = await verifyTurnstile(captchaToken, ip);
      if (!isCaptchaValid) {
        return NextResponse.json(
          { success: false, error: "Security check failed. Please refresh and try again." },
          { status: 400 }
        );
      }
    }

    // 4. E.164 Phone Normalization
    const defaultCountry = (countryCode || "IN").toUpperCase() as CountryCode;
    const parsedNumber = parsePhoneNumberFromString(phone, defaultCountry);

    if (!parsedNumber || !parsedNumber.isValid()) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Invalid phone number format. Please ensure you provide a valid mobile number with country code.",
        },
        { status: 400 }
      );
    }

    const phoneE164 = parsedNumber.number; // e.g. +919876543210

    // 5. 60-Second Resend Cooldown
    const now = Date.now();
    const lastSendTime = userSmsCooldownMap.get(user.id);
    if (lastSendTime && now - lastSendTime < 60 * 1000) {
      const waitSeconds = Math.ceil((60 * 1000 - (now - lastSendTime)) / 1000);
      return NextResponse.json(
        {
          success: false,
          error: `Please wait ${waitSeconds} seconds before requesting a new SMS verification code.`,
          retryAfter: waitSeconds,
        },
        { status: 429 }
      );
    }

    // 6. Send OTP via SmsSender / NotificationService (applies cost guards internally)
    const otpResult = await NotificationService.sendOtp({
      phoneE164,
      userId: user.id,
      ip,
      countryCode: String(parsedNumber.countryCallingCode),
    });

    if (!otpResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: otpResult.error || "Failed to send verification SMS. Please try again later.",
        },
        { status: 400 }
      );
    }

    // Update cooldown
    userSmsCooldownMap.set(user.id, now);

    // 7. Store verification session (10 minute expiry, 0 attempts)
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
    const verificationRecord = await dbCreatePhoneVerification({
      user_id: user.id,
      phone: phoneE164,
      provider_verification_id: otpResult.verificationId || null,
      status: "pending",
      attempts: 0,
      expires_at: expiresAt,
    });

    await dbRecordAuditLog({
      user_id: user.id,
      action: "PHONE_OTP_SENT",
      details: `SMS verification OTP dispatched to ${phoneE164}. Verification ID: ${verificationRecord.id}`,
      ip_address: ip,
      user_agent: userAgent,
    });

    return NextResponse.json({
      success: true,
      verificationId: verificationRecord.id,
      phone: phoneE164,
      expiresInMinutes: 10,
      message: "A 6-digit verification code has been dispatched to your mobile phone.",
    });
  } catch (error: any) {
    console.error("Phone send error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to send verification code. Please try again." },
      { status: 500 }
    );
  }
}
