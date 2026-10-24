import { NextRequest, NextResponse } from "next/server";
import {
  dbFindAuthTokenByHash,
  dbMarkAuthTokenUsed,
  dbVerifyUserEmail,
  dbRecordAuditLog,
} from "@/lib/supabase";
import { hashToken } from "@/lib/crypto";
import { getClientIp } from "@/lib/rate-limit";

export const runtime = "edge";

const GENERIC_ERROR = "Invalid or expired verification token. Please request a new verification email.";

async function processVerification(token: string | null | undefined, req: NextRequest) {
  const ip = getClientIp(req);
  const userAgent = req.headers.get("user-agent") || "Unknown Client";

  if (!token || typeof token !== "string" || token.trim().length === 0) {
    return { success: false, error: GENERIC_ERROR, status: 400 };
  }

  const tokenHash = await hashToken(token.trim());
  const record = await dbFindAuthTokenByHash(tokenHash, "email_verify");

  if (!record) {
    return { success: false, error: GENERIC_ERROR, status: 400 };
  }

  // Check if token is already used
  if (record.used_at) {
    return { success: false, error: GENERIC_ERROR, status: 400 };
  }

  // Check expiry
  if (new Date(record.expires_at).getTime() < Date.now()) {
    return { success: false, error: GENERIC_ERROR, status: 400 };
  }

  // Mark token used and verify user email
  await Promise.allSettled([
    dbVerifyUserEmail(record.user_id),
    dbMarkAuthTokenUsed(record.id),
    dbRecordAuditLog({
      user_id: record.user_id,
      action: "EMAIL_VERIFIED",
      details: "Email address verified successfully via single-use security token.",
      ip_address: ip,
      user_agent: userAgent,
    }),
  ]);

  return { success: true, message: "Your email address has been successfully verified." };
}

export async function GET(req: NextRequest) {
  try {
    const token = req.nextUrl.searchParams.get("token");
    const result = await processVerification(token, req);

    const acceptsHtml = req.headers.get("accept")?.includes("text/html");
    if (acceptsHtml) {
      const url = new URL("/verify-email", req.url);
      if (result.success) {
        url.searchParams.set("status", "success");
      } else {
        url.searchParams.set("status", "error");
        url.searchParams.set("error", encodeURIComponent(result.error || GENERIC_ERROR));
      }
      return NextResponse.redirect(url);
    }

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: result.status || 400 });
    }

    return NextResponse.json({ success: true, message: result.message });
  } catch (error: any) {
    console.error("GET verify-email error:", error);
    return NextResponse.json({ success: false, error: GENERIC_ERROR }, { status: 400 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const token = body?.token;
    const result = await processVerification(token, req);

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: result.status || 400 });
    }

    return NextResponse.json({ success: true, message: result.message });
  } catch (error: any) {
    console.error("POST verify-email error:", error);
    return NextResponse.json({ success: false, error: GENERIC_ERROR }, { status: 400 });
  }
}
