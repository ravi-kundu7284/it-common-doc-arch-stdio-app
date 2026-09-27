"use client";

import React, { useState, useEffect } from "react";
import { useAuthStore } from "@/store/use-auth-store";
import {
  ShieldCheck,
  Lock,
  Mail,
  User,
  X,
  Eye,
  EyeOff,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Briefcase,
  KeyRound,
  RotateCcw,
  Clock,
} from "lucide-react";

export const AuthModal: React.FC = () => {
  const {
    isAuthModalOpen,
    closeAuthModal,
    authModalMode,
    activeResetToken,
    login,
    register,
    forgotPassword,
    resetPassword,
  } = useAuthStore();

  const [mode, setMode] = useState<"signin" | "signup" | "forgot" | "reset">(authModalMode);

  // Form states
  const [identifier, setIdentifier] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [designation, setDesignation] = useState("Principal Solutions Architect");
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [resetToken, setResetToken] = useState(activeResetToken || "");
  const [showPassword, setShowPassword] = useState(false);

  // Lockout & Rate Limit states
  const [lockoutSeconds, setLockoutSeconds] = useState<number | null>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [devResetLink, setDevResetLink] = useState<string | null>(null);

  // Sync mode from store
  useEffect(() => {
    setMode(authModalMode);
    if (activeResetToken) {
      setResetToken(activeResetToken);
    }
    setErrorMsg(null);
    setSuccessMsg(null);
  }, [authModalMode, activeResetToken]);

  // Lockout countdown timer
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

  if (!isAuthModalOpen) return null;

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
      setSuccessMsg("Signed in successfully!");
      setLockoutSeconds(null);
      setTimeout(() => {
        closeAuthModal();
      }, 500);
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
      setSuccessMsg("Account created and signed in!");
      setTimeout(() => {
        closeAuthModal();
      }, 500);
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
      setSuccessMsg(result.message || "Password reset link sent to your email!");
      if (result.previewResetLink) {
        setDevResetLink(result.previewResetLink);
      }
      if (result.previewToken) {
        setResetToken(result.previewToken);
      }
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
      setTimeout(() => {
        setMode("signin");
      }, 1200);
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in">
      <div className="relative w-full max-w-md rounded-2xl border border-slate-700/80 bg-slate-900 shadow-2xl p-6 sm:p-8 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-500 to-cyan-500 flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100">
                {mode === "signin" && "Sign In to DocArch AI"}
                {mode === "signup" && "Create Architect Account"}
                {mode === "forgot" && "Reset Password via Email"}
                {mode === "reset" && "Set New Password"}
              </h3>
              <p className="text-[11px] text-slate-400">
                Secure session management & encrypted credentials
              </p>
            </div>
          </div>
          <button
            onClick={closeAuthModal}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab switch between Sign In and Sign Up */}
        {(mode === "signin" || mode === "signup") && (
          <div className="grid grid-cols-2 gap-1 p-1 bg-slate-950 rounded-xl my-5 border border-slate-800">
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

        {/* Feedback Alerts */}
        {errorMsg && (
          <div className="mb-4 p-3 rounded-xl border border-red-500/40 bg-red-500/10 text-red-300 text-xs flex items-start gap-2 animate-in fade-in">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <div className="flex-1">{errorMsg}</div>
          </div>
        )}

        {lockoutSeconds && lockoutSeconds > 0 && (
          <div className="mb-4 p-3 rounded-xl border border-amber-500/40 bg-amber-500/10 text-amber-300 text-xs flex items-center justify-between animate-pulse">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-400 shrink-0" />
              <span>Cooldown Active (Rate Limit / Lockout)</span>
            </div>
            <span className="font-mono font-bold text-sm bg-amber-500/20 px-2 py-0.5 rounded">
              {lockoutSeconds}s
            </span>
          </div>
        )}

        {successMsg && (
          <div className="mb-4 p-3 rounded-xl border border-emerald-500/40 bg-emerald-500/10 text-emerald-300 text-xs flex items-start gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <div className="flex-1">{successMsg}</div>
          </div>
        )}

        {/* MODE: SIGN IN */}
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
                <span>Rule: 3 failed attempts = 2 min lockout</span>
                <span>Max 5 attempts/min</span>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading || Boolean(lockoutSeconds && lockoutSeconds > 0)}
              className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold text-xs transition shadow-lg shadow-indigo-600/25 flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <span>Verifying credentials...</span>
              ) : lockoutSeconds && lockoutSeconds > 0 ? (
                <span>Locked (Wait {lockoutSeconds}s)</span>
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>

            {/* Quick Demo Credentials */}
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

        {/* MODE: SIGN UP */}
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
                <span>Registering account...</span>
              ) : (
                <>
                  <span>Create Account & Sign In</span>
                  <Sparkles className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </form>
        )}

        {/* MODE: FORGOT PASSWORD */}
        {mode === "forgot" && (
          <form onSubmit={handleForgotPassword} className="space-y-4">
            <p className="text-xs text-slate-300 leading-relaxed">
              Enter your registered corporate email address. We will generate a secure,
              time-limited password reset link valid for 15 minutes.
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

        {/* MODE: RESET PASSWORD */}
        {mode === "reset" && (
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Password Reset Token
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
  );
};
