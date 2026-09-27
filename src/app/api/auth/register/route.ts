import { NextRequest, NextResponse } from "next/server";
import { dbFindUser, dbCreateUser, dbCreateSession } from "@/lib/supabase";
import { hashPassword, createSessionToken } from "@/lib/crypto";
import { getClientIp } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    const userAgent = req.headers.get("user-agent") || "Unknown Client";

    const body = await req.json();
    const { username, email, password, fullName, designation } = body;

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

    // Check existing
    const existing = await dbFindUser(email);
    if (existing) {
      return NextResponse.json(
        { success: false, error: "An account with this email already exists" },
        { status: 409 }
      );
    }

    const existingUser = await dbFindUser(username);
    if (existingUser) {
      return NextResponse.json(
        { success: false, error: "Username is already taken" },
        { status: 409 }
      );
    }

    // Hash password with unique PBKDF2 salt
    const { hash, salt } = await hashPassword(password);

    const newUser = await dbCreateUser({
      username: username.trim(),
      email: email.trim().toLowerCase(),
      password_hash: hash,
      password_salt: salt,
      full_name: fullName || username,
      designation: designation || "Software Architect",
      role: "architect",
    });

    const sessionToken = await createSessionToken({
      userId: newUser.id,
      username: newUser.username,
      email: newUser.email,
      fullName: newUser.full_name,
      designation: newUser.designation,
      role: newUser.role,
    });

    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    await dbCreateSession({
      user_id: newUser.id,
      session_token: sessionToken,
      ip_address: ip,
      user_agent: userAgent,
      expires_at: expiresAt,
      is_active: true,
    });

    // Sanitize response
    const sanitized = {
      id: newUser.id,
      username: newUser.username,
      email: newUser.email,
      fullName: newUser.full_name,
      designation: newUser.designation,
      role: newUser.role,
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
