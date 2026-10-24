import { NextRequest, NextResponse } from "next/server";
import {
  dbFindUser,
  dbCreateUser,
  dbCreateSession,
  dbRecordAuditLog,
  dbCreateAuthToken,
  getLastDbError,
  isSupabaseConfigured,
} from "@/lib/supabase";
import { hashPassword, createSessionToken, generateSecureToken, hashToken } from "@/lib/crypto";
import { NotificationService } from "@/lib/notifications";
import { getClientIp } from "@/lib/rate-limit";

export const runtime = "edge";

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    const userAgent = req.headers.get("user-agent") || "Unknown Client";

    const body = await req.json();
    const {
      username,
      email,
      password,
      fullName,
      designation,
      firstName,
      lastName,
      phone,
      phoneCountryCode,
      avatarUrl,
      company,
      timezone,
      bio,
    } = body;

    // Check database connection configuration
    if (!isSupabaseConfigured() && process.env.NODE_ENV !== "test") {
      return NextResponse.json(
        {
          success: false,
          error:
            "Database connection is unconfigured on the server. Please configure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in your hosting environment (Cloudflare Pages / .env.local) to persist accounts to PostgreSQL.",
        },
        { status: 503 }
      );
    }

    // Validation
    if (!username || username.trim().length < 3) {
      return NextResponse.json(
        { success: false, error: "Username must be at least 3 characters long" },
        { status: 400 }
      );
    }

    if (!email || !email.includes("@")) {
      return NextResponse.json(
        { success: false, error: "Please provide a valid email address" },
        { status: 400 }
      );
    }

    if (!password || password.length < 8) {
      return NextResponse.json(
        {
          success: false,
          error: "Password must be at least 8 characters long for security",
        },
        { status: 400 }
      );
    }

    // Concurrently check if email or username already exists
    const [existingEmail, existingUser] = await Promise.all([
      dbFindUser(email),
      dbFindUser(username),
    ]);

    if (existingEmail) {
      return NextResponse.json(
        { success: false, error: "An account with this email already exists" },
        { status: 409 }
      );
    }

    if (existingUser) {
      return NextResponse.json(
        { success: false, error: "Username is already taken" },
        { status: 409 }
      );
    }

    // Hash password with unique PBKDF2 salt
    const { hash, salt } = await hashPassword(password);

    // Compute full name if first or last name provided
    const combinedName = [firstName?.trim(), lastName?.trim()].filter(Boolean).join(" ");
    const computedFullName = fullName?.trim() || combinedName || username.trim();

    let newUser;
    try {
      newUser = await dbCreateUser({
        username: username.trim(),
        email: email.trim().toLowerCase(),
        password_hash: hash,
        password_salt: salt,
        full_name: computedFullName,
        first_name: firstName?.trim() || null,
        last_name: lastName?.trim() || null,
        phone: phone?.trim() || null,
        phone_country_code: phoneCountryCode?.trim() || null,
        avatar_url: avatarUrl?.trim() || null,
        company: company?.trim() || null,
        timezone: timezone?.trim() || null,
        bio: bio?.trim() || null,
        designation: designation?.trim() || "Software Architect",
        role: "architect",
      });
    } catch (dbErr: any) {
      console.error("Registration database error:", dbErr);
      return NextResponse.json(
        {
          success: false,
          error: `Database error: ${dbErr?.message || "Failed to save user in PostgreSQL"}. Check your Supabase configuration or visit /api/db/health.`,
        },
        { status: 500 }
      );
    }

    if (!newUser || !newUser.id) {
      return NextResponse.json(
        {
          success: false,
          error: "Database error: Failed to create user account.",
        },
        { status: 500 }
      );
    }

    const sessionToken = await createSessionToken({
      userId: newUser.id,
      username: newUser.username,
      email: newUser.email,
      fullName: newUser.full_name,
      designation: newUser.designation,
      role: newUser.role,
    });

    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    // 1. Generate single-use email verification token (32-byte cryptographically secure random)
    const rawVerifyToken = generateSecureToken(32);
    const verifyTokenHash = await hashToken(rawVerifyToken);
    const verifyTokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 24 hours

    // Concurrently create session, auth token, and record audit log
    await Promise.allSettled([
      dbCreateSession({
        user_id: newUser.id,
        session_token: sessionToken,
        ip_address: ip,
        user_agent: userAgent,
        expires_at: expiresAt,
        is_active: true,
      }),
      dbCreateAuthToken({
        user_id: newUser.id,
        type: "email_verify",
        token_hash: verifyTokenHash,
        expires_at: verifyTokenExpiry,
      }),
      dbRecordAuditLog({
        user_id: newUser.id,
        action: "USER_REGISTERED",
        details: `Account registered for @${newUser.username} (${newUser.email})`,
        ip_address: ip,
        user_agent: userAgent,
      }),
    ]);

    // 2. Dispatch email verification link via NotificationService (non-blocking)
    const appBaseUrl =
      process.env.APP_BASE_URL ||
      req.headers.get("origin") ||
      "http://localhost:3000";
    const verificationLink = `${appBaseUrl.replace(/\/$/, "")}/verify-email?token=${rawVerifyToken}`;

    NotificationService.sendEmail(
      {
        to: newUser.email,
        template: "verify-email",
        priority: "security",
        userId: newUser.id,
        data: {
          name: newUser.full_name || newUser.username,
          verificationLink,
        },
      },
      true // async dispatch to not block signup response
    ).catch((mailErr) => {
      console.error("[Register] Failed to send verification email:", mailErr);
    });

    // Sanitize response
    const sanitized = {
      id: newUser.id,
      username: newUser.username,
      email: newUser.email,
      fullName: newUser.full_name,
      firstName: newUser.first_name,
      lastName: newUser.last_name,
      phone: newUser.phone,
      phoneCountryCode: newUser.phone_country_code,
      avatarUrl: newUser.avatar_url,
      company: newUser.company,
      timezone: newUser.timezone,
      bio: newUser.bio,
      designation: newUser.designation,
      role: newUser.role,
      emailVerifiedAt: newUser.email_verified_at || null,
      phoneVerifiedAt: newUser.phone_verified_at || null,
      notificationPrefs: newUser.notification_prefs || null,
      createdAt: newUser.created_at,
    };

    const response = NextResponse.json({
      success: true,
      message: "Account created successfully",
      user: sanitized,
    });

    // Set secure HTTP-only session cookie with encrypted token
    response.cookies.set("docarch_session", sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30, // 30 days
      path: "/",
    });

    response.cookies.set("docarch_user_id", newUser.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30,
      path: "/",
    });

    return response;
  } catch (error: any) {
    console.error("Register error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to create account" },
      { status: 500 }
    );
  }
}
