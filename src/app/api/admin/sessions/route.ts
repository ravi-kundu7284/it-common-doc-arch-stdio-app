import { NextRequest, NextResponse } from "next/server";
import {
  dbGetAllActiveSessions,
  dbRevokeSession,
  dbFindUserById,
  dbRecordAuditLog,
} from "@/lib/supabase";
import { verifySessionToken } from "@/lib/crypto";

async function verifyAdminAuth(req: NextRequest) {
  const sessionCookie = req.cookies.get("docarch_session")?.value;
  const sessionData = await verifySessionToken(sessionCookie);

  if (!sessionData) {
    return { authorized: false, error: "Authentication required", status: 401 };
  }

  const user = await dbFindUserById(sessionData.userId);
  const role = user?.role || sessionData.role;

  if (role !== "admin") {
    return {
      authorized: false,
      error: "Access denied. Administrator privileges required.",
      status: 403,
    };
  }

  return { authorized: true, admin: user || sessionData };
}

export async function GET(req: NextRequest) {
  try {
    const auth = await verifyAdminAuth(req);
    if (!auth.authorized) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }

    const sessions = await dbGetAllActiveSessions();
    return NextResponse.json({ success: true, sessions });
  } catch (error: any) {
    console.error("Admin sessions error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to load active sessions" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await verifyAdminAuth(req);
    if (!auth.authorized) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }

    const body = await req.json();
    const { token } = body;

    if (!token) {
      return NextResponse.json({ success: false, error: "Session token is required" }, { status: 400 });
    }

    await dbRevokeSession(token);
    await dbRecordAuditLog({
      action: "ADMIN_SESSION_TERMINATED",
      details: `Session revoked by Admin @${auth.admin?.username}`,
    });

    return NextResponse.json({
      success: true,
      message: "Session revoked successfully",
    });
  } catch (error: any) {
    console.error("Revoke session error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to revoke session" },
      { status: 500 }
    );
  }
}
