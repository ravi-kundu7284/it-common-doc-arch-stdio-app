import { NextRequest, NextResponse } from "next/server";
import { dbFindUser, dbCreateUser } from "@/lib/supabase";
import { hashPassword, createSessionToken } from "@/lib/crypto";

export const runtime = "edge";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { username, email, password, fullName } = body;

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
      role: "architect",
    });

    // Sanitize response
    const sanitized = {
      id: newUser.id,
      username: newUser.username,
      email: newUser.email,
      fullName: newUser.full_name,
      role: newUser.role,
      createdAt: newUser.created_at,
    };

    const sessionToken = await createSessionToken({
      userId: newUser.id,
      username: newUser.username,
      email: newUser.email,
      fullName: newUser.full_name,
      role: newUser.role,
    });

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
