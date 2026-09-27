import { NextRequest, NextResponse } from "next/server";
import { dbFindUserById, dbGetUserAiConfig } from "@/lib/supabase";
import {
  verifySessionToken,
  deserializeAiConfigCookie,
  isExpired,
} from "@/lib/crypto";

export const runtime = "edge";

export async function GET(req: NextRequest) {
  try {
    const sessionCookie = req.cookies.get("docarch_session")?.value;
    const sessionData = await verifySessionToken(sessionCookie);

    const userIdCookie = req.cookies.get("docarch_user_id")?.value;
    const userIdHeader = req.headers.get("x-user-id");
    const userId = sessionData?.userId || userIdCookie || userIdHeader;

    if (!userId && !sessionData) {
      return NextResponse.json({
        authenticated: false,
        user: null,
        aiConfig: null,
      });
    }

    // Try finding user in Supabase or repository
    let user = userId ? await dbFindUserById(userId) : null;

    // If user not in database (e.g. edge isolate fallback), restore from verified session token
    if (!user && sessionData) {
      user = {
        id: sessionData.userId,
        username: sessionData.username,
        email: sessionData.email,
        full_name: sessionData.fullName,
        designation: sessionData.designation || "Software Architect",
        role: sessionData.role || "architect",
        created_at: new Date().toISOString(),
        last_login_at: new Date().toISOString(),
        password_hash: "",
        password_salt: "",
      };
    }

    if (!user) {
      return NextResponse.json({
        authenticated: false,
        user: null,
        aiConfig: null,
      });
    }

    // Retrieve active AI configuration (automatically purges if expired)
    let aiConfig = await dbGetUserAiConfig(user.id);

    // If not found in DB, check encrypted aiConfig cookie fallback
    if (!aiConfig) {
      const aiCookie = req.cookies.get("docarch_ai_config")?.value;
      const parsedConfig = await deserializeAiConfigCookie(aiCookie);
      if (parsedConfig && !isExpired(parsedConfig.expiresAt)) {
        aiConfig = {
          id: "cfg_cookie",
          user_id: user.id,
          provider: parsedConfig.provider,
          model_name: parsedConfig.modelName,
          encrypted_api_key: parsedConfig.encryptedApiKey,
          key_iv: parsedConfig.keyIv,
          key_auth_tag: parsedConfig.keyAuthTag,
          key_last4: parsedConfig.keyLast4,
          expires_at: parsedConfig.expiresAt,
          expires_in_days: parsedConfig.expiresInDays,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
      }
    }

    // Calculate days remaining
    let daysRemaining = null;
    let isKeyActive = false;

    if (aiConfig && aiConfig.expires_at) {
      const msLeft = new Date(aiConfig.expires_at).getTime() - Date.now();
      if (msLeft > 0) {
        daysRemaining = Math.ceil(msLeft / (1000 * 60 * 60 * 24));
        isKeyActive = true;
      }
    }

    return NextResponse.json({
      authenticated: true,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        fullName: user.full_name,
        designation: user.designation || "Software Architect",
        role: user.role,
        lastLoginAt: user.last_login_at,
      },
      aiConfig: aiConfig
        ? {
            provider: aiConfig.provider,
            modelName: aiConfig.model_name,
            keyLast4: aiConfig.key_last4,
            hasKey: Boolean(aiConfig.encrypted_api_key),
            expiresAt: aiConfig.expires_at,
            expiresInDays: aiConfig.expires_in_days,
            daysRemaining,
            isKeyActive,
          }
        : null,
    });
  } catch (error: any) {
    console.error("Auth me check error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to retrieve user session" },
      { status: 500 }
    );
  }
}
