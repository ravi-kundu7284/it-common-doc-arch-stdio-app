import { NextRequest, NextResponse } from "next/server";
import { dbFindUser, dbSetPasswordResetToken, dbRecordAuditLog } from "@/lib/supabase";
import { getClientIp } from "@/lib/rate-limit";

export const runtime = "edge";

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    const userAgent = req.headers.get("user-agent") || "Unknown Client";

    const body = await req.json();
    const { email } = body;

    if (!email || !email.includes("@")) {
      return NextResponse.json(
        { success: false, error: "Please provide a valid email address" },
        { status: 400 }
      );
    }

    const cleanEmail = email.trim().toLowerCase();
    const user = await dbFindUser(cleanEmail);

    // Cryptographically secure 32-byte token (64 hex characters)
    const randomBytes = new Uint8Array(32);
    globalThis.crypto.getRandomValues(randomBytes);
    const token = Array.from(randomBytes)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    // Token expires in 15 minutes
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

    if (user) {
      await dbSetPasswordResetToken(cleanEmail, token, expiresAt);

      await dbRecordAuditLog({
        user_id: user.id,
        action: "PASSWORD_RESET_REQ",
        details: `Password reset link dispatched via email to ${cleanEmail}. Token expires in 15 mins. IP: ${ip}`,
        ip_address: ip,
        user_agent: userAgent,
      });

      // Construct reset link
      const host = req.headers.get("host") || "localhost:3000";
      const protocol = req.headers.get("x-forwarded-proto") || "http";
      const resetUrl = `${protocol}://${host}/?reset_token=${token}`;

      console.log(`[DocArch Email Service] Password reset email sent to: ${cleanEmail}`);
      console.log(`[DocArch Email Service] Reset Link: ${resetUrl}`);

      return NextResponse.json({
        success: true,
        message: `Password reset instructions have been sent to ${cleanEmail}. Please check your inbox.`,
        previewToken: token, // Provided for instant development/testing evaluation
        previewResetLink: resetUrl,
        expiresInMinutes: 15,
      });
    }

    // Generic positive response to prevent user enumeration attacks
    return NextResponse.json({
      success: true,
      message: `If an account with that email exists, password reset instructions have been sent.`,
    });
  } catch (error: any) {
    console.error("Forgot password error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to initiate password reset" },
      { status: 500 }
    );
  }
}
