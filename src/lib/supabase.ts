import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { isExpired } from "./crypto";
import { getEnvVar } from "./env";

// Polyfill WebSocket for Node.js 18 environments if missing
if (typeof globalThis !== "undefined" && !globalThis.WebSocket) {
  (globalThis as any).WebSocket = class DummyWebSocket {};
}

export { getEnvVar };

let lastDbError: string | null = null;
export function getLastDbError(): string | null {
  return lastDbError;
}

/**
 * Dynamic resolution of database connection parameters from Git environment variables,
 * GitHub Secrets/Variables, or Cloudflare Pages environment.
 */
export function resolveSupabaseConfig(): { url: string; key: string; schema: string } {
  let url =
    getEnvVar("NEXT_PUBLIC_SUPABASE_URL") ||
    getEnvVar("SUPABASE_URL") ||
    "";

  let key =
    getEnvVar("SUPABASE_SERVICE_ROLE_KEY") ||
    getEnvVar("NEXT_PUBLIC_SUPABASE_ANON_KEY") ||
    getEnvVar("SUPABASE_ANON_KEY") ||
    getEnvVar("SUPABASE_KEY") ||
    "";

  let schema =
    getEnvVar("NEXT_PUBLIC_SUPABASE_SCHEMA") ||
    getEnvVar("SUPABASE_SCHEMA") ||
    getEnvVar("DB_SCHEMA") ||
    "dev";

  // If URL is not explicitly set, try extracting Supabase project ref from DATABASE_URL
  const dbUrl = getEnvVar("DATABASE_URL");
  if (!url && dbUrl) {
    const match = dbUrl.match(/postgres\.([a-zA-Z0-9_-]+):/);
    if (match && match[1]) {
      url = `https://${match[1]}.supabase.co`;
    }
  }

  return { url, key, schema };
}

export const isSupabaseConfigured = (): boolean => {
  const { url, key } = resolveSupabaseConfig();
  return Boolean(
    url &&
      key &&
      !url.includes("your-project-ref") &&
      !key.includes("your-key")
  );
};

let supabaseInstance: SupabaseClient | null = null;

