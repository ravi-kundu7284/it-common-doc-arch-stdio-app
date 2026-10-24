import { NextRequest, NextResponse } from "next/server";
import {
  dbFindAuthTokenByHash,
  dbMarkAuthTokenUsed,
  dbInvalidateAuthTokens,
  dbRevokeUserSessions,
  dbFindUserById,
  dbResetUserPassword,
  dbRecordAuditLog,
} from "@/lib/supabase";
import { hashPassword, hashToken } from "@/lib/crypto";
import { NotificationService } from "@/lib/notifications";
import { getClientIp } from "@/lib/rate-limit";

export const runtime = "edge";

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    const userAgent = req.headers.get("user-agent") || "Unknown Client";

    const body = await req.json().catch(() => ({}));
    const { token, newPassword } = body;

    if (!token || typeof token !== "string" || token.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: "Password reset token is required" },
        { status: 400 }
      );
    }

    if (!newPassword || typeof newPassword !== "string" || newPassword.length < 8) {
      return NextResponse.json(
        {
          success: false,
          error: "New password must be at least 8 characters long for security",
        },
        { status: 400 }
      );
    }

    // 1. Hash incoming token with SHA-256 and look up in auth_tokens
    const tokenHash = await hashToken(token.trim());
    const tokenRecord = await dbFindAuthTokenByHash(tokenHash, "password_reset");

    if (!tokenRecord) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid or expired password reset link. Please request a new one.",
        },
        { status: 400 }
      );
    }

    // Check if token already used
    if (tokenRecord.used_at) {
      return NextResponse.json(
        {
          success: false,
          error: "This password reset link has already been used. Please request a new one.",
        },
        { status: 400 }
      );
    }

    // Check if token expired
    if (new Date(tokenRecord.expires_at).getTime() < Date.now()) {
      return NextResponse.json(
        {
          success: false,
          error: "This password reset link has expired. Please request a new one.",
        },
        { status: 400 }
      );
    }

    // 2. Fetch target user
    const user = await dbFindUserById(tokenRecord.user_id);
    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: "Account associated with this token was not found.",
        },
        { status: 400 }
      );
    }

    // 3. Hash the new password with PBKDF2 (SHA-512) and fresh salt
    const { hash, salt } = await hashPassword(newPassword);

    // 4. Update password, mark token used, invalidate other reset tokens, revoke sessions
    await Promise.all([
      dbResetUserPassword(user.id, hash, salt),
      dbMarkAuthTokenUsed(tokenRecord.id),
      dbInvalidateAuthTokens(user.id, "password_reset"),
      dbRevokeUserSessions(user.id),
      dbRecordAuditLog({
        user_id: user.id,
        action: "PASSWORD_RESET_SUCCESS",
        details: `Password reset executed for @${user.username}. All active sessions revoked. IP: ${ip}`,
        ip_address: ip,
        user_agent: userAgent,
      }),
    ]);

    // 5. Dispatch "your password was changed" notification email (non-blocking)
    NotificationService.sendEmail(
      {
        to: user.email,
        template: "password-changed",
        priority: "security",
        userId: user.id,
        data: {
          name: user.full_name || user.username,
          time: new Date().toUTCString(),
          supportEmail: "support@docarch.ai",
        },
      },
      true
    ).catch((mailErr) => {
      console.error("[ResetPassword] Confirmation email error:", mailErr);
    });

    return NextResponse.json({
      success: true,
      message:
        "Your password has been successfully reset! All prior sessions have been revoked. You can now sign in with your new password.",
    });
  } catch (error: any) {
    console.error("Reset password error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to reset password" },
      { status: 500 }
    );
  }
}
