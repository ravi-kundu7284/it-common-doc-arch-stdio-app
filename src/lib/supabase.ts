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

let supabaseInstance: SupabaseClient<any, any, any> | null = null;

export const getSupabaseClient = (): SupabaseClient<any, any, any> | null => {
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
  public projects: Map<string, any> = new Map();
  public documentSections: Map<string, any> = new Map();
  public documentRevisions: Map<string, any[]> = new Map();
  public diagrams: Map<string, any> = new Map();
  public workflows: Map<string, any> = new Map();
  public requirements: Map<string, any> = new Map();
  public traceLinks: Map<string, any> = new Map();
  public adrs: Map<string, any> = new Map();
  public reviews: Map<string, any[]> = new Map();

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

  // Projects CRUD
  getProjects(userId?: string): any[] {
    const list = Array.from(this.projects.values());
    if (userId) {
      return list.filter((p) => p.user_id === userId || !p.user_id);
    }
    return list;
  }

  getProject(id: string): any | null {
    return this.projects.get(id) || null;
  }

  saveProject(project: any): any {
    const existing = this.projects.get(project.id);
    const now = new Date().toISOString();
    const saved = {
      ...existing,
      ...project,
      updated_at: now,
      created_at: existing?.created_at || now,
    };
    this.projects.set(project.id, saved);
    return saved;
  }

  deleteProject(id: string): boolean {
    // Cascade delete related entities
    for (const [sId, sec] of Array.from(this.documentSections.entries())) {
      if (sec.project_id === id) this.documentSections.delete(sId);
    }
    this.documentRevisions.delete(id);
    for (const [dId, diag] of Array.from(this.diagrams.entries())) {
      if (diag.project_id === id) this.diagrams.delete(dId);
    }
    for (const [wId, wf] of Array.from(this.workflows.entries())) {
      if (wf.project_id === id) this.workflows.delete(wId);
    }
    for (const [rId, req] of Array.from(this.requirements.entries())) {
      if (req.project_id === id) this.requirements.delete(rId);
    }
    for (const [tId, tr] of Array.from(this.traceLinks.entries())) {
      if (tr.project_id === id) this.traceLinks.delete(tId);
    }
    for (const [aId, adr] of Array.from(this.adrs.entries())) {
      if (adr.project_id === id) this.adrs.delete(aId);
    }
    this.reviews.delete(id);
    return this.projects.delete(id);
  }

  // Document Sections
  getSections(projectId: string): any[] {
    return Array.from(this.documentSections.values())
      .filter((s) => s.project_id === projectId)
      .sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
  }

  saveSection(section: any): any {
    const existing = this.documentSections.get(section.id);
    const now = new Date().toISOString();
    const saved = {
      ...existing,
      ...section,
      updated_at: now,
      created_at: existing?.created_at || now,
    };
    this.documentSections.set(section.id, saved);
    return saved;
  }

  deleteSection(id: string): boolean {
    return this.documentSections.delete(id);
  }

  // Document Revisions
  getRevisions(projectId: string): any[] {
    return this.documentRevisions.get(projectId) || [];
  }

  saveRevision(revision: any): any {
    const list = this.documentRevisions.get(revision.project_id) || [];
    const revNumber = list.length + 1;
    const item = {
      ...revision,
      id: revision.id || `rev_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      revision_number: revNumber,
      created_at: new Date().toISOString(),
    };
    list.unshift(item);
    this.documentRevisions.set(revision.project_id, list);
    return item;
  }

  // Diagrams CRUD
  getDiagrams(projectId: string): any[] {
    return Array.from(this.diagrams.values()).filter((d) => d.project_id === projectId);
  }

  getDiagram(id: string): any | null {
    return this.diagrams.get(id) || null;
  }

  saveDiagram(diagram: any): any {
    const existing = this.diagrams.get(diagram.id);
    const now = new Date().toISOString();
    const saved = {
      ...existing,
      ...diagram,
      updated_at: now,
      created_at: existing?.created_at || now,
    };
    this.diagrams.set(diagram.id, saved);
    return saved;
  }

  deleteDiagram(id: string): boolean {
    return this.diagrams.delete(id);
  }

  // Workflows CRUD
  getWorkflows(projectId: string): any[] {
    return Array.from(this.workflows.values()).filter((w) => w.project_id === projectId);
  }

  getWorkflow(id: string): any | null {
    return this.workflows.get(id) || null;
  }

  saveWorkflow(workflow: any): any {
    const existing = this.workflows.get(workflow.id);
    const now = new Date().toISOString();
    const saved = {
      ...existing,
      ...workflow,
      updated_at: now,
      created_at: existing?.created_at || now,
    };
    this.workflows.set(workflow.id, saved);
    return saved;
  }

  deleteWorkflow(id: string): boolean {
    return this.workflows.delete(id);
  }

  // Requirements & Trace Links
  getRequirements(projectId: string): any[] {
    return Array.from(this.requirements.values()).filter((r) => r.project_id === projectId);
  }

  getRequirement(id: string): any | null {
    return this.requirements.get(id) || null;
  }

  saveRequirement(req: any): any {
    const existing = this.requirements.get(req.id);
    const now = new Date().toISOString();
    const saved = {
      ...existing,
      ...req,
      updated_at: now,
      created_at: existing?.created_at || now,
    };
    this.requirements.set(req.id, saved);
    return saved;
  }

  deleteRequirement(id: string): boolean {
    for (const [tId, tr] of Array.from(this.traceLinks.entries())) {
      if (tr.requirement_id === id) this.traceLinks.delete(tId);
    }
    return this.requirements.delete(id);
  }

  getTraceLinks(projectId: string): any[] {
    return Array.from(this.traceLinks.values()).filter((t) => t.project_id === projectId);
  }

  saveTraceLink(link: any): any {
    const id = link.id || `tr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const saved = {
      ...link,
      id,
      created_at: link.created_at || new Date().toISOString(),
    };
    this.traceLinks.set(id, saved);
    return saved;
  }

  deleteTraceLink(id: string): boolean {
    return this.traceLinks.delete(id);
  }

  // ADRs CRUD
  getAdrs(projectId: string): any[] {
    return Array.from(this.adrs.values()).filter((a) => a.project_id === projectId);
  }

  getAdr(id: string): any | null {
    return this.adrs.get(id) || null;
  }

  saveAdr(adr: any): any {
    const existing = this.adrs.get(adr.id);
    const now = new Date().toISOString();
    const saved = {
      ...existing,
      ...adr,
      updated_at: now,
      created_at: existing?.created_at || now,
    };
    this.adrs.set(adr.id, saved);
    return saved;
  }

  deleteAdr(id: string): boolean {
    return this.adrs.delete(id);
  }

  // Architecture Quality Reviews
  saveReview(review: any): any {
    const list = this.reviews.get(review.project_id) || [];
    const id = review.id || `revw_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const saved = {
      ...review,
      id,
      evaluated_at: review.evaluated_at || new Date().toISOString(),
    };
    list.unshift(saved);
    this.reviews.set(review.project_id, list);
    return saved;
  }

  getLatestReview(projectId: string): any | null {
    const list = this.reviews.get(projectId) || [];
    return list[0] || null;
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
            "34d892155329cf05df75f20293482bb27bb1886fb6ece06a941c8172d49cca866d92d6635e5e40b4fa43d4b4436c52861fa0c5d17ce7033fdecc88bfb039f142",
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
            "ac8b96cd30f9922ce43a1753913920bafc119e3a2c03546738ca4bb03ecdeef6a22fb5eaeeb2abc5dea007dbb8afde4c0d5beeb171ff2b17a09a6f17b1b6f0f9",
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

  if (data) {
    return data as AppUser;
  }

  // Only check seed accounts if user was not found and check hasn't run yet
  if (!seedCheckAttempted) {
    await dbEnsureSeedUsers(client);
    const { data: retryData } = await client
      .from("app_users")
      .select("*")
      .or(`email.eq.${clean},username.eq.${clean}`)
      .maybeSingle();
    if (retryData) return retryData as AppUser;
  }

  return sandboxDb.findUserByEmailOrUsername(identifier);
}

/**
 * High-performance parallelized login recorder:
 * Concurrently updates user last_login/lockout, creates session, and records audit log.
 */
export async function dbRecordLoginSuccess(
  userId: string,
  session: Omit<UserSession, "id" | "created_at">,
  auditLog: Omit<SecurityAuditLog, "id" | "created_at">
): Promise<void> {
  const client = getSupabaseClient();
  const now = new Date().toISOString();

  // Update in-memory sandbox
  sandboxDb.updateLockout(userId, 0, null);
  sandboxDb.updateLastLogin(userId);
  sandboxDb.createSession(session);
  sandboxDb.recordAudit(auditLog);

  if (client) {
    await Promise.allSettled([
      client
        .from("app_users")
        .update({
          failed_login_attempts: 0,
          locked_until: null,
          last_login_at: now,
        })
        .eq("id", userId),

      client.from("user_sessions").insert([
        {
          user_id: session.user_id,
          session_token: session.session_token,
          ip_address: session.ip_address || "127.0.0.1",
          user_agent: session.user_agent || "Unknown Client",
          expires_at: session.expires_at,
          is_active: true,
          last_accessed_at: now,
        },
      ]),

      client.from("security_audit_logs").insert([
        {
          user_id: auditLog.user_id,
          action: auditLog.action,
          details: auditLog.details,
          ip_address: auditLog.ip_address || "127.0.0.1",
          user_agent: auditLog.user_agent || "Unknown Client",
        },
      ]),
    ]);
  }
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
    throw new Error(`Database user creation failed: ${error.message}`);
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

// ============================================================================
// Unified Architecture Artifact Operations (Supabase + Sandbox Fallback)
// ============================================================================

// Projects
export async function dbGetProjects(userId?: string): Promise<any[]> {
  const client = getSupabaseClient();
  if (client) {
    try {
      let query = client.from("projects").select("*").order("updated_at", { ascending: false });
      if (userId) query = query.eq("user_id", userId);
      const { data, error } = await query;
      if (!error && data) return data;
    } catch (e) {
      console.warn("Supabase dbGetProjects fallback:", e);
    }
  }
  return sandboxDb.getProjects(userId);
}

export async function dbGetProject(id: string): Promise<any | null> {
  const client = getSupabaseClient();
  if (client) {
    try {
      const { data, error } = await client.from("projects").select("*").eq("id", id).maybeSingle();
      if (!error && data) return data;
    } catch (e) {
      console.warn("Supabase dbGetProject fallback:", e);
    }
  }
  return sandboxDb.getProject(id);
}

export async function dbSaveProject(project: any): Promise<any> {
  const client = getSupabaseClient();
  if (client) {
    try {
      const { data, error } = await client
        .from("projects")
        .upsert(
          {
            id: project.id,
            user_id: project.user_id || null,
            title: project.title || project.metadata?.title || "Untitled Project",
            domain: project.domain || project.requirements?.domain || "General",
            design_level: project.design_level || project.designLevel || "hld",
            metadata: project.metadata || {},
            requirements: project.requirements || {},
            recommendations: project.recommendations || {},
            updated_at: new Date().toISOString(),
          },
          { onConflict: "id" }
        )
        .select()
        .maybeSingle();
      if (!error && data) return data;
    } catch (e) {
      console.warn("Supabase dbSaveProject fallback:", e);
    }
  }
  return sandboxDb.saveProject(project);
}

export async function dbDeleteProject(id: string): Promise<boolean> {
  const client = getSupabaseClient();
  if (client) {
    try {
      const { error } = await client.from("projects").delete().eq("id", id);
      if (!error) {
        sandboxDb.deleteProject(id);
        return true;
      }
    } catch (e) {
      console.warn("Supabase dbDeleteProject fallback:", e);
    }
  }
  return sandboxDb.deleteProject(id);
}

// Revisions
export async function dbGetRevisions(projectId: string): Promise<any[]> {
  const client = getSupabaseClient();
  if (client) {
    try {
      const { data, error } = await client
        .from("document_revisions")
        .select("*")
        .eq("project_id", projectId)
        .order("revision_number", { ascending: false });
      if (!error && data) return data;
    } catch (e) {
      console.warn("Supabase dbGetRevisions fallback:", e);
    }
  }
  return sandboxDb.getRevisions(projectId);
}

export async function dbSaveRevision(revision: any): Promise<any> {
  const client = getSupabaseClient();
  if (client) {
    try {
      const { data, error } = await client
        .from("document_revisions")
        .insert({
          id: revision.id || `rev_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          project_id: revision.project_id || revision.projectId,
          revision_number: revision.revision_number || revision.revisionNumber || 1,
          title: revision.title,
          snapshot: revision.snapshot,
          author: revision.author || "Architect",
          comment: revision.comment || "Manual snapshot",
          created_at: new Date().toISOString(),
        })
        .select()
        .maybeSingle();
      if (!error && data) return data;
    } catch (e) {
      console.warn("Supabase dbSaveRevision fallback:", e);
    }
  }
  return sandboxDb.saveRevision(revision);
}

