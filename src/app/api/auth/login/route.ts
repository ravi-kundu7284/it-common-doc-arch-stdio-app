import { NextRequest, NextResponse } from "next/server";
import {
  dbFindUser,
  dbRecordLoginSuccess,
  dbGetUserAiConfig,
  getLastDbError,
} from "@/lib/supabase";
import { verifyPassword, createSessionToken } from "@/lib/crypto";
import {
  getClientIp,
  checkIpRateLimit,
  checkUserLockout,
  recordFailedLogin,
} from "@/lib/rate-limit";

export const runtime = "edge";

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    const userAgent = req.headers.get("user-agent") || "Unknown Client";

    // 1. IP Throttle Check: Maximum 5 attempts per minute
    const ipCheck = checkIpRateLimit(ip);
    if (!ipCheck.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: `Rate limit exceeded: Maximum 5 login attempts per minute allowed. Please try again in ${ipCheck.retryAfterSeconds} seconds.`,
          retryAfterSeconds: ipCheck.retryAfterSeconds,
          isRateLimited: true,
        },
        { status: 429 }
      );
    }

    const body = await req.json();
    const { identifier, password } = body;

    if (!identifier || !password) {
      return NextResponse.json(
        { success: false, error: "Please enter your username/email and password" },
        { status: 400 }
      );
    }

    // 2. User Lookup
    const user = await dbFindUser(identifier);
    if (!user) {
      const dbErr = getLastDbError();
      if (dbErr) {
        return NextResponse.json(
          {
            success: false,
            error: `Database connection error: ${dbErr}. Check your Supabase configuration or visit /api/db/health.`,
          },
          { status: 503 }
        );
      }
      return NextResponse.json(
        { success: false, error: "Invalid username or password" },
        { status: 401 }
      );
    }

    // 3. User Lockout Check: 3 failed attempts = 2 minute wait
    const lockoutStatus = checkUserLockout(user);
    if (lockoutStatus.isLocked) {
      return NextResponse.json(
        {
          success: false,
          error: `Account is temporarily locked due to 3 consecutive failed login attempts. Please wait ${lockoutStatus.waitSeconds} seconds before trying again.`,
          isLocked: true,
          waitSeconds: lockoutStatus.waitSeconds,
        },
        { status: 423 } // 423 Locked
      );
    }

    // 4. Verify password with PBKDF2
    const isValid = await verifyPassword(password, user.password_hash, user.password_salt);
    if (!isValid) {
      const failedResult = await recordFailedLogin(user, ip, userAgent);

      if (failedResult.isLocked) {
        return NextResponse.json(
          {
            success: false,
            error: `Too many failed attempts! Account is now locked for 2 minutes. Please wait ${failedResult.waitSeconds} seconds.`,
            isLocked: true,
            waitSeconds: failedResult.waitSeconds,
          },
          { status: 423 }
        );
      }

      const attemptsRemaining = 3 - failedResult.attempts;
      return NextResponse.json(
        {
          success: false,
          error: `Invalid credentials. (Attempt ${failedResult.attempts} of 3 - ${attemptsRemaining} attempt${attemptsRemaining === 1 ? "" : "s"} left before 2-minute lockout).`,
          attempts: failedResult.attempts,
          attemptsRemaining,
        },
        { status: 401 }
      );
    }

    // 5. Generate Session Token & Track Active Session
    const sessionToken = await createSessionToken({
      userId: user.id,
      username: user.username,
      email: user.email,
      fullName: user.full_name,
      designation: user.designation,
      role: user.role,
    });

    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    // 6. Concurrently record login success and retrieve user's AI config
    const [_, aiConfig] = await Promise.all([
      dbRecordLoginSuccess(
        user.id,
        {
          user_id: user.id,
          session_token: sessionToken,
          ip_address: ip,
          user_agent: userAgent,
          expires_at: expiresAt,
          is_active: true,
        },
        {
          user_id: user.id,
          action: "LOGIN_SUCCESS",
          details: `Successful login for @${user.username} (${user.designation || user.role}). IP: ${ip}`,
          ip_address: ip,
          user_agent: userAgent,
        }
      ),
      dbGetUserAiConfig(user.id),
    ]);

    // Format AI config info if present
    let formattedAiConfig = null;
    if (aiConfig) {
      const msLeft = aiConfig.expires_at ? new Date(aiConfig.expires_at).getTime() - Date.now() : 0;
      formattedAiConfig = {
        provider: aiConfig.provider,
        modelName: aiConfig.model_name,
        keyLast4: aiConfig.key_last4 || null,
        hasKey: Boolean(aiConfig.encrypted_api_key),
        expiresAt: aiConfig.expires_at || null,
        expiresInDays: aiConfig.expires_in_days || 30,
        daysRemaining: msLeft > 0 ? Math.ceil(msLeft / (1000 * 60 * 60 * 24)) : null,
        isKeyActive: msLeft > 0,
      };
    }

    // 7. Sanitize user object for response
    const sanitized = {
      id: user.id,
      username: user.username,
      email: user.email,
      fullName: user.full_name,
      designation: user.designation || "Software Architect",
      role: user.role || "architect",
      lastLoginAt: new Date().toISOString(),
    };

    const response = NextResponse.json({
      success: true,
      message: "Sign in successful",
      user: sanitized,
      aiConfig: formattedAiConfig,
    });

    // 8. Set secure HTTP-only session cookie
    response.cookies.set("docarch_session", sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30, // 30 days
      path: "/",
    });

    response.cookies.set("docarch_user_id", user.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30,
      path: "/",
    });

    return response;
  } catch (error: any) {
    console.error("Login error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to sign in" },
      { status: 500 }
    );
  }
}
