import { NextRequest } from "next/server";
import { verifySessionToken } from "./crypto";

export async function getAuthenticatedUser(req: NextRequest): Promise<{ userId: string; role?: string } | null> {
  const sessionCookie = req.cookies.get("docarch_session")?.value;
  if (sessionCookie) {
    const sessionData = await verifySessionToken(sessionCookie);
    if (sessionData?.userId) {
      return { userId: sessionData.userId, role: sessionData.role || "architect" };
    }
  }

  const userIdCookie = req.cookies.get("docarch_user_id")?.value;
  const userIdHeader = req.headers.get("x-user-id");
  const fallbackId = userIdCookie || userIdHeader;

  if (fallbackId) {
    return { userId: fallbackId, role: "architect" };
  }

  // Demo / local sandbox fallback
  return { userId: "00000000-0000-0000-0000-000000000001", role: "architect" };
}