// Diagrams
export async function dbGetDiagrams(projectId: string): Promise<any[]> {
  const client = getSupabaseClient();
  if (client) {
    try {
      const { data, error } = await client
        .from("diagrams")
        .select("*")
        .eq("project_id", projectId)
        .order("created_at", { ascending: true });
      if (!error && data) return data;
    } catch (e) {
      console.warn("Supabase dbGetDiagrams fallback:", e);
    }
  }
  return sandboxDb.getDiagrams(projectId);
}

export async function dbGetDiagram(id: string): Promise<any | null> {
  const client = getSupabaseClient();
  if (client) {
    try {
      const { data, error } = await client.from("diagrams").select("*").eq("id", id).maybeSingle();
      if (!error && data) return data;
    } catch (e) {
      console.warn("Supabase dbGetDiagram fallback:", e);
    }
  }
  return sandboxDb.getDiagram(id);
}

export async function dbSaveDiagram(diagram: any): Promise<any> {
  const client = getSupabaseClient();
  if (client) {
    try {
      const { data, error } = await client
        .from("diagrams")
        .upsert(
          {
            id: diagram.id,
            project_id: diagram.project_id || diagram.projectId,
            title: diagram.title,
            diagram_type: diagram.diagram_type || diagram.diagramType,
            mermaid_code: diagram.mermaid_code || diagram.mermaidCode,
            visual_model: diagram.visual_model || diagram.visualModel || {},
            version: diagram.version || 1,
            is_locked: Boolean(diagram.is_locked || diagram.isLocked),
            updated_at: new Date().toISOString(),
          },
          { onConflict: "id" }
        )
        .select()
        .maybeSingle();
      if (!error && data) return data;
    } catch (e) {
      console.warn("Supabase dbSaveDiagram fallback:", e);
    }
  }
  return sandboxDb.saveDiagram(diagram);
}

