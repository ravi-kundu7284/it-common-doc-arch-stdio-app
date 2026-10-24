import { NextRequest, NextResponse } from "next/server";
import {
  dbFindUserById,
  dbUpdateUserNotificationPrefs,
  dbRecordAuditLog,
} from "@/lib/supabase";
import { getAuthenticatedUser } from "@/lib/api-auth";
import { getClientIp } from "@/lib/rate-limit";
import {
  NotificationPreferences,
  DEFAULT_NOTIFICATION_PREFS,
} from "@/lib/notifications/types";

export const runtime = "edge";

export async function GET(req: NextRequest) {
  try {
    const authUser = await getAuthenticatedUser(req);
    if (!authUser?.userId || authUser.userId === "00000000-0000-0000-0000-000000000001") {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const user = await dbFindUserById(authUser.userId);
    if (!user) {
      return NextResponse.json(
        { success: false, error: "User not found" },
        { status: 404 }
      );
    }

    const prefs: NotificationPreferences = {
      ...DEFAULT_NOTIFICATION_PREFS,
      ...(user.notification_prefs || {}),
    };

    return NextResponse.json({
      success: true,
      preferences: prefs,
      phoneVerified: Boolean(user.phone_verified_at),
      phone: user.phone || null,
      emailVerified: Boolean(user.email_verified_at),
      email: user.email,
    });
  } catch (err: any) {
    console.error("GET notifications error:", err);
    return NextResponse.json(
      { success: false, error: "Failed to fetch notification preferences" },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    const userAgent = req.headers.get("user-agent") || "Unknown Client";

    const authUser = await getAuthenticatedUser(req);
    if (!authUser?.userId || authUser.userId === "00000000-0000-0000-0000-000000000001") {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const user = await dbFindUserById(authUser.userId);
    if (!user) {
      return NextResponse.json(
        { success: false, error: "User not found" },
        { status: 404 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const { preferences } = body;

    if (!preferences || typeof preferences !== "object") {
      return NextResponse.json(
        { success: false, error: "Invalid notification preferences payload" },
        { status: 400 }
      );
    }

    // Merge preferences
    const currentPrefs: NotificationPreferences = {
      ...DEFAULT_NOTIFICATION_PREFS,
      ...(user.notification_prefs || {}),
    };

    const newPrefs: NotificationPreferences = {
      email: {
        ...currentPrefs.email,
        ...(preferences.email || {}),
      },
      sms: {
        ...currentPrefs.sms,
        ...(preferences.sms || {}),
      },
    };

    // If user has not verified phone, enforce SMS alerts stay disabled
    if (!user.phone_verified_at) {
      newPrefs.sms = {
        export: false,
        audit: false,
        adr: false,
      };
    }

    const updated = await dbUpdateUserNotificationPrefs(user.id, newPrefs);
    if (!updated) {
      return NextResponse.json(
        { success: false, error: "Failed to save preferences" },
        { status: 500 }
      );
    }

    await dbRecordAuditLog({
      user_id: user.id,
      action: "PREFS_UPDATED",
      details: "Notification preferences updated",
      ip_address: ip,
      user_agent: userAgent,
    });

    return NextResponse.json({
      success: true,
      preferences: newPrefs,
      message: "Notification preferences saved successfully.",
    });
  } catch (err: any) {
    console.error("PUT notifications error:", err);
    return NextResponse.json(
      { success: false, error: "Failed to update notification preferences" },
      { status: 500 }
    );
  }
}
