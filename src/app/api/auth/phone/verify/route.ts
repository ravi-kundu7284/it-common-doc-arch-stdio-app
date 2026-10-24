import { NextRequest, NextResponse } from "next/server";
import {
  dbFindPhoneVerification,
  dbIncrementPhoneVerificationAttempts,
  dbCompletePhoneVerification,
  dbVerifyUserPhone,
  dbRecordAuditLog,
} from "@/lib/supabase";
import { NotificationService } from "@/lib/notifications";
import { getAuthenticatedUser } from "@/lib/api-auth";
import { getClientIp } from "@/lib/rate-limit";

export const runtime = "edge";

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    const userAgent = req.headers.get("user-agent") || "Unknown Client";

    // 1. Authenticate user
    const authUser = await getAuthenticatedUser(req);
    if (!authUser?.userId || authUser.userId === "00000000-0000-0000-0000-000000000001") {
      return NextResponse.json(
        { success: false, error: "Authentication required." },
        { status: 401 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const { verificationId, code } = body;

    if (!verificationId || !code) {
      return NextResponse.json(
        { success: false, error: "Verification ID and OTP code are required." },
        { status: 400 }
      );
    }

    // 2. Fetch verification session record
    const record = await dbFindPhoneVerification(verificationId);
    if (!record || record.user_id !== authUser.userId) {
      return NextResponse.json(
        { success: false, error: "Verification session not found or invalid." },
        { status: 404 }
      );
    }

    if (record.status !== "pending") {
      return NextResponse.json(
        { success: false, error: "This verification code has already been processed or expired." },
        { status: 400 }
      );
    }

    // Check expiration (10 minutes)
    if (new Date(record.expires_at).getTime() < Date.now()) {
      await dbCompletePhoneVerification(record.id, "failed");
      return NextResponse.json(
        { success: false, error: "Verification code has expired. Please request a new one." },
        { status: 400 }
      );
    }

    // Check maximum attempts (5 attempts limit)
    if (record.attempts >= 5) {
      await dbCompletePhoneVerification(record.id, "failed");
      return NextResponse.json(
        {
          success: false,
          error: "Maximum verification attempts (5) exceeded. Please request a new verification code.",
        },
        { status: 400 }
      );
    }

    // Increment attempts count
    await dbIncrementPhoneVerificationAttempts(record.id);

    // 3. Verify OTP via NotificationService / SmsSender
    const verifyResult = await NotificationService.checkOtp(
      record.phone,
      String(code).trim(),
      record.provider_verification_id || undefined
    );

    if (!verifyResult.success) {
      const attemptsRemaining = Math.max(0, 5 - (record.attempts + 1));
      if (attemptsRemaining === 0) {
        await dbCompletePhoneVerification(record.id, "failed");
      }
      return NextResponse.json(
        {
          success: false,
          error:
            verifyResult.error ||
            `Incorrect verification code. (${attemptsRemaining} attempt${attemptsRemaining === 1 ? "" : "s"} remaining)`,
          attemptsRemaining,
        },
        { status: 400 }
      );
    }

    // 4. Mark session verified and persist phone + timestamp on user
    await Promise.all([
      dbCompletePhoneVerification(record.id, "verified"),
      dbVerifyUserPhone(record.user_id, record.phone),
      dbRecordAuditLog({
        user_id: record.user_id,
        action: "PHONE_VERIFIED",
        details: `Phone number ${record.phone} verified successfully via SMS OTP. IP: ${ip}`,
        ip_address: ip,
        user_agent: userAgent,
      }),
    ]);

    return NextResponse.json({
      success: true,
      phone: record.phone,
      message: "Phone number verified successfully! You can now opt in to SMS alerts.",
    });
  } catch (error: any) {
    console.error("Phone verify error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to verify phone code. Please try again." },
      { status: 500 }
    );
  }
}
