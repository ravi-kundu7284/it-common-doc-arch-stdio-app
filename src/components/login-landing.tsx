"use client";

import React, { useState, useEffect } from "react";
import { useAuthStore } from "@/store/use-auth-store";
import {
  Layers,
  ShieldCheck,
  Lock,
  Mail,
  User,
  Eye,
  EyeOff,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Briefcase,
  KeyRound,
  Clock,
  Cpu,
  FileText,
  Database,
  Terminal,
} from "lucide-react";

export const LoginLanding: React.FC = () => {
  const { login, register, forgotPassword, resetPassword } = useAuthStore();

  const [mode, setMode] = useState<"signin" | "signup" | "forgot" | "reset">("signin");

  // Form states
  const [identifier, setIdentifier] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [designation, setDesignation] = useState("Principal Solutions Architect");
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Rate limit / Lockout timer
  const [lockoutSeconds, setLockoutSeconds] = useState<number | null>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [devResetLink, setDevResetLink] = useState<string | null>(null);

  // Countdown timer
  useEffect(() => {
    if (lockoutSeconds === null || lockoutSeconds <= 0) return;
    const interval = setInterval(() => {
      setLockoutSeconds((prev) => {
        if (prev === null || prev <= 1) {
          setErrorMsg(null);
          return null;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [lockoutSeconds]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (lockoutSeconds && lockoutSeconds > 0) return;

    setErrorMsg(null);
    setIsLoading(true);

    const result = await login(identifier, password);
    setIsLoading(false);

    if (!result.success) {
      setErrorMsg(result.error || "Failed to sign in. Please verify your credentials.");
      if (result.isLocked && result.waitSeconds) {
        setLockoutSeconds(result.waitSeconds);
      } else if (result.isRateLimited && result.retryAfterSeconds) {
        setLockoutSeconds(result.retryAfterSeconds);
      }
    } else {
      setSuccessMsg("Signed in successfully! Loading Architecture Studio...");
      setLockoutSeconds(null);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsLoading(true);

    const result = await register(username, email, password, fullName, designation);
    setIsLoading(false);

    if (!result.success) {
      setErrorMsg(result.error || "Failed to create account.");
    } else {
      setSuccessMsg("Account created and signed in! Loading Architecture Studio...");
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setDevResetLink(null);
    setIsLoading(true);

    const result = await forgotPassword(email);
    setIsLoading(false);

    if (!result.success) {
      setErrorMsg(result.error || "Failed to send reset link.");
    } else {
      setSuccessMsg(result.message || "Password reset link sent to your corporate email!");
      if (result.previewResetLink) setDevResetLink(result.previewResetLink);
      if (result.previewToken) setResetToken(result.previewToken);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setIsLoading(true);

    const result = await resetPassword(resetToken, newPassword);
    setIsLoading(false);

    if (!result.success) {
      setErrorMsg(result.error || "Failed to reset password.");
    } else {
      setSuccessMsg(result.message || "Password updated! You can now sign in.");
      setTimeout(() => setMode("signin"), 1200);
    }
  };

  const fillDemoAccount = (role: "architect" | "admin") => {
    if (role === "admin") {
      setIdentifier("admin@docarch.ai");
      setPassword("AdminPassword2026!");
    } else {
      setIdentifier("architect@docarch.ai");
      setPassword("Architect123!");
    }
    setErrorMsg(null);
    setLockoutSeconds(null);
  };

  return (
    <div className="min-h-screen bg-[#090d16] text-slate-100 flex flex-col justify-between relative overflow-hidden">
      {/* Background glow effects */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-indigo-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 -right-40 w-96 h-96 bg-cyan-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top Navbar */}
      <header className="border-b border-slate-800/80 bg-slate-950/60 backdrop-blur-md px-6 py-4 flex items-center justify-between relative z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 via-purple-600 to-cyan-500 flex items-center justify-center text-white shadow-lg shadow-indigo-500/25">
            <Layers className="w-5 h-5 text-white" />
          </div>
          <div>
            <span className="font-extrabold text-base tracking-tight text-white">
              DocArch <span className="text-cyan-400">AI</span>
            </span>
            <div className="text-[10px] text-slate-400 font-mono tracking-widest uppercase">
              Enterprise Architecture Studio
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-[11px] text-slate-400 hidden sm:inline font-mono">
            Security: PBKDF2 + AES-256-GCM + Liquibase
          </span>
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
        </div>
      </header>

      {/* Main Landing Area */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-10 flex flex-col lg:flex-row items-center justify-center gap-12 relative z-10">
        {/* Left Column: Hero & Value Proposition */}
        <div className="flex-1 max-w-xl space-y-6 text-center lg:text-left">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-medium">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span>AI-Driven Technical Design & Architecture Studio</span>
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white tracking-tight leading-tight">
            Design, Validate & Export{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-cyan-400 to-purple-400">
              Distributed Architectures
            </span>{" "}
            in Minutes.
          </h1>

          <p className="text-sm sm:text-base text-slate-400 leading-relaxed">
            Generate production-grade High-Level (HLD) and Low-Level (LLD) design specifications,
            interactive Mermaid topology diagrams, and multi-cloud tech stack recommendations with
            enterprise-grade security.
          </p>

          {/* Key Feature Bullets */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-left">
            <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-slate-900/60 border border-slate-800">
              <Cpu className="w-4 h-4 text-cyan-400 mt-0.5 shrink-0" />
              <div>
                <div className="text-xs font-semibold text-slate-200">6-Layer Tech Stack</div>
                <div className="text-[11px] text-slate-400">FinTech, Healthcare, E-Comm, IoT</div>
              </div>
            </div>

            <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-slate-900/60 border border-slate-800">
              <FileText className="w-4 h-4 text-indigo-400 mt-0.5 shrink-0" />
              <div>
                <div className="text-xs font-semibold text-slate-200">Mermaid & HTML Export</div>
                <div className="text-[11px] text-slate-400">C4, Sequences, Tables & Standalone HTML</div>
              </div>
            </div>

            <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-slate-900/60 border border-slate-800">
              <ShieldCheck className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
              <div>
                <div className="text-xs font-semibold text-slate-200">Confidential Key Vault</div>
                <div className="text-[11px] text-slate-400">AES-256-GCM with Auto-Expiry Purge</div>
              </div>
            </div>

            <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-slate-900/60 border border-slate-800">
              <Database className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
              <div>
                <div className="text-xs font-semibold text-slate-200">Liquibase & Supabase</div>
                <div className="text-[11px] text-slate-400">RDBMS migrations & audit trail</div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Authentication Card */}
        <div className="w-full max-w-md">
          <div className="rounded-2xl border border-slate-700/80 bg-slate-900/90 shadow-2xl p-6 sm:p-8 backdrop-blur-xl relative">
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-500 to-cyan-500 flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-100">
                    {mode === "signin" && "Sign In to Studio"}
                    {mode === "signup" && "Create Architect Account"}
                    {mode === "forgot" && "Reset Password via Email"}
                    {mode === "reset" && "Set New Password"}
                  </h2>
                  <p className="text-[11px] text-slate-400">
                    Enterprise session & credential security
                  </p>
                </div>
              </div>
            </div>

            {/* Tab switch between Sign In and Sign Up */}
            {(mode === "signin" || mode === "signup") && (
              <div className="grid grid-cols-2 gap-1 p-1 bg-slate-950 rounded-xl my-4 border border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setMode("signin");
                    setErrorMsg(null);
                  }}
                  className={`py-1.5 text-xs font-semibold rounded-lg transition ${
                    mode === "signin"
                      ? "bg-indigo-600 text-white shadow-sm"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMode("signup");
                    setErrorMsg(null);
                  }}
                  className={`py-1.5 text-xs font-semibold rounded-lg transition ${
                    mode === "signup"
                      ? "bg-indigo-600 text-white shadow-sm"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  Create Account
                </button>
              </div>
            )}

            {/* Error Message */}
            {errorMsg && (
              <div className="mb-4 p-3 rounded-xl border border-red-500/40 bg-red-500/10 text-red-300 text-xs flex items-start gap-2 animate-in fade-in">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <div className="flex-1">{errorMsg}</div>
              </div>
            )}

            {/* Lockout / Rate Limit Cooldown Notification */}
            {lockoutSeconds && lockoutSeconds > 0 && (
              <div className="mb-4 p-3 rounded-xl border border-amber-500/40 bg-amber-500/10 text-amber-300 text-xs flex items-center justify-between animate-pulse">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>Cooldown Active</span>
                </div>
                <span className="font-mono font-bold text-sm bg-amber-500/20 px-2 py-0.5 rounded">
                  {lockoutSeconds}s wait
                </span>
              </div>
            )}

            {/* Success Message */}
            {successMsg && (
              <div className="mb-4 p-3 rounded-xl border border-emerald-500/40 bg-emerald-500/10 text-emerald-300 text-xs flex items-start gap-2 animate-in fade-in">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div className="flex-1">{successMsg}</div>
              </div>
            )}

            {/* SIGN IN FORM */}
            {mode === "signin" && (
              <form onSubmit={handleSignIn} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Username or Email
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                      placeholder="architect@company.com or username"
                      className="w-full pl-9 pr-3.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-medium text-slate-300">Password</label>
                    <button
                      type="button"
                      onClick={() => {
                        setMode("forgot");
                        setErrorMsg(null);
                      }}
                      className="text-[11px] text-indigo-400 hover:text-indigo-300 transition"
                    >
                      Forgot Password?
                    </button>
                  </div>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your password"
                      className="w-full pl-9 pr-10 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <div className="mt-1 text-[10px] text-slate-400 flex items-center justify-between">
                    <span>3 failed attempts = 2m lockout</span>
                    <span>Max 3 attempts/min</span>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading || Boolean(lockoutSeconds && lockoutSeconds > 0)}
                  className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold text-xs transition shadow-lg shadow-indigo-600/25 flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <span>Verifying session...</span>
                  ) : lockoutSeconds && lockoutSeconds > 0 ? (
                    <span>Locked (Wait {lockoutSeconds}s)</span>
                  ) : (
                    <>
                      <span>Enter Architecture Studio</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>

                {/* Instant Demo Credentials */}
                <div className="pt-2 border-t border-slate-800">
                  <div className="text-[10px] text-slate-400 mb-1.5 font-medium">Quick Demo Accounts:</div>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => fillDemoAccount("architect")}
                      className="py-1 px-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-[10px] text-slate-300 font-mono transition text-left"
                    >
                      <span className="text-indigo-400 font-bold">Architect</span> (Demo)
                    </button>
                    <button
                      type="button"
                      onClick={() => fillDemoAccount("admin")}
                      className="py-1 px-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-[10px] text-slate-300 font-mono transition text-left"
                    >
                      <span className="text-red-400 font-bold">Admin</span> (Super)
                    </button>
                  </div>
                </div>
              </form>
            )}

            {/* SIGN UP FORM WITH DESIGNATION */}
            {mode === "signup" && (
              <form onSubmit={handleSignUp} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Username</label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="e.g. ravi_architect"
                      className="w-full pl-9 pr-3.5 py-1.5 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Corporate Email</label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@enterprise.com"
                      className="w-full pl-9 pr-3.5 py-1.5 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Professional Designation
                  </label>
                  <div className="relative">
                    <Briefcase className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={designation}
                      onChange={(e) => setDesignation(e.target.value)}
                      placeholder="e.g. Principal Enterprise Architect"
                      className="w-full pl-9 pr-3.5 py-1.5 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Password</label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      minLength={8}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Minimum 8 characters"
                      className="w-full pl-9 pr-10 py-1.5 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold text-xs transition shadow-lg shadow-indigo-600/25 flex items-center justify-center gap-2 mt-2"
                >
                  {isLoading ? (
                    <span>Registering credentials...</span>
                  ) : (
                    <>
                      <span>Create Account & Enter Studio</span>
                      <Sparkles className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </form>
            )}

            {/* FORGOT PASSWORD FORM */}
            {mode === "forgot" && (
              <form onSubmit={handleForgotPassword} className="space-y-4">
                <p className="text-xs text-slate-300 leading-relaxed">
                  Enter your registered corporate email address to receive a secure, 15-minute
                  password reset token.
                </p>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">Email Address</label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="architect@company.com"
                      className="w-full pl-9 pr-3.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                {devResetLink && (
                  <div className="p-3 bg-slate-950 border border-indigo-500/40 rounded-xl text-xs space-y-1.5">
                    <div className="font-semibold text-indigo-300 flex items-center gap-1.5">
                      <KeyRound className="w-3.5 h-3.5" />
                      <span>Password Reset Token Generated:</span>
                    </div>
                    <div className="font-mono text-[10px] text-slate-400 break-all bg-slate-900 p-2 rounded border border-slate-800">
                      {resetToken}
                    </div>
                    <button
                      type="button"
                      onClick={() => setMode("reset")}
                      className="text-xs text-cyan-400 hover:underline font-semibold block mt-1"
                    >
                      Proceed to Reset Password Now &rarr;
                    </button>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold text-xs transition shadow-lg shadow-indigo-600/25 flex items-center justify-center gap-2"
                >
                  {isLoading ? <span>Dispatching email...</span> : <span>Send Reset Link</span>}
                </button>

                <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-xs">
                  <button
                    type="button"
                    onClick={() => setMode("signin")}
                    className="text-slate-400 hover:text-white"
                  >
                    &larr; Back to Sign In
                  </button>
                  <button
                    type="button"
                    onClick={() => setMode("reset")}
                    className="text-indigo-400 hover:text-indigo-300"
                  >
                    Have a token? Reset password
                  </button>
                </div>
              </form>
            )}

            {/* RESET PASSWORD FORM */}
            {mode === "reset" && (
              <form onSubmit={handleResetPassword} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Reset Token
                  </label>
                  <div className="relative">
                    <KeyRound className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      value={resetToken}
                      onChange={(e) => setResetToken(e.target.value)}
                      placeholder="Paste 64-character token"
                      className="w-full pl-9 pr-3.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    New Password
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      minLength={8}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Minimum 8 characters"
                      className="w-full pl-9 pr-10 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold text-xs transition shadow-lg shadow-indigo-600/25 flex items-center justify-center gap-2"
                >
                  {isLoading ? <span>Updating password...</span> : <span>Confirm New Password</span>}
                </button>

                <div className="text-center pt-2 border-t border-slate-800 text-xs">
                  <button
                    type="button"
                    onClick={() => setMode("signin")}
                    className="text-slate-400 hover:text-white"
                  >
                    &larr; Back to Sign In
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-950/80 py-4 px-6 text-center text-xs text-slate-500 relative z-10">
        DocArch AI Enterprise &bull; System Architecture & Technical Design Document Studio
      </footer>
    </div>
  );
};
