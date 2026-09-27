import { NextRequest, NextResponse } from "next/server";
import { dbFindUser, dbUpdateLastLogin } from "@/lib/supabase";
import { verifyPassword, createSessionToken } from "@/lib/crypto";

export const runtime = "edge";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { identifier, password } = body;

    if (!identifier || !password) {
      return NextResponse.json(
        { success: false, error: "Please enter your username/email and password" },
        { status: 400 }
      );
    }

    const user = await dbFindUser(identifier);
    if (!user) {
      return NextResponse.json(
        { success: false, error: "Invalid username or password" },
        { status: 401 }
      );
    }

    // Verify password with timing-safe PBKDF2 check
    const isValid = await verifyPassword(password, user.password_hash, user.password_salt);
    if (!isValid) {
      return NextResponse.json(
        { success: false, error: "Invalid username or password" },
        { status: 401 }
      );
    }

    // Update last login timestamp
    await dbUpdateLastLogin(user.id);

    // Sanitize user object
    const sanitized = {
      id: user.id,
      username: user.username,
      email: user.email,
      fullName: user.full_name,
      role: user.role,
      lastLoginAt: new Date().toISOString(),
    };

    const sessionToken = await createSessionToken({
      userId: user.id,
      username: user.username,
      email: user.email,
      fullName: user.full_name,
      role: user.role,
    });

    const response = NextResponse.json({
      success: true,
      message: "Sign in successful",
      user: sanitized,
    });

    // Set secure HTTP-only session cookie
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
