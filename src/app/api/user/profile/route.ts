import { NextRequest, NextResponse } from "next/server";
import {
  dbFindUserById,
  dbUpdateUserProfile,
  dbRecordAuditLog,
} from "@/lib/supabase";
import { verifySessionToken } from "@/lib/crypto";
import { getClientIp } from "@/lib/rate-limit";

export const runtime = "edge";

export async function GET(req: NextRequest) {
  try {
    const sessionCookie = req.cookies.get("docarch_session")?.value;
    const sessionData = await verifySessionToken(sessionCookie);

    const userIdCookie = req.cookies.get("docarch_user_id")?.value;
    const userIdHeader = req.headers.get("x-user-id");
    const userId = sessionData?.userId || userIdCookie || userIdHeader;

    if (!userId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const user = await dbFindUserById(userId);
    if (!user) {
      return NextResponse.json(
        { success: false, error: "User not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        fullName: user.full_name,
        firstName: user.first_name,
        lastName: user.last_name,
        phone: user.phone,
        phoneCountryCode: user.phone_country_code,
        avatarUrl: user.avatar_url,
        company: user.company,
        timezone: user.timezone,
        bio: user.bio,
        designation: user.designation,
        role: user.role,
        emailVerifiedAt: user.email_verified_at || null,
        phoneVerifiedAt: user.phone_verified_at || null,
        notificationPrefs: user.notification_prefs || null,
        lastLoginAt: user.last_login_at,
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || "Failed to fetch profile" },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    const userAgent = req.headers.get("user-agent") || "Unknown Client";

    const sessionCookie = req.cookies.get("docarch_session")?.value;
    const sessionData = await verifySessionToken(sessionCookie);

    const userIdCookie = req.cookies.get("docarch_user_id")?.value;
    const userIdHeader = req.headers.get("x-user-id");
    const userId = sessionData?.userId || userIdCookie || userIdHeader;

    if (!userId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized. Please sign in to update profile." },
        { status: 401 }
      );
    }

    const body = await req.json();
    const {
      firstName,
      lastName,
      fullName,
      phone,
      phoneCountryCode,
      avatarUrl,
      company,
      timezone,
      bio,
      designation,
    } = body;

    const combinedName = [firstName?.trim(), lastName?.trim()].filter(Boolean).join(" ");
    const computedFullName = fullName?.trim() || combinedName || undefined;

    const updated = await dbUpdateUserProfile(userId, {
      full_name: computedFullName,
      first_name: firstName !== undefined ? firstName?.trim() || null : undefined,
      last_name: lastName !== undefined ? lastName?.trim() || null : undefined,
      phone: phone !== undefined ? phone?.trim() || null : undefined,
      phone_country_code: phoneCountryCode !== undefined ? phoneCountryCode?.trim() || null : undefined,
      avatar_url: avatarUrl !== undefined ? avatarUrl?.trim() || null : undefined,
      company: company !== undefined ? company?.trim() || null : undefined,
      timezone: timezone !== undefined ? timezone?.trim() || null : undefined,
      bio: bio !== undefined ? bio?.trim() || null : undefined,
      designation: designation !== undefined ? designation?.trim() || null : undefined,
    });

    if (!updated) {
      return NextResponse.json(
        { success: false, error: "Failed to update user profile." },
        { status: 500 }
      );
    }

    await dbRecordAuditLog({
      user_id: userId,
      action: "PROFILE_UPDATED",
      details: `Profile updated for @${updated.username}`,
      ip_address: ip,
      user_agent: userAgent,
    });

    return NextResponse.json({
      success: true,
      message: "Profile updated successfully",
      user: {
        id: updated.id,
        username: updated.username,
        email: updated.email,
        fullName: updated.full_name,
        firstName: updated.first_name,
        lastName: updated.last_name,
        phone: updated.phone,
        phoneCountryCode: updated.phone_country_code,
        avatarUrl: updated.avatar_url,
        company: updated.company,
        timezone: updated.timezone,
        bio: updated.bio,
        designation: updated.designation,
        role: updated.role,
        emailVerifiedAt: updated.email_verified_at || null,
        phoneVerifiedAt: updated.phone_verified_at || null,
        notificationPrefs: updated.notification_prefs || null,
        lastLoginAt: updated.last_login_at,
      },
    });
  } catch (err: any) {
    console.error("Profile update error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to update profile" },
      { status: 500 }
    );
  }
}