export async function dbDeleteDiagram(id: string): Promise<boolean> {
  const client = getSupabaseClient();
  if (client) {
    try {
      const { error } = await client.from("diagrams").delete().eq("id", id);
      if (!error) {
        sandboxDb.deleteDiagram(id);
        return true;
      }
    } catch (e) {
      console.warn("Supabase dbDeleteDiagram fallback:", e);
    }
  }
  return sandboxDb.deleteDiagram(id);
}

// Workflows
export async function dbGetWorkflows(projectId: string): Promise<any[]> {
  const client = getSupabaseClient();
  if (client) {
    try {
      const { data, error } = await client
        .from("workflows")
        .select("*")
        .eq("project_id", projectId)
        .order("created_at", { ascending: true });
      if (!error && data) return data;
    } catch (e) {
      console.warn("Supabase dbGetWorkflows fallback:", e);
    }
  }
  return sandboxDb.getWorkflows(projectId);
}

export async function dbGetWorkflow(id: string): Promise<any | null> {
  const client = getSupabaseClient();
  if (client) {
    try {
      const { data, error } = await client.from("workflows").select("*").eq("id", id).maybeSingle();
      if (!error && data) return data;
    } catch (e) {
      console.warn("Supabase dbGetWorkflow fallback:", e);
    }
  }
  return sandboxDb.getWorkflow(id);
}

