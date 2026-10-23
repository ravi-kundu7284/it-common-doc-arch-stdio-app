import { NextRequest, NextResponse } from "next/server";

export const runtime = "edge";

export async function POST(req: NextRequest) {
  const response = NextResponse.json({
    success: true,
    message: "Signed off successfully",
  });

  // Clear session and AI config cookies
  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    expires: new Date(0),
    path: "/",
  };

  response.cookies.set("docarch_session", "", cookieOptions);
  response.cookies.set("docarch_user_id", "", cookieOptions);
  response.cookies.set("docarch_ai_config", "", cookieOptions);

  return response;
}
