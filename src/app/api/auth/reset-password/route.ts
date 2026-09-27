import { NextRequest, NextResponse } from "next/server";
import { dbFindUserByResetToken, dbResetUserPassword, dbRecordAuditLog } from "@/lib/supabase";
import { hashPassword } from "@/lib/crypto";
import { getClientIp } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    const userAgent = req.headers.get("user-agent") || "Unknown Client";

    const body = await req.json();
    const { token, newPassword } = body;

    if (!token) {
      return NextResponse.json(
        { success: false, error: "Password reset token is required" },
        { status: 400 }
      );
    }

    if (!newPassword || newPassword.length < 8) {
      return NextResponse.json(
        { success: false, error: "New password must be at least 8 characters long" },
        { status: 400 }
      );
    }

    const user = await dbFindUserByResetToken(token);
    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid or expired password reset token. Please request a new link.",
        },
        { status: 400 }
      );
    }

    // Hash the new password with a fresh cryptographically random PBKDF2 salt
    const { hash, salt } = await hashPassword(newPassword);

    await dbResetUserPassword(user.id, hash, salt);

    await dbRecordAuditLog({
      user_id: user.id,
      action: "PASSWORD_RESET_SUCCESS",
      details: `Password reset successfully executed for @${user.username}. Account unlocked. IP: ${ip}`,
      ip_address: ip,
      user_agent: userAgent,
    });

    return NextResponse.json({
      success: true,
      message: "Your password has been successfully reset! You can now sign in with your new password.",
    });
  } catch (error: any) {
    console.error("Reset password error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to reset password" },
      { status: 500 }
    );
  }
}