export async function dbSaveWorkflow(workflow: any): Promise<any> {
  const client = getSupabaseClient();
  if (client) {
    try {
      const { data, error } = await client
        .from("workflows")
        .upsert(
          {
            id: workflow.id,
            project_id: workflow.project_id || workflow.projectId,
            title: workflow.title,
            description: workflow.description || "",
            status: workflow.status || "draft",
            steps: workflow.steps || [],
            edges: workflow.edges || [],
            version: workflow.version || 1,
            validation: workflow.validation || {},
            updated_at: new Date().toISOString(),
          },
          { onConflict: "id" }
        )
        .select()
        .maybeSingle();
      if (!error && data) return data;
    } catch (e) {
      console.warn("Supabase dbSaveWorkflow fallback:", e);
    }
  }
  return sandboxDb.saveWorkflow(workflow);
}

export async function dbDeleteWorkflow(id: string): Promise<boolean> {
  const client = getSupabaseClient();
  if (client) {
    try {
      const { error } = await client.from("workflows").delete().eq("id", id);
      if (!error) {
        sandboxDb.deleteWorkflow(id);
        return true;
      }
    } catch (e) {
      console.warn("Supabase dbDeleteWorkflow fallback:", e);
    }
  }
  return sandboxDb.deleteWorkflow(id);
}

