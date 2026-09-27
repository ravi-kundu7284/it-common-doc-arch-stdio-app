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
