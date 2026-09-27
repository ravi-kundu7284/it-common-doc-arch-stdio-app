import { NextRequest, NextResponse } from "next/server";
import { dbGetAuditLogs, dbFindUserById } from "@/lib/supabase";
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

    const logs = await dbGetAuditLogs(100);
    return NextResponse.json({ success: true, logs });
  } catch (error: any) {
    console.error("Admin audit logs error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to load audit logs" },
      { status: 500 }
    );
  }
}