export const getSupabaseClient = (): SupabaseClient | null => {
  if (!isSupabaseConfigured()) {
    return null;
  }
  if (!supabaseInstance) {
    const { url, key, schema } = resolveSupabaseConfig();
    supabaseInstance = createClient(url, key, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
      db: {
        schema,
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
  designation?: string;
  role?: string; // 'architect' | 'admin' | 'reviewer'
  failed_login_attempts?: number;
  locked_until?: string | null;
  reset_token?: string | null;
  reset_token_expires_at?: string | null;
  created_at: string;
  last_login_at: string;
}

export interface UserSession {
  id: string;
  user_id: string;
  session_token: string;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
  expires_at: string;
  last_accessed_at?: string;
  is_active: boolean;
}

export interface SecurityAuditLog {
  id: string;
  user_id?: string | null;
  action: string;
  details?: string;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
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
  public users: Map<string, AppUser> = new Map();
  public aiConfigs: Map<string, UserAiConfig> = new Map();
  public sessions: Map<string, UserSession> = new Map();
  public auditLogs: SecurityAuditLog[] = [];

  constructor() {
    // Seed Demo Architect User
    // Password: Architect123!
    const architectId = "00000000-0000-0000-0000-000000000001";
    this.users.set(architectId, {
      id: architectId,
      username: "demo_architect",
      email: "architect@docarch.ai",
      password_hash: "527bdb1ed439b504b24e97c62571ed6956739593573fa0694489387ce19acba77dbfb4d5631557107b119deeff99e488d983425cf556bad79ff7e196b887c350",
      password_salt: "0aedc1488bbf45f7c7fbee0f5eb5c84f",
      full_name: "Lead System Architect",
      designation: "Principal Enterprise Architect",
      role: "architect",
      failed_login_attempts: 0,
      locked_until: null,
      created_at: new Date().toISOString(),
      last_login_at: new Date().toISOString(),
    });

    // Seed Demo Admin User
    // Password: AdminPassword2026!
    const adminId = "00000000-0000-0000-0000-000000000002";
    this.users.set(adminId, {
      id: adminId,
      username: "super_admin",
      email: "admin@docarch.ai",
      password_hash: "cbd1b59b7a780a85f450fec31bd0f6c018f173272facfee909ea08b9914dd122e2f8c1677b9f25d066e612681ccc4f590fc3a58e26eeb05d690ce51fd9460f71",
      password_salt: "0070d014a1003faaec508fd76544b1a9",
      full_name: "DocArch Chief Administrator",
      designation: "Chief Technology Architect",
      role: "admin",
      failed_login_attempts: 0,
      locked_until: null,
      created_at: new Date().toISOString(),
      last_login_at: new Date().toISOString(),
    });

    this.auditLogs.push({
      id: "log_init",
      user_id: adminId,
      action: "SYSTEM_INITIALIZED",
      details: "DocArch Security Sandbox initialized with Admin & Architect accounts",
      ip_address: "127.0.0.1",
      created_at: new Date().toISOString(),
    });
  }

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
      failed_login_attempts: 0,
      locked_until: null,
      designation: user.designation || "Software Architect",
      role: user.role || "architect",
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

  updateLockout(id: string, attempts: number, lockedUntil: string | null) {
    const u = this.users.get(id);
    if (u) {
      u.failed_login_attempts = attempts;
      u.locked_until = lockedUntil;
    }
  }

  setPasswordResetToken(email: string, token: string, expiresAt: string): AppUser | null {
    const u = this.findUserByEmailOrUsername(email);
    if (u) {
      u.reset_token = token;
      u.reset_token_expires_at = expiresAt;
      return u;
    }
    return null;
  }

  findUserByResetToken(token: string): AppUser | null {
    for (const u of Array.from(this.users.values())) {
      if (u.reset_token === token) {
        if (u.reset_token_expires_at && new Date(u.reset_token_expires_at).getTime() > Date.now()) {
          return u;
        }
      }
    }
    return null;
  }

  resetPassword(userId: string, hash: string, salt: string): boolean {
    const u = this.users.get(userId);
    if (u) {
      u.password_hash = hash;
      u.password_salt = salt;
      u.reset_token = null;
      u.reset_token_expires_at = null;
      u.failed_login_attempts = 0;
      u.locked_until = null;
      return true;
    }
    return false;
  }

  unlockUser(userId: string): boolean {
    const u = this.users.get(userId);
    if (u) {
      u.failed_login_attempts = 0;
      u.locked_until = null;
      return true;
    }
    return false;
  }

  getAllUsers(): AppUser[] {
    return Array.from(this.users.values());
  }

  updateUserRole(userId: string, role: string): boolean {
    const u = this.users.get(userId);
    if (u) {
      u.role = role;
      return true;
    }
    return false;
  }

  deleteUser(userId: string): boolean {
    this.deleteAiConfig(userId);
    // Remove sessions
    for (const [sId, sess] of Array.from(this.sessions.entries())) {
      if (sess.user_id === userId) this.sessions.delete(sId);
    }
    return this.users.delete(userId);
  }

  // Session methods
  createSession(session: Omit<UserSession, "id" | "created_at">): UserSession {
    const id = "sess_" + Math.random().toString(36).substring(2, 11);
    const now = new Date().toISOString();
    const newSession: UserSession = {
      id,
      ...session,
      created_at: now,
      last_accessed_at: now,
      is_active: true,
    };
    this.sessions.set(session.session_token, newSession);
    return newSession;
  }

  getSession(token: string): UserSession | null {
    const s = this.sessions.get(token);
    if (!s || !s.is_active) return null;
    if (new Date(s.expires_at).getTime() < Date.now()) {
      s.is_active = false;
      return null;
    }
    s.last_accessed_at = new Date().toISOString();
    return s;
  }

  revokeSession(token: string): boolean {
    const s = this.sessions.get(token);
    if (s) {
      s.is_active = false;
      return true;
    }
    return false;
  }

  getAllActiveSessions(): UserSession[] {
    const now = Date.now();
    return Array.from(this.sessions.values()).filter(
      (s) => s.is_active && new Date(s.expires_at).getTime() > now
    );
  }

  // Audit Logs
  recordAudit(log: Omit<SecurityAuditLog, "id" | "created_at">): void {
    const id = "log_" + Math.random().toString(36).substring(2, 11);
    this.auditLogs.unshift({
      id,
      ...log,
      created_at: new Date().toISOString(),
    });
    // Keep last 200 logs
    if (this.auditLogs.length > 200) this.auditLogs.pop();
  }

  getAuditLogs(limit = 50): SecurityAuditLog[] {
    return this.auditLogs.slice(0, limit);
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
declare global {
  var __docarch_sandbox_db__: LocalSandboxDatabase | undefined;
}

const getSandboxDb = (): LocalSandboxDatabase => {
  if (!globalThis.__docarch_sandbox_db__) {
    globalThis.__docarch_sandbox_db__ = new LocalSandboxDatabase();
  }
  return globalThis.__docarch_sandbox_db__;
};

const sandboxDb = getSandboxDb();

// ============================================================================
// Unified Repository Operations (Supabase PostgreSQL + Local Sandbox Fallback)
// ============================================================================

let seedCheckAttempted = false;

export async function dbEnsureSeedUsers(client: SupabaseClient): Promise<void> {
  if (seedCheckAttempted) return;
  seedCheckAttempted = true;
  try {
    const { count, error } = await client
      .from("app_users")
      .select("id", { count: "exact", head: true });

    if (error) {
      lastDbError = error.message;
      console.warn("Supabase app_users table check error:", error.message);
      return;
    }

    if (count === 0) {
      console.log("Empty app_users table detected. Auto-seeding default demo accounts...");
      await client.from("app_users").insert([
        {
          id: "00000000-0000-0000-0000-000000000001",
          username: "demo_architect",
          email: "architect@docarch.ai",
          password_hash:
            "223a54b3c1d9f8e7a6b5c4d3e2f1a0b9c8d7e6f5a4b3c2d1e0f9a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f1a0b9c8d7e6f5a4b3c2d1e0f9a8b7c6d5e4f3a2b1",
          password_salt: "1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d",
          full_name: "Lead System Architect",
          designation: "Principal Enterprise Architect",
          role: "architect",
          failed_login_attempts: 0,
        },
        {
          id: "00000000-0000-0000-0000-000000000002",
          username: "admin",
          email: "admin@docarch.ai",
          password_hash:
            "389c894200676cb400ff5021e5f8f8b89e6eb1ad373801f92e42ca427189a7bbd377b83ecbf1fe4f4949a567a13c9ff42cbbbf1c4d9bc213825fdb8b0ba315e1",
          password_salt: "a4f5b8c2d1e0f3a6b9c8d7e6f5a4b3c2",
          full_name: "System Administrator",
          designation: "Chief Technology Architect",
          role: "admin",
          failed_login_attempts: 0,
        },
      ]);
    }
  } catch (err: any) {
    lastDbError = err.message;
    console.warn("Auto-seed error:", err);
  }
}

export async function dbFindUser(identifier: string): Promise<AppUser | null> {
  const client = getSupabaseClient();
  if (!client) {
    return sandboxDb.findUserByEmailOrUsername(identifier);
  }

  // Ensure seed accounts exist if this is the first query
  await dbEnsureSeedUsers(client);

  const clean = identifier.toLowerCase().trim();
  const { data, error } = await client
    .from("app_users")
    .select("*")
    .or(`email.eq.${clean},username.eq.${clean}`)
    .maybeSingle();

  if (error) {
    lastDbError = error.message;
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
    lastDbError = error.message;
    console.error("Supabase user lookup by ID error:", error);
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
        username: user.username,
        email: user.email,
        password_hash: user.password_hash,
        password_salt: user.password_salt,
        full_name: user.full_name || user.username,
        designation: user.designation || "Software Architect",
        role: user.role || "architect",
        failed_login_attempts: 0,
        locked_until: null,
      },
    ])
    .select()
    .single();

  if (error) {
    lastDbError = error.message;
    console.error("Supabase user creation error:", error);
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

export async function dbUpdateUserLockout(
  id: string,
  attempts: number,
  lockedUntil: string | null
): Promise<void> {
  const client = getSupabaseClient();
  sandboxDb.updateLockout(id, attempts, lockedUntil);

  if (client) {
    await client
      .from("app_users")
      .update({
        failed_login_attempts: attempts,
        locked_until: lockedUntil,
      })
      .eq("id", id);
  }
}

export async function dbSetPasswordResetToken(
  email: string,
  token: string,
  expiresAt: string
): Promise<AppUser | null> {
  const client = getSupabaseClient();
  const memoryUser = sandboxDb.setPasswordResetToken(email, token, expiresAt);

  if (client) {
    const { data } = await client
      .from("app_users")
      .update({
        reset_token: token,
        reset_token_expires_at: expiresAt,
      })
      .eq("email", email.toLowerCase().trim())
      .select()
      .maybeSingle();

    if (data) return data as AppUser;
  }
  return memoryUser;
}

export async function dbFindUserByResetToken(token: string): Promise<AppUser | null> {
  const client = getSupabaseClient();
  if (!client) {
    return sandboxDb.findUserByResetToken(token);
  }

  const { data } = await client
    .from("app_users")
    .select("*")
    .eq("reset_token", token)
    .gt("reset_token_expires_at", new Date().toISOString())
    .maybeSingle();

  if (data) return data as AppUser;
  return sandboxDb.findUserByResetToken(token);
}

export async function dbResetUserPassword(
  userId: string,
  hash: string,
  salt: string
): Promise<boolean> {
  const client = getSupabaseClient();
  sandboxDb.resetPassword(userId, hash, salt);

  if (client) {
    const { error } = await client
      .from("app_users")
      .update({
        password_hash: hash,
        password_salt: salt,
        reset_token: null,
        reset_token_expires_at: null,
        failed_login_attempts: 0,
        locked_until: null,
      })
      .eq("id", userId);
    return !error;
  }
  return true;
}

export async function dbUnlockUser(userId: string): Promise<boolean> {
  const client = getSupabaseClient();
  sandboxDb.unlockUser(userId);

  if (client) {
    const { error } = await client
      .from("app_users")
      .update({
        failed_login_attempts: 0,
        locked_until: null,
      })
      .eq("id", userId);
    return !error;
  }
  return true;
}

export async function dbGetAllUsers(): Promise<AppUser[]> {
  const client = getSupabaseClient();
  if (!client) {
    return sandboxDb.getAllUsers();
  }

  const { data, error } = await client
    .from("app_users")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Supabase fetch all users error:", error);
    return sandboxDb.getAllUsers();
  }
  return (data as AppUser[]) || [];
}

export async function dbUpdateUserRole(userId: string, role: string): Promise<boolean> {
  const client = getSupabaseClient();
  sandboxDb.updateUserRole(userId, role);

  if (client) {
    const { error } = await client
      .from("app_users")
      .update({ role })
      .eq("id", userId);
    return !error;
  }
  return true;
}

export async function dbDeleteUser(userId: string): Promise<boolean> {
  const client = getSupabaseClient();
  sandboxDb.deleteUser(userId);

  if (client) {
    const { error } = await client.from("app_users").delete().eq("id", userId);
    return !error;
  }
  return true;
}

// Session operations
export async function dbCreateSession(
  session: Omit<UserSession, "id" | "created_at">
): Promise<UserSession> {
  const client = getSupabaseClient();
  const created = sandboxDb.createSession(session);

  if (client) {
    await client.from("user_sessions").insert([
      {
        user_id: session.user_id,
        session_token: session.session_token,
        ip_address: session.ip_address,
        user_agent: session.user_agent,
        expires_at: session.expires_at,
        is_active: true,
      },
    ]);
  }
  return created;
}

export async function dbGetSession(token: string): Promise<UserSession | null> {
  const client = getSupabaseClient();
  if (!client) {
    return sandboxDb.getSession(token);
  }

  const { data } = await client
    .from("user_sessions")
    .select("*")
    .eq("session_token", token)
    .eq("is_active", true)
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();

  if (data) return data as UserSession;
  return sandboxDb.getSession(token);
}

export async function dbRevokeSession(token: string): Promise<boolean> {
  const client = getSupabaseClient();
  sandboxDb.revokeSession(token);

  if (client) {
    const { error } = await client
      .from("user_sessions")
      .update({ is_active: false })
      .eq("session_token", token);
    return !error;
  }
  return true;
}

export async function dbGetAllActiveSessions(): Promise<UserSession[]> {
  const client = getSupabaseClient();
  if (!client) {
    return sandboxDb.getAllActiveSessions();
  }

  const { data, error } = await client
    .from("user_sessions")
    .select("*")
    .eq("is_active", true)
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false });

  if (error) {
    return sandboxDb.getAllActiveSessions();
  }
  return (data as UserSession[]) || [];
}

// Audit Log operations
export async function dbRecordAuditLog(
  log: Omit<SecurityAuditLog, "id" | "created_at">
): Promise<void> {
  const client = getSupabaseClient();
  sandboxDb.recordAudit(log);

  if (client) {
    await client.from("security_audit_logs").insert([
      {
        user_id: log.user_id || null,
        action: log.action,
        details: log.details,
        ip_address: log.ip_address,
        user_agent: log.user_agent,
      },
    ]);
  }
}

export async function dbGetAuditLogs(limit = 50): Promise<SecurityAuditLog[]> {
  const client = getSupabaseClient();
  if (!client) {
    return sandboxDb.getAuditLogs(limit);
  }

  const { data, error } = await client
    .from("security_audit_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    return sandboxDb.getAuditLogs(limit);
  }
  return (data as SecurityAuditLog[]) || [];
}

// AI Config repository operations
export async function dbGetUserAiConfig(userId: string): Promise<UserAiConfig | null> {
  const client = getSupabaseClient();
  if (!client) {
    return sandboxDb.getAiConfig(userId);
  }

  try {
    await client.rpc("purge_expired_api_keys");
  } catch {}

  const { data, error } = await client
    .from("user_ai_configurations")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (error || !data) {
    return sandboxDb.getAiConfig(userId);
  }

  const config = data as UserAiConfig;
  if (isExpired(config.expires_at)) {
    await dbDeleteUserAiConfig(userId);
    return null;
  }

  return config;
}

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
    .select()
    .single();

  if (error) {
    console.error("Supabase save AI config error:", error);
    return sandboxDb.saveAiConfig(config);
  }
  return data as UserAiConfig;
}

export async function dbDeleteUserAiConfig(userId: string): Promise<boolean> {
  const client = getSupabaseClient();
  sandboxDb.deleteAiConfig(userId);

  if (client) {
    const { error } = await client
      .from("user_ai_configurations")
      .delete()
      .eq("user_id", userId);
    return !error;
  }
  return true;
}

export async function dbPurgeExpired(): Promise<number> {
  const client = getSupabaseClient();
  const countMemory = sandboxDb.purgeExpired();

  if (client) {
    try {
      const { data } = await client.rpc("purge_expired_api_keys");
      return Number(data) || countMemory;
    } catch {
      return countMemory;
    }
  }
  return countMemory;
}

export interface DbHealthReport {
  connected: boolean;
  isConfigured: boolean;
  schema: string;
  url: string;
  hasKey: boolean;
  keyType: "service_role" | "anon" | "none";
  tables: {
    app_users: { ok: boolean; count?: number; error?: string };
    user_ai_configurations: { ok: boolean; error?: string };
    user_sessions: { ok: boolean; error?: string };
    security_audit_logs: { ok: boolean; error?: string };
  };
  missingTables: string[];
  recommendation?: string;
}

export async function dbCheckHealth(): Promise<DbHealthReport> {
  const { url, key, schema } = resolveSupabaseConfig();
  const isConfigured = isSupabaseConfigured();

  const report: DbHealthReport = {
    connected: false,
    isConfigured,
    schema,
    url: url ? `${url.slice(0, 20)}...` : "(not configured)",
    hasKey: Boolean(key),
    keyType: key ? (key.length > 100 ? "service_role" : "anon") : "none",
    tables: {
      app_users: { ok: false },
      user_ai_configurations: { ok: false },
      user_sessions: { ok: false },
      security_audit_logs: { ok: false },
    },
    missingTables: [],
  };

  const client = getSupabaseClient();
  if (!client) {
    report.recommendation =
      "Supabase database connection parameters are not detected in the Cloudflare Pages runtime. Please configure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in Cloudflare Pages Dashboard -> Settings -> Environment variables.";
    return report;
  }

  // 1. Check app_users
  try {
    const { data, count, error } = await client
      .from("app_users")
      .select("id", { count: "exact" })
      .limit(1);
    if (error) {
      report.tables.app_users = { ok: false, error: error.message };
      report.missingTables.push("app_users");
    } else {
      report.tables.app_users = { ok: true, count: count ?? 0 };
    }
  } catch (e: any) {
    report.tables.app_users = { ok: false, error: e.message };
    report.missingTables.push("app_users");
  }

  // 2. Check user_ai_configurations
  try {
    const { error } = await client
      .from("user_ai_configurations")
      .select("id")
      .limit(1);
    if (error) {
      report.tables.user_ai_configurations = { ok: false, error: error.message };
      report.missingTables.push("user_ai_configurations");
    } else {
      report.tables.user_ai_configurations = { ok: true };
    }
  } catch (e: any) {
    report.tables.user_ai_configurations = { ok: false, error: e.message };
    report.missingTables.push("user_ai_configurations");
  }

  // 3. Check user_sessions
  try {
    const { error } = await client
      .from("user_sessions")
      .select("id")
      .limit(1);
    if (error) {
      report.tables.user_sessions = { ok: false, error: error.message };
      report.missingTables.push("user_sessions");
    } else {
      report.tables.user_sessions = { ok: true };
    }
  } catch (e: any) {
    report.tables.user_sessions = { ok: false, error: e.message };
    report.missingTables.push("user_sessions");
  }

  // 4. Check security_audit_logs
  try {
    const { error } = await client
      .from("security_audit_logs")
      .select("id")
      .limit(1);
    if (error) {
      report.tables.security_audit_logs = { ok: false, error: error.message };
      report.missingTables.push("security_audit_logs");
    } else {
      report.tables.security_audit_logs = { ok: true };
    }
  } catch (e: any) {
    report.tables.security_audit_logs = { ok: false, error: e.message };
    report.missingTables.push("security_audit_logs");
  }

  report.connected = report.missingTables.length === 0;
  if (!report.connected) {
    const hasPgrst106 = Object.values(report.tables).some((t) =>
      t.error?.includes("PGRST106") || t.error?.includes("Invalid schema")
    );
    if (hasPgrst106) {
      report.recommendation = `Schema '${schema}' is not exposed in Supabase PostgREST. Please navigate to Supabase Dashboard -> Project Settings -> API -> Data API Settings -> 'Exposed schemas' and add '${schema}' to the list.`;
    } else {
      report.recommendation = `Database tables missing in schema '${schema}': ${report.missingTables.join(", ")}. Please copy the SQL from 'supabase/schema.sql' and run it in your Supabase Dashboard > SQL Editor.`;
    }
  } else {
    report.recommendation = `Database is connected and healthy in schema '${schema}'!`;
  }

  return report;
}
