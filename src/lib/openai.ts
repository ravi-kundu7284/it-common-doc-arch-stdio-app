import OpenAI from "openai";

export interface OpenAiConfig {
  apiKey?: string;
  modelName?: string;
  baseUrl?: string;
}

/**
 * Resolves the server-side OpenAI API key.
 * Prioritizes:
 * 1. Explicit key passed from server-side session decryption (Supabase / encrypted cookie)
 * 2. Process environment variable OPENAI_API_KEY
 */
export function resolveServerOpenAiKey(explicitKey?: string): string {
  if (explicitKey && explicitKey.trim().length > 0) {
    return explicitKey.trim();
  }
  return process.env.OPENAI_API_KEY?.trim() || "";
}

/**
 * Resolves the OpenAI model name.
 * Defaults to "gpt-4o", configurable via OPENAI_MODEL or user preferences.
 */
export function resolveServerOpenAiModel(explicitModel?: string): string {
  if (explicitModel && explicitModel.trim().length > 0) {
    const trimmed = explicitModel.trim();
    // Safety check: OpenAI API cannot execute Gemini or Claude models and rejects them with 404
    if (
      trimmed.toLowerCase().includes("gemini") ||
      trimmed.toLowerCase().includes("claude") ||
      trimmed.toLowerCase() === "builtin"
    ) {
      return process.env.OPENAI_MODEL?.trim() || "gpt-4o";
    }
    return trimmed;
  }
  return process.env.OPENAI_MODEL?.trim() || "gpt-4o";
}

/**
 * Instantiates the official OpenAI client.
 * Throws actionable error if no API key is provided.
 */
export function getOpenAiClient(config?: OpenAiConfig): OpenAI {
  const apiKey = resolveServerOpenAiKey(config?.apiKey);
  if (!apiKey) {
    const error = new Error("OPENAI_API_KEY is not configured on the server.");
    (error as any).code = "MISSING_API_KEY";
    throw error;
  }

  return new OpenAI({
    apiKey,
    baseURL: config?.baseUrl || process.env.OPENAI_BASE_URL || undefined,
    timeout: 60000, // 60s timeout for complex architecture generation
    maxRetries: 2,
  });
}

/**
 * Standardized error parser for OpenAI API errors.
 */
export function parseOpenAiError(err: any): {
  code: "MISSING_API_KEY" | "INVALID_API_KEY" | "QUOTA_EXCEEDED" | "RATE_LIMITED" | "OPENAI_ERROR";
  message: string;
  statusCode: number;
} {
  const status = err?.status || err?.statusCode || 500;
  const msg = err?.message || "An unknown error occurred during OpenAI generation.";

  if (err?.code === "MISSING_API_KEY" || !err?.code && msg.includes("OPENAI_API_KEY")) {
    return {
      code: "MISSING_API_KEY",
      message: "OpenAI API key is missing. Please configure OPENAI_API_KEY in .env.local or via Settings.",
      statusCode: 400,
    };
  }

  if (status === 401 || msg.includes("Incorrect API key") || msg.includes("invalid_api_key")) {
    return {
      code: "INVALID_API_KEY",
      message: "Invalid OpenAI API key. Please check your credentials in Settings or your environment configuration.",
      statusCode: 401,
    };
  }

  if (status === 429) {
    if (msg.includes("insufficient_quota") || msg.includes("quota")) {
      return {
        code: "QUOTA_EXCEEDED",
        message: "OpenAI quota exceeded. Please check your OpenAI account billing details and usage limits.",
        statusCode: 429,
      };
    }
    return {
      code: "RATE_LIMITED",
      message: "OpenAI API rate limit reached. Please wait a moment before trying again.",
      statusCode: 429,
    };
  }

  return {
    code: "OPENAI_ERROR",
    message: msg,
    statusCode: status >= 400 && status < 600 ? status : 500,
  };
}