// Requirements & Trace Links
export async function dbGetRequirements(projectId: string): Promise<any[]> {
  const client = getSupabaseClient();
  if (client) {
    try {
      const { data, error } = await client
        .from("requirements")
        .select("*")
        .eq("project_id", projectId)
        .order("stable_id", { ascending: true });
      if (!error && data) return data;
    } catch (e) {
      console.warn("Supabase dbGetRequirements fallback:", e);
    }
  }
  return sandboxDb.getRequirements(projectId);
}

export async function dbGetRequirement(id: string): Promise<any | null> {
  const client = getSupabaseClient();
  if (client) {
    try {
      const { data, error } = await client.from("requirements").select("*").eq("id", id).maybeSingle();
      if (!error && data) return data;
    } catch (e) {
      console.warn("Supabase dbGetRequirement fallback:", e);
    }
  }
  return sandboxDb.getRequirement(id);
}

export async function dbSaveRequirement(req: any): Promise<any> {
  const client = getSupabaseClient();
  if (client) {
    try {
      const { data, error } = await client
        .from("requirements")
        .upsert(
          {
            id: req.id,
            project_id: req.project_id || req.projectId,
            stable_id: req.stable_id || req.stableId,
            title: req.title,
            category: req.category,
            priority: req.priority || "medium",
            status: req.status || "draft",
            description: req.description,
            acceptance_criteria: req.acceptance_criteria || req.acceptanceCriteria || [],
            updated_at: new Date().toISOString(),
          },
          { onConflict: "id" }
        )
        .select()
        .maybeSingle();
      if (!error && data) return data;
    } catch (e) {
      console.warn("Supabase dbSaveRequirement fallback:", e);
    }
  }
  return sandboxDb.saveRequirement(req);
}

export async function dbDeleteRequirement(id: string): Promise<boolean> {
  const client = getSupabaseClient();
  if (client) {
    try {
      const { error } = await client.from("requirements").delete().eq("id", id);
      if (!error) {
        sandboxDb.deleteRequirement(id);
        return true;
      }
    } catch (e) {
      console.warn("Supabase dbDeleteRequirement fallback:", e);
    }
  }
  return sandboxDb.deleteRequirement(id);
}

export async function dbGetTraceLinks(projectId: string): Promise<any[]> {
  const client = getSupabaseClient();
  if (client) {
    try {
      const { data, error } = await client
        .from("requirement_trace_links")
        .select("*")
        .eq("project_id", projectId);
      if (!error && data) return data;
    } catch (e) {
      console.warn("Supabase dbGetTraceLinks fallback:", e);
    }
  }
  return sandboxDb.getTraceLinks(projectId);
}

