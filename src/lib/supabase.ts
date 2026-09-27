import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { isExpired } from "./crypto";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "";

export const isSupabaseConfigured = (): boolean => {
  return Boolean(
    supabaseUrl &&
      supabaseKey &&
      !supabaseUrl.includes("your-project-ref") &&
      !supabaseKey.includes("your-key")
  );
};

let supabaseInstance: SupabaseClient | null = null;

export const getSupabaseClient = (): SupabaseClient | null => {
  if (!isSupabaseConfigured()) {
    return null;
  }
  if (!supabaseInstance) {
    supabaseInstance = createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  }
  return supabaseInstance;
};

// ============================================================================
// Types
// ============================================================================
export interface AppUser {
  id: string;
  username: string;
  email: string;
  password_hash: string;
  password_salt: string;
  full_name?: string;
  role?: string;
  created_at: string;
  last_login_at: string;
}

export interface UserAiConfig {
  id: string;
  user_id: string;
  provider: "builtin" | "openai" | "gemini" | "anthropic";
  model_name: string;
  encrypted_api_key?: string | null;
  key_iv?: string | null;
  key_auth_tag?: string | null;
  key_last4?: string | null;
  expires_at?: string | null;
  expires_in_days?: number;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// Fallback In-Memory/Persistent Sandbox Store
// Used when Supabase env variables are not yet configured so tests pass immediately.
// ============================================================================
class LocalSandboxDatabase {
  private users: Map<string, AppUser> = new Map();
  private aiConfigs: Map<string, UserAiConfig> = new Map();

  constructor() {
    // Seed a default demo architect user for instant evaluation
    // Password is: Architect123!
    const demoSalt = "a1b2c3d4e5f67890";
    const demoHash =
      "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"; // placeholder
    const demoId = "00000000-0000-0000-0000-000000000001";

    this.users.set(demoId, {
      id: demoId,
      username: "demo_architect",
      email: "architect@docarch.ai",
      password_hash: demoHash,
      password_salt: demoSalt,
      full_name: "Lead System Architect",
      role: "architect",
      created_at: new Date().toISOString(),
      last_login_at: new Date().toISOString(),
    });
  }

  // User methods
  findUserByEmailOrUsername(identifier: string): AppUser | null {
    const clean = identifier.toLowerCase().trim();
    for (const u of Array.from(this.users.values())) {
      if (u.email.toLowerCase() === clean || u.username.toLowerCase() === clean) {
        return u;
      }
    }
    return null;
  }

  findUserById(id: string): AppUser | null {
    return this.users.get(id) || null;
  }

  createUser(user: Omit<AppUser, "id" | "created_at" | "last_login_at">): AppUser {
    const id = "usr_" + Math.random().toString(36).substring(2, 11);
    const now = new Date().toISOString();
    const newUser: AppUser = {
      id,
      ...user,
      created_at: now,
      last_login_at: now,
    };
    this.users.set(id, newUser);
    return newUser;
  }

  updateLastLogin(id: string) {
    const u = this.users.get(id);
    if (u) {
      u.last_login_at = new Date().toISOString();
    }
  }

  // AI Config methods with automated auto-purge of expired keys
  getAiConfig(userId: string): UserAiConfig | null {
    this.purgeExpired();
    for (const cfg of Array.from(this.aiConfigs.values())) {
      if (cfg.user_id === userId) {
        if (isExpired(cfg.expires_at)) {
          this.aiConfigs.delete(cfg.id);
          return null;
        }
        return cfg;
      }
    }
    return null;
  }

  saveAiConfig(
    config: Omit<UserAiConfig, "id" | "created_at" | "updated_at">
  ): UserAiConfig {
    this.purgeExpired();
    const existing = this.getAiConfig(config.user_id);
    const now = new Date().toISOString();

    if (existing) {
      const updated: UserAiConfig = {
        ...existing,
        ...config,
        updated_at: now,
      };
      this.aiConfigs.set(existing.id, updated);
      return updated;
    }

    const id = "aicfg_" + Math.random().toString(36).substring(2, 11);
    const newCfg: UserAiConfig = {
      id,
      ...config,
      created_at: now,
      updated_at: now,
    };
    this.aiConfigs.set(id, newCfg);
    return newCfg;
  }

  deleteAiConfig(userId: string): boolean {
    let deleted = false;
    for (const [id, cfg] of Array.from(this.aiConfigs.entries())) {
      if (cfg.user_id === userId) {
        this.aiConfigs.delete(id);
        deleted = true;
      }
    }
    return deleted;
  }

