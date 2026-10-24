import { NextRequest, NextResponse } from "next/server";
import {
  dbFindUser,
  dbFindUserById,
  dbInvalidateAuthTokens,
  dbCreateAuthToken,
  dbRecordAuditLog,
} from "@/lib/supabase";
import { generateSecureToken, hashToken } from "@/lib/crypto";
import { NotificationService } from "@/lib/notifications";
import { getClientIp } from "@/lib/rate-limit";
import { getAuthenticatedUser } from "@/lib/api-auth";

export const runtime = "edge";

// In-memory rate limiting map for resend attempts (max 1 per 60s per key)
const resendRateLimitMap = new Map<string, number>();

function checkResendRateLimit(key: string, limitSeconds = 60): { allowed: boolean; retryAfter: number } {
  const now = Date.now();
  const lastTime = resendRateLimitMap.get(key);
  if (lastTime && now - lastTime < limitSeconds * 1000) {
    const retryAfter = Math.ceil((limitSeconds * 1000 - (now - lastTime)) / 1000);
    return { allowed: false, retryAfter };
  }
  resendRateLimitMap.set(key, now);

  // Periodic cleanup
  if (resendRateLimitMap.size > 1000) {
    resendRateLimitMap.forEach((timestamp, k) => {
      if (now - timestamp > limitSeconds * 1000) {
        resendRateLimitMap.delete(k);
      }
    });
  }

  return { allowed: true, retryAfter: 0 };
}

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    const userAgent = req.headers.get("user-agent") || "Unknown Client";

    const body = await req.json().catch(() => ({}));
    const emailParam = body?.email;

    // Check rate limit by IP
    const ipRate = checkResendRateLimit(`resend_ip_${ip}`, 60);
    if (!ipRate.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: `Please wait ${ipRate.retryAfter} seconds before requesting another verification email.`,
          retryAfter: ipRate.retryAfter,
        },
        { status: 429 }
      );
    }

    // Identify user: either via authenticated session or provided email
    let user = null;
    const authUser = await getAuthenticatedUser(req);
    if (authUser?.userId && authUser.userId !== "00000000-0000-0000-0000-000000000001") {
      user = await dbFindUserById(authUser.userId);
    }

    if (!user && emailParam && typeof emailParam === "string" && emailParam.includes("@")) {
      user = await dbFindUser(emailParam.trim().toLowerCase());
    }

    // Generic positive response to prevent user enumeration
    const genericResponse = {
      success: true,
      message:
        "If an unverified account is registered with this email, a verification link has been dispatched.",
    };

    if (!user) {
      return NextResponse.json(genericResponse);
    }

    // If user's email is already verified, do nothing and return generic response
    if (user.email_verified_at) {
      return NextResponse.json(genericResponse);
    }

    // Invalidate previous unused email_verify tokens for this user
    await dbInvalidateAuthTokens(user.id, "email_verify");

    // Generate fresh 32-byte token
    const rawToken = generateSecureToken(32);
    const tokenHash = await hashToken(rawToken);
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    await dbCreateAuthToken({
      user_id: user.id,
      type: "email_verify",
      token_hash: tokenHash,
      expires_at: expiresAt,
    });

    const appBaseUrl =
      process.env.APP_BASE_URL ||
      req.headers.get("origin") ||
      "http://localhost:3000";
    const verificationLink = `${appBaseUrl.replace(/\/$/, "")}/verify-email?token=${rawToken}`;

    // Send verification email via NotificationService
    NotificationService.sendEmail(
      {
        to: user.email,
        template: "verify-email",
        priority: "security",
        userId: user.id,
        data: {
          name: user.full_name || user.username,
          verificationLink,
        },
      },
      true
    ).catch((err) => console.error("[ResendVerification] Email send failed:", err));

    await dbRecordAuditLog({
      user_id: user.id,
      action: "EMAIL_VERIFY_RESENT",
      details: `New verification link generated and emailed to ${user.email}. IP: ${ip}`,
      ip_address: ip,
      user_agent: userAgent,
    });

    return NextResponse.json({
      success: true,
      message: "A fresh verification link has been sent to your email address.",
    });
  } catch (error: any) {
    console.error("Resend verification error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to process verification request. Please try again later." },
      { status: 500 }
    );
  }
}