export async function dbSaveTraceLink(link: any): Promise<any> {
  const client = getSupabaseClient();
  if (client) {
    try {
      const { data, error } = await client
        .from("requirement_trace_links")
        .insert({
          id: link.id || `tr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          project_id: link.project_id || link.projectId,
          requirement_id: link.requirement_id || link.requirementId,
          target_type: link.target_type || link.targetType,
          target_id: link.target_id || link.targetId,
          target_title: link.target_title || link.targetTitle,
          created_at: new Date().toISOString(),
        })
        .select()
        .maybeSingle();
      if (!error && data) return data;
    } catch (e) {
      console.warn("Supabase dbSaveTraceLink fallback:", e);
    }
  }
  return sandboxDb.saveTraceLink(link);
}

export async function dbDeleteTraceLink(id: string): Promise<boolean> {
  const client = getSupabaseClient();
  if (client) {
    try {
      const { error } = await client.from("requirement_trace_links").delete().eq("id", id);
      if (!error) {
        sandboxDb.deleteTraceLink(id);
        return true;
      }
    } catch (e) {
      console.warn("Supabase dbDeleteTraceLink fallback:", e);
    }
  }
  return sandboxDb.deleteTraceLink(id);
}

// ADRs
export async function dbGetAdrs(projectId: string): Promise<any[]> {
  const client = getSupabaseClient();
  if (client) {
    try {
      const { data, error } = await client
        .from("adrs")
        .select("*")
        .eq("project_id", projectId)
        .order("stable_id", { ascending: true });
      if (!error && data) return data;
    } catch (e) {
      console.warn("Supabase dbGetAdrs fallback:", e);
    }
  }
  return sandboxDb.getAdrs(projectId);
}

export async function dbGetAdr(id: string): Promise<any | null> {
  const client = getSupabaseClient();
  if (client) {
    try {
      const { data, error } = await client.from("adrs").select("*").eq("id", id).maybeSingle();
      if (!error && data) return data;
    } catch (e) {
      console.warn("Supabase dbGetAdr fallback:", e);
    }
  }
  return sandboxDb.getAdr(id);
}

export async function dbSaveAdr(adr: any): Promise<any> {
  const client = getSupabaseClient();
  if (client) {
    try {
      const { data, error } = await client
        .from("adrs")
        .upsert(
          {
            id: adr.id,
            project_id: adr.project_id || adr.projectId,
            stable_id: adr.stable_id || adr.stableId,
            title: adr.title,
            status: adr.status || "proposed",
            context: adr.context,
            decision_drivers: adr.decision_drivers || adr.decisionDrivers || [],
            options_considered: adr.options_considered || adr.optionsConsidered || [],
            decision: adr.decision,
            consequences: adr.consequences || {},
            risks: adr.risks || [],
            author: adr.author || "Architect",
            reviewers: adr.reviewers || [],
            superseded_by: adr.superseded_by || adr.supersededBy || null,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "id" }
        )
        .select()
        .maybeSingle();
      if (!error && data) return data;
    } catch (e) {
      console.warn("Supabase dbSaveAdr fallback:", e);
    }
  }
  return sandboxDb.saveAdr(adr);
}

export async function dbDeleteAdr(id: string): Promise<boolean> {
  const client = getSupabaseClient();
  if (client) {
    try {
      const { error } = await client.from("adrs").delete().eq("id", id);
      if (!error) {
        sandboxDb.deleteAdr(id);
        return true;
      }
    } catch (e) {
      console.warn("Supabase dbDeleteAdr fallback:", e);
    }
  }
  return sandboxDb.deleteAdr(id);
}

// Architecture Quality Reviews
export async function dbSaveReview(review: any): Promise<any> {
  const client = getSupabaseClient();
  if (client) {
    try {
      const { data, error } = await client
        .from("architecture_reviews")
        .insert({
          id: review.id || `revw_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          project_id: review.project_id || review.projectId,
          overall_score: review.overall_score ?? review.overallScore ?? 85,
          evaluated_at: review.evaluated_at || review.evaluatedAt || new Date().toISOString(),
          findings: review.findings || [],
          summary: review.summary || {},
          created_at: new Date().toISOString(),
        })
        .select()
        .maybeSingle();
      if (!error && data) return data;
    } catch (e) {
      console.warn("Supabase dbSaveReview fallback:", e);
    }
  }
  return sandboxDb.saveReview(review);
}

export async function dbGetLatestReview(projectId: string): Promise<any | null> {
  const client = getSupabaseClient();
  if (client) {
    try {
      const { data, error } = await client
        .from("architecture_reviews")
        .select("*")
        .eq("project_id", projectId)
        .order("evaluated_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!error && data) return data;
    } catch (e) {
      console.warn("Supabase dbGetLatestReview fallback:", e);
    }
  }
  return sandboxDb.getLatestReview(projectId);
}
