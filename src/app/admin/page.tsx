"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useAuthStore } from "@/store/use-auth-store";
import {
  ShieldAlert,
  Users,
  Key,
  Unlock,
  Trash2,
  RefreshCw,
  Search,
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  History,
  Lock,
  Globe,
  Radio,
  FileText,
  ShieldCheck,
} from "lucide-react";

interface AdminUser {
  id: string;
  username: string;
  email: string;
  fullName?: string;
  designation?: string;
  role: string;
  failedAttempts: number;
  isLocked: boolean;
  lockWaitSeconds: number;
  lockedUntil?: string | null;
  createdAt: string;
  lastLoginAt: string;
}

interface ActiveSession {
  id: string;
  user_id: string;
  session_token: string;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
  expires_at: string;
  is_active: boolean;
}

interface AuditLog {
  id: string;
  user_id?: string | null;
  action: string;
  details?: string;
  ip_address?: string;
  created_at: string;
}

export default function AdminPage() {
  const { user, isAuthenticated, isLoading: authLoading, logout, openAuthModal } = useAuthStore();
  const [activeTab, setActiveTab] = useState<"users" | "sessions" | "audit">("users");

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [sessions, setSessions] = useState<ActiveSession[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [actionMsg, setActionMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const fetchAdminData = useCallback(async () => {
    setIsLoading(true);
    setActionMsg(null);
    try {
      const [usersRes, sessionsRes, auditRes] = await Promise.all([
        fetch("/api/admin/users", { credentials: "include" }),
        fetch("/api/admin/sessions", { credentials: "include" }),
        fetch("/api/admin/audit-logs", { credentials: "include" }),
      ]);

      if (usersRes.ok) {
        const uData = await usersRes.json();
        if (uData.success) setUsers(uData.users || []);
      }
      if (sessionsRes.ok) {
        const sData = await sessionsRes.json();
        if (sData.success) setSessions(sData.sessions || []);
      }
      if (auditRes.ok) {
        const aData = await auditRes.json();
        if (aData.success) setAuditLogs(aData.logs || []);
      }
    } catch (err) {
      console.error("Failed to load admin data:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated && user?.role === "admin") {
      fetchAdminData();
    }
  }, [isAuthenticated, user, fetchAdminData]);

  const handleUnlockUser = async (targetUserId: string, username: string) => {
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ action: "unlock", targetUserId }),
      });
      const data = await res.json();
      if (data.success) {
        setActionMsg({ type: "success", text: `Account @${username} has been unlocked!` });
        fetchAdminData();
      } else {
        setActionMsg({ type: "error", text: data.error || "Failed to unlock user." });
      }
    } catch {
      setActionMsg({ type: "error", text: "Network error occurred." });
    }
  };

  const handleRoleChange = async (targetUserId: string, newRole: string, username: string) => {
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ action: "set_role", targetUserId, newRole }),
      });
      const data = await res.json();
      if (data.success) {
        setActionMsg({ type: "success", text: `Role for @${username} changed to ${newRole}.` });
        fetchAdminData();
      } else {
        setActionMsg({ type: "error", text: data.error || "Failed to change role." });
      }
    } catch {
      setActionMsg({ type: "error", text: "Network error occurred." });
    }
  };

  const handleRevokeKey = async (targetUserId: string, username: string) => {
    if (!confirm(`Purge and revoke stored AI API keys for @${username}?`)) return;
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ action: "revoke_key", targetUserId }),
      });
      const data = await res.json();
      if (data.success) {
        setActionMsg({ type: "success", text: `AI credentials for @${username} revoked.` });
        fetchAdminData();
      }
    } catch {
      setActionMsg({ type: "error", text: "Failed to revoke key." });
    }
  };

  const handleDeleteUser = async (targetUserId: string, username: string) => {
    if (!confirm(`Are you sure you want to PERMANENTLY delete user @${username}?`)) return;
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ action: "delete_user", targetUserId }),
      });
      const data = await res.json();
      if (data.success) {
        setActionMsg({ type: "success", text: `User @${username} has been permanently removed.` });
        fetchAdminData();
      }
    } catch {
      setActionMsg({ type: "error", text: "Failed to delete user." });
    }
  };

  const handleRevokeSession = async (token: string) => {
    try {
      const res = await fetch("/api/admin/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ token }),
      });
      const data = await res.json();
      if (data.success) {
        setActionMsg({ type: "success", text: "Session revoked successfully." });
        fetchAdminData();
      }
    } catch {
      setActionMsg({ type: "error", text: "Failed to revoke session." });
    }
  };

  // Filter users by search term
  const filteredUsers = users.filter(
    (u) =>
      u.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (u.designation && u.designation.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const lockedUsersCount = users.filter((u) => u.isLocked).length;

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400">
        <RefreshCw className="w-6 h-6 animate-spin text-indigo-400 mr-2" />
        <span>Authenticating administrator privileges...</span>
      </div>
    );
  }

  // Access Denied Screen
  if (!isAuthenticated || user?.role !== "admin") {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full rounded-2xl border border-red-500/30 bg-slate-900/90 p-8 shadow-2xl text-center">
          <div className="w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center justify-center mx-auto mb-4 text-red-400">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Administrator Access Required</h2>
          <p className="text-sm text-slate-400 mb-6">
            You must be signed in with an Administrator account to access the security controls,
            user management, and Liquibase database audit portal.
          </p>

          <div className="flex flex-col gap-3">
            <button
              onClick={() => openAuthModal("signin")}
              className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm transition shadow-lg shadow-indigo-600/25"
            >
              Sign In as Administrator
            </button>
            <Link
              href="/"
              className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-sm transition"
            >
              Back to Architecture Studio
            </Link>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-800 text-left text-xs text-slate-400 bg-slate-950/60 p-3 rounded-lg">
            <div className="font-semibold text-slate-300 mb-1">Demo Admin Credentials:</div>
            <div>Username: <code className="text-indigo-400">admin@docarch.ai</code></div>
            <div>Password: <code className="text-indigo-400">AdminPassword2026!</code></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* Top Header */}
      <header className="border-b border-slate-800 bg-slate-900/70 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition flex items-center gap-1.5 text-xs font-semibold"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Studio</span>
            </Link>
            <div className="h-6 w-px bg-slate-800" />
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-amber-500 to-red-500 flex items-center justify-center text-white shadow-md shadow-red-500/20">
                <ShieldAlert className="w-4 h-4" />
              </div>
              <div>
                <h1 className="text-base font-bold text-white flex items-center gap-2">
                  <span>DocArch AI Admin Portal</span>
                  <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 border border-red-500/30">
                    Administrator
                  </span>
                </h1>
                <p className="text-[11px] text-slate-400">
                  User accounts, 3-attempt lockouts, active sessions & security logs
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={fetchAdminData}
              disabled={isLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin text-indigo-400" : ""}`} />
              <span>Refresh</span>
            </button>
            <button
              onClick={() => logout()}
              className="px-3 py-1.5 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/30 text-xs font-medium transition"
            >
              Sign Off
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Action feedback message */}
        {actionMsg && (
          <div
            className={`p-3 rounded-xl border flex items-center gap-2 text-xs font-medium animate-in fade-in ${
              actionMsg.type === "success"
                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                : "bg-red-500/10 border-red-500/30 text-red-300"
            }`}
          >
            {actionMsg.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
            )}
            <span>{actionMsg.text}</span>
          </div>
        )}

        {/* Overview Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/60 flex items-center justify-between">
            <div>
              <div className="text-xs text-slate-400 font-medium">Total Registered Users</div>
              <div className="text-2xl font-black text-white mt-1">{users.length}</div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <Users className="w-5 h-5" />
            </div>
          </div>

          <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/60 flex items-center justify-between">
            <div>
              <div className="text-xs text-slate-400 font-medium">Locked Accounts (2m Cooldown)</div>
              <div className="text-2xl font-black text-amber-400 mt-1">{lockedUsersCount}</div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <Lock className="w-5 h-5" />
            </div>
          </div>

          <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/60 flex items-center justify-between">
            <div>
              <div className="text-xs text-slate-400 font-medium">Active Live Sessions</div>
              <div className="text-2xl font-black text-cyan-400 mt-1">{sessions.length}</div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
              <Radio className="w-5 h-5" />
            </div>
          </div>

          <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/60 flex items-center justify-between">
            <div>
              <div className="text-xs text-slate-400 font-medium">Security Audit Events</div>
              <div className="text-2xl font-black text-purple-400 mt-1">{auditLogs.length}</div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
              <History className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
          <button
            onClick={() => setActiveTab("users")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition ${
              activeTab === "users"
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/25"
                : "text-slate-400 hover:text-white hover:bg-slate-800"
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Architect & User Directory ({users.length})</span>
          </button>

          <button
            onClick={() => setActiveTab("sessions")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition ${
              activeTab === "sessions"
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/25"
                : "text-slate-400 hover:text-white hover:bg-slate-800"
            }`}
          >
            <Globe className="w-4 h-4" />
            <span>Active Sessions ({sessions.length})</span>
          </button>

          <button
            onClick={() => setActiveTab("audit")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition ${
              activeTab === "audit"
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/25"
                : "text-slate-400 hover:text-white hover:bg-slate-800"
            }`}
          >
            <History className="w-4 h-4" />
            <span>Security Audit Trail ({auditLogs.length})</span>
          </button>
        </div>

        {/* TAB 1: USERS DIRECTORY */}
        {activeTab === "users" && (
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 overflow-hidden shadow-xl">
            {/* Search and filter bar */}
            <div className="p-4 border-b border-slate-800 flex items-center justify-between gap-4">
              <div className="relative w-full max-w-sm">
                <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Filter by username, email, designation..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-4 py-1.5 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="text-xs text-slate-400">
                Showing {filteredUsers.length} of {users.length} users
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950/80 text-[11px] text-slate-400 font-semibold uppercase tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="px-4 py-3">Architect</th>
                    <th className="px-4 py-3">Designation</th>
                    <th className="px-4 py-3">Role</th>
                    <th className="px-4 py-3">Status / Failed Attempts</th>
                    <th className="px-4 py-3">Registered</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                        No users matching filter criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((u) => (
                      <tr key={u.id} className="hover:bg-slate-800/30 transition">
                        <td className="px-4 py-3">
                          <div className="font-semibold text-white">@{u.username}</div>
                          <div className="text-[11px] text-slate-400">{u.email}</div>
                        </td>

                        <td className="px-4 py-3 text-slate-300 font-medium">
                          {u.designation || "Software Architect"}
                        </td>

                        <td className="px-4 py-3">
                          <select
                            value={u.role}
                            onChange={(e) => handleRoleChange(u.id, e.target.value, u.username)}
                            className="bg-slate-950 border border-slate-700 text-[11px] font-semibold rounded-lg px-2 py-1 text-slate-200 focus:outline-none focus:border-indigo-500"
                          >
                            <option value="architect">Architect</option>
                            <option value="admin">Administrator</option>
                            <option value="reviewer">Reviewer</option>
                          </select>
                        </td>

                        <td className="px-4 py-3">
                          {u.isLocked ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 animate-pulse">
                              <Lock className="w-3 h-3" />
                              <span>Locked ({u.lockWaitSeconds}s wait)</span>
                            </span>
                          ) : u.failedAttempts > 0 ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-yellow-500/10 text-yellow-300 border border-yellow-500/20">
                              <span>{u.failedAttempts}/3 failed</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                              <CheckCircle2 className="w-3 h-3" />
                              <span>Active</span>
                            </span>
                          )}
                        </td>

                        <td className="px-4 py-3 text-slate-400 text-[11px]">
                          {new Date(u.createdAt).toLocaleDateString()}
                        </td>

                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {u.isLocked && (
                              <button
                                onClick={() => handleUnlockUser(u.id, u.username)}
                                className="p-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 transition text-xs font-semibold flex items-center gap-1"
                                title="Unlock Account Instantly"
                              >
                                <Unlock className="w-3.5 h-3.5" />
                                <span>Unlock</span>
                              </button>
                            )}

                            <button
                              onClick={() => handleRevokeKey(u.id, u.username)}
                              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-amber-400 transition"
                              title="Revoke and wipe stored AI keys"
                            >
                              <Key className="w-3.5 h-3.5" />
                            </button>

                            <button
                              onClick={() => handleDeleteUser(u.id, u.username)}
                              className="p-1.5 rounded-lg bg-slate-800 hover:bg-red-500/20 text-slate-400 hover:text-red-400 transition"
                              title="Delete User"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 2: ACTIVE SESSIONS */}
        {activeTab === "sessions" && (
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 overflow-hidden shadow-xl">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white">Live User Sessions</h3>
                <p className="text-xs text-slate-400">
                  Track active sessions with remote revocation capabilities
                </p>
              </div>
              <div className="text-xs text-cyan-400 font-mono">
                {sessions.length} sessions active
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950/80 text-[11px] text-slate-400 font-semibold uppercase tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="px-4 py-3">User ID</th>
                    <th className="px-4 py-3">Session Token</th>
                    <th className="px-4 py-3">IP Address</th>
                    <th className="px-4 py-3">Client / Browser</th>
                    <th className="px-4 py-3">Expires At</th>
                    <th className="px-4 py-3 text-right">Revoke</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {sessions.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                        No active sessions found.
                      </td>
                    </tr>
                  ) : (
                    sessions.map((s) => (
                      <tr key={s.id} className="hover:bg-slate-800/30 transition">
                        <td className="px-4 py-3 font-mono text-[11px] text-indigo-400">
                          {s.user_id.slice(0, 12)}...
                        </td>
                        <td className="px-4 py-3 font-mono text-[10px] text-slate-400">
                          {s.session_token.slice(0, 16)}...
                        </td>
                        <td className="px-4 py-3 font-mono text-slate-300">
                          {s.ip_address || "127.0.0.1"}
                        </td>
                        <td className="px-4 py-3 text-slate-400 max-w-xs truncate text-[11px]">
                          {s.user_agent || "Browser Client"}
                        </td>
                        <td className="px-4 py-3 text-slate-400 text-[11px]">
                          {new Date(s.expires_at).toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => handleRevokeSession(s.session_token)}
                            className="px-2 py-1 rounded bg-red-500/20 hover:bg-red-500/30 text-red-300 text-[10px] font-semibold transition"
                          >
                            Terminate
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 3: AUDIT TRAIL */}
        {activeTab === "audit" && (
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 overflow-hidden shadow-xl">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white">Security & Audit Event Logs</h3>
                <p className="text-xs text-slate-400">
                  Real-time recording of login attempts, lockouts, password resets & admin updates
                </p>
              </div>
              <div className="text-xs text-purple-400 font-mono">
                {auditLogs.length} events logged
              </div>
            </div>

            <div className="divide-y divide-slate-800/60 max-h-[600px] overflow-y-auto">
              {auditLogs.length === 0 ? (
                <div className="p-8 text-center text-slate-500 text-xs">
                  No security events recorded yet.
                </div>
              ) : (
                auditLogs.map((log) => (
                  <div key={log.id} className="p-3.5 px-4 hover:bg-slate-800/30 transition flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-[10px] font-bold font-mono px-2 py-0.5 rounded-full uppercase ${
                            log.action.includes("SUCCESS")
                              ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                              : log.action.includes("LOCKED")
                              ? "bg-red-500/20 text-red-300 border border-red-500/30"
                              : log.action.includes("FAILED")
                              ? "bg-yellow-500/20 text-yellow-300 border border-yellow-500/30"
                              : log.action.includes("RESET")
                              ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30"
                              : "bg-indigo-500/20 text-indigo-300 border border-indigo-500/30"
                          }`}
                        >
                          {log.action}
                        </span>
                        <span className="text-[11px] text-slate-400">
                          {new Date(log.created_at).toLocaleString()}
                        </span>
                      </div>
                      <div className="text-xs text-slate-200">{log.details}</div>
                    </div>
                    {log.ip_address && (
                      <div className="text-[10px] font-mono text-slate-500 shrink-0">
                        IP: {log.ip_address}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
