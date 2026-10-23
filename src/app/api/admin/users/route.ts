import { NextRequest, NextResponse } from "next/server";
import {
  dbGetAllUsers,
  dbFindUserById,
  dbUnlockUser,
  dbUpdateUserRole,
  dbDeleteUser,
  dbDeleteUserAiConfig,
  dbRecordAuditLog,
} from "@/lib/supabase";
import { verifySessionToken } from "@/lib/crypto";
import { getClientIp } from "@/lib/rate-limit";

export const runtime = "edge";

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

    const users = await dbGetAllUsers();

    // Sanitize user data for admin table (do not return password hashes)
    const sanitized = users.map((u) => {
      const now = Date.now();
      const isLocked = Boolean(u.locked_until && new Date(u.locked_until).getTime() > now);
      const remainingSeconds = isLocked
        ? Math.ceil((new Date(u.locked_until!).getTime() - now) / 1000)
        : 0;

      return {
        id: u.id,
        username: u.username,
        email: u.email,
        fullName: u.full_name,
        designation: u.designation || "Software Architect",
        role: u.role || "architect",
        failedAttempts: u.failed_login_attempts || 0,
        isLocked,
        lockWaitSeconds: remainingSeconds,
        lockedUntil: u.locked_until,
        createdAt: u.created_at,
        lastLoginAt: u.last_login_at,
      };
    });

    return NextResponse.json({ success: true, users: sanitized });
  } catch (error: any) {
    console.error("Admin get users error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to load users" },
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

    const ip = getClientIp(req);
    const body = await req.json();
    const { action, targetUserId, newRole } = body;

    if (!targetUserId) {
      return NextResponse.json(
        { success: false, error: "Target User ID is required" },
        { status: 400 }
      );
    }

    const targetUser = await dbFindUserById(targetUserId);

    if (action === "unlock") {
      await dbUnlockUser(targetUserId);
      await dbRecordAuditLog({
        user_id: targetUserId,
        action: "ADMIN_UNLOCK",
        details: `Account unlocked by Admin @${auth.admin?.username}. Failed attempts reset to 0. IP: ${ip}`,
        ip_address: ip,
      });

      return NextResponse.json({
        success: true,
        message: `Account @${targetUser?.username || targetUserId} has been unlocked successfully.`,
      });
    }

    if (action === "set_role") {
      if (!newRole || !["admin", "architect", "reviewer"].includes(newRole)) {
        return NextResponse.json({ success: false, error: "Invalid role" }, { status: 400 });
      }

      await dbUpdateUserRole(targetUserId, newRole);
      await dbRecordAuditLog({
        user_id: targetUserId,
        action: "ADMIN_ROLE_CHANGE",
        details: `Role updated to '${newRole}' by Admin @${auth.admin?.username}. IP: ${ip}`,
        ip_address: ip,
      });

      return NextResponse.json({
        success: true,
        message: `Role for @${targetUser?.username || targetUserId} updated to ${newRole}.`,
      });
    }

    if (action === "revoke_key") {
      await dbDeleteUserAiConfig(targetUserId);
      await dbRecordAuditLog({
        user_id: targetUserId,
        action: "ADMIN_KEY_PURGE",
        details: `AI credentials purged by Admin @${auth.admin?.username}. IP: ${ip}`,
        ip_address: ip,
      });

      return NextResponse.json({
        success: true,
        message: `AI credentials for user revoked and purged.`,
      });
    }

    if (action === "delete_user") {
      await dbDeleteUser(targetUserId);
      await dbRecordAuditLog({
        action: "ADMIN_USER_DELETED",
        details: `User @${targetUser?.username || targetUserId} permanently deleted by Admin @${auth.admin?.username}. IP: ${ip}`,
        ip_address: ip,
      });

      return NextResponse.json({
        success: true,
        message: `User account deleted permanently.`,
      });
    }

    return NextResponse.json({ success: false, error: "Unknown action" }, { status: 400 });
  } catch (error: any) {
    console.error("Admin user action error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to execute admin action" },
      { status: 500 }
    );
  }
}