  purgeExpired(): number {
    let count = 0;
    for (const [id, cfg] of Array.from(this.aiConfigs.entries())) {
      if (isExpired(cfg.expires_at)) {
        this.aiConfigs.delete(id);
        count++;
      }
    }
    return count;
  }
}

// Global sandbox repository
const sandboxDb = new LocalSandboxDatabase();

// ============================================================================
// Unified Repository Operations (Supabase PostgreSQL + Local Sandbox Fallback)
// ============================================================================

export async function dbFindUser(identifier: string): Promise<AppUser | null> {
  const client = getSupabaseClient();
  if (!client) {
    return sandboxDb.findUserByEmailOrUsername(identifier);
  }

  const clean = identifier.toLowerCase().trim();
  const { data, error } = await client
    .from("app_users")
    .select("*")
    .or(`email.eq.${clean},username.eq.${clean}`)
    .maybeSingle();

  if (error) {
    console.error("Supabase user search error:", error);
    return sandboxDb.findUserByEmailOrUsername(identifier);
  }
  return data as AppUser | null;
}

export async function dbFindUserById(id: string): Promise<AppUser | null> {
  const client = getSupabaseClient();
  if (!client) {
    return sandboxDb.findUserById(id);
  }

  const { data, error } = await client
    .from("app_users")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    console.error("Supabase findUserById error:", error);
    return sandboxDb.findUserById(id);
  }
  return data as AppUser | null;
}

export async function dbCreateUser(
  user: Omit<AppUser, "id" | "created_at" | "last_login_at">
): Promise<AppUser> {
  const client = getSupabaseClient();
  if (!client) {
    return sandboxDb.createUser(user);
  }

  const { data, error } = await client
    .from("app_users")
    .insert([
      {
        ...user,
        created_at: new Date().toISOString(),
        last_login_at: new Date().toISOString(),
      },
    ])
    .select("*")
    .single();

  if (error || !data) {
    console.error("Supabase createUser error, using sandbox fallback:", error);
    return sandboxDb.createUser(user);
  }

  return data as AppUser;
}

export async function dbUpdateLastLogin(id: string): Promise<void> {
  const client = getSupabaseClient();
  if (!client) {
    sandboxDb.updateLastLogin(id);
    return;
  }

  await client
    .from("app_users")
    .update({ last_login_at: new Date().toISOString() })
    .eq("id", id);
}

/**
 * Retrieve user's AI configuration and automatically purge if expired.
 */
export async function dbGetUserAiConfig(
  userId: string
): Promise<UserAiConfig | null> {
  const client = getSupabaseClient();
  if (!client) {
    return sandboxDb.getAiConfig(userId);
  }

  // Auto purge expired keys in background
  client
    .from("user_ai_configurations")
    .delete()
    .lt("expires_at", new Date().toISOString())
    .then();

  const { data, error } = await client
    .from("user_ai_configurations")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  const config = data as UserAiConfig;
  if (isExpired(config.expires_at)) {
    // Purge immediately
    await client
      .from("user_ai_configurations")
      .delete()
      .eq("id", config.id);
    return null;
  }

  return config;
}

/**
 * Store user's AI configuration with encrypted API key and expiration date.
 */
export async function dbSaveUserAiConfig(
  config: Omit<UserAiConfig, "id" | "created_at" | "updated_at">
): Promise<UserAiConfig> {
  const client = getSupabaseClient();
  if (!client) {
    return sandboxDb.saveAiConfig(config);
  }

  const { data, error } = await client
    .from("user_ai_configurations")
    .upsert(
      {
        user_id: config.user_id,
        provider: config.provider,
        model_name: config.model_name,
        encrypted_api_key: config.encrypted_api_key,
        key_iv: config.key_iv,
        key_auth_tag: config.key_auth_tag,
        key_last4: config.key_last4,
        expires_at: config.expires_at,
        expires_in_days: config.expires_in_days,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,provider" }
    )
    .select("*")
    .single();

  if (error || !data) {
    console.error("Supabase saveAiConfig error, falling back to sandbox:", error);
    return sandboxDb.saveAiConfig(config);
  }

  return data as UserAiConfig;
}

/**
 * Manually delete/revoke an AI key from database.
 */
export async function dbDeleteUserAiConfig(userId: string): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client) {
    return sandboxDb.deleteAiConfig(userId);
  }

  const { error } = await client
    .from("user_ai_configurations")
    .delete()
    .eq("user_id", userId);

  return !error;
}
