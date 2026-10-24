import { NextRequest, NextResponse } from "next/server";
import {
  dbFindUser,
  dbCreateAuthToken,
  dbInvalidateAuthTokens,
  dbRecordAuditLog,
} from "@/lib/supabase";
import { generateSecureToken, hashToken } from "@/lib/crypto";
import { NotificationService } from "@/lib/notifications";
import { getClientIp } from "@/lib/rate-limit";

export const runtime = "edge";

const UNIFIED_FORGOT_RESPONSE = {
  success: true,
  message:
    "If an account with that email exists, instructions to reset your password have been sent to your email.",
};

export async function POST(req: NextRequest) {
  const startTime = Date.now();
  try {
    const ip = getClientIp(req);
    const userAgent = req.headers.get("user-agent") || "Unknown Client";

    const body = await req.json().catch(() => ({}));
    const { email } = body;

    if (!email || typeof email !== "string" || !email.includes("@")) {
      return NextResponse.json(
        { success: false, error: "Please provide a valid email address" },
        { status: 400 }
      );
    }

    const cleanEmail = email.trim().toLowerCase();
    const user = await dbFindUser(cleanEmail);

    if (user) {
      // Invalidate any previous unused password_reset tokens for this user
      await dbInvalidateAuthTokens(user.id, "password_reset");

      // Generate single-use 32-byte cryptographically secure token
      const rawToken = generateSecureToken(32);
      const tokenHash = await hashToken(rawToken);
      // Valid for 30 minutes
      const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();

      await dbCreateAuthToken({
        user_id: user.id,
        type: "password_reset",
        token_hash: tokenHash,
        expires_at: expiresAt,
      });

      // Construct reset link
      const appBaseUrl =
        process.env.APP_BASE_URL ||
        req.headers.get("origin") ||
        "http://localhost:3000";
      const resetLink = `${appBaseUrl.replace(/\/$/, "")}/reset-password?token=${rawToken}`;

      // Dispatch password reset email (non-blocking)
      NotificationService.sendEmail(
        {
          to: cleanEmail,
          template: "password-reset",
          priority: "security",
          userId: user.id,
          data: {
            name: user.full_name || user.username,
            resetLink,
          },
        },
        true
      ).catch((err) => console.error("[ForgotPassword] Email send error:", err));

      await dbRecordAuditLog({
        user_id: user.id,
        action: "PASSWORD_RESET_REQ",
        details: `Password reset link dispatched via email to ${cleanEmail}. Token expires in 30 mins. IP: ${ip}`,
        ip_address: ip,
        user_agent: userAgent,
      });
    } else {
      // Timing equalizer to mitigate side-channel enumeration
      const dummyToken = generateSecureToken(32);
      await hashToken(dummyToken);
    }

    // Ensure timing parity to eliminate account enumeration side-channel
    const elapsed = Date.now() - startTime;
    if (elapsed < 120) {
      await new Promise((r) => setTimeout(r, 120 - elapsed));
    }

    return NextResponse.json(UNIFIED_FORGOT_RESPONSE);
  } catch (error: any) {
    console.error("Forgot password error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to initiate password reset" },
      { status: 500 }
    );
  }
}
