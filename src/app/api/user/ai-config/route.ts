import { NextRequest, NextResponse } from "next/server";
import {
  dbGetUserAiConfig,
  dbSaveUserAiConfig,
  dbDeleteUserAiConfig,
} from "@/lib/supabase";
import {
  encryptApiKey,
  calculateExpirationDate,
  verifySessionToken,
  serializeAiConfigCookie,
} from "@/lib/crypto";

export const runtime = "edge";

export async function POST(req: NextRequest) {
  try {
    const sessionCookie = req.cookies.get("docarch_session")?.value;
    const sessionData = await verifySessionToken(sessionCookie);

    const userIdCookie = req.cookies.get("docarch_user_id")?.value;
    const userIdHeader = req.headers.get("x-user-id");
    const userId = sessionData?.userId || userIdCookie || userIdHeader;

    if (!userId) {
      return NextResponse.json(
        { success: false, error: "Authentication required to configure AI keys" },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { provider, modelName, apiKey, expiresInDays } = body;

    const selectedProvider = provider || "openai";
    let selectedModel = modelName?.trim();
    if (selectedProvider === "openai") {
      if (!selectedModel || selectedModel.toLowerCase().includes("gemini")) {
        selectedModel = "gpt-4o";
      }
    } else if (selectedProvider === "gemini") {
      if (!selectedModel || selectedModel.toLowerCase().includes("gpt")) {
        selectedModel = "gemini-1.5-pro";
      }
    } else if (!selectedModel) {
      selectedModel = "gpt-4o";
    }
    const validDays = Number(expiresInDays) || 30;

    let encryptedData = null;
    let expiresAt = null;

    if (apiKey && apiKey.trim().length > 0) {
      // 1. Encrypt API key at rest with AES-256-GCM
      encryptedData = await encryptApiKey(apiKey.trim());

      // 2. Compute expiration date based on user selection
      expiresAt = calculateExpirationDate(validDays);
    }

    // Save to PostgreSQL via Supabase repository
    const saved = await dbSaveUserAiConfig({
      user_id: userId,
      provider: selectedProvider,
      model_name: selectedModel,
      encrypted_api_key: encryptedData?.encryptedKey || null,
      key_iv: encryptedData?.iv || null,
      key_auth_tag: encryptedData?.authTag || null,
      key_last4: encryptedData?.last4 || null,
      expires_at: expiresAt,
      expires_in_days: validDays,
    });

    const msLeft = expiresAt ? new Date(expiresAt).getTime() - Date.now() : 0;
    const daysRemaining = msLeft > 0 ? Math.ceil(msLeft / (1000 * 60 * 60 * 24)) : null;

    const response = NextResponse.json({
      success: true,
      message: `AI configuration saved. API key encrypted at rest and set to auto-expire in ${validDays} days.`,
      config: {
        provider: saved.provider,
        modelName: saved.model_name,
        keyLast4: saved.key_last4,
        hasKey: Boolean(saved.encrypted_api_key),
        expiresAt: saved.expires_at,
        expiresInDays: saved.expires_in_days,
        daysRemaining,
        isKeyActive: Boolean(daysRemaining && daysRemaining > 0),
      },
    });

    // Encrypt and persist config cookie
    const serializedCookie = await serializeAiConfigCookie({
      provider: saved.provider,
      modelName: saved.model_name,
      encryptedApiKey: saved.encrypted_api_key,
      keyIv: saved.key_iv,
      keyAuthTag: saved.key_auth_tag,
      keyLast4: saved.key_last4,
      expiresAt: saved.expires_at,
      expiresInDays: saved.expires_in_days,
    });

    response.cookies.set("docarch_ai_config", serializedCookie, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: validDays * 24 * 60 * 60,
      path: "/",
    });

    return response;
  } catch (error: any) {
    console.error("Save AI config error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to save AI configuration" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const sessionCookie = req.cookies.get("docarch_session")?.value;
    const sessionData = await verifySessionToken(sessionCookie);

    const userIdCookie = req.cookies.get("docarch_user_id")?.value;
    const userIdHeader = req.headers.get("x-user-id");
    const userId = sessionData?.userId || userIdCookie || userIdHeader;

    if (!userId) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 }
      );
    }

    await dbDeleteUserAiConfig(userId);

    const response = NextResponse.json({
      success: true,
      message: "AI configuration and API key permanently purged from records.",
    });

    response.cookies.set("docarch_ai_config", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      expires: new Date(0),
      path: "/",
    });

    return response;
  } catch (error: any) {
    console.error("Delete AI config error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to remove API key" },
      { status: 500 }
    );
  }
}
