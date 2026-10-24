"use client";

import React, { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, AlertCircle, Loader2, Mail, ArrowRight, ShieldCheck } from "lucide-react";
import { useAuthStore } from "@/store/use-auth-store";

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const statusParam = searchParams.get("status");
  const errorParam = searchParams.get("error");

  const [loading, setLoading] = useState<boolean>(Boolean(token && !statusParam));
  const [success, setSuccess] = useState<boolean>(statusParam === "success");
  const [error, setError] = useState<string | null>(errorParam ? decodeURIComponent(errorParam) : null);
  const [resendEmail, setResendEmail] = useState<string>("");
  const [resendLoading, setResendLoading] = useState<boolean>(false);
  const [resendMessage, setResendMessage] = useState<string | null>(null);

  const { user, checkSession } = useAuthStore();

  useEffect(() => {
    if (user?.email && !resendEmail) {
      setResendEmail(user.email);
    }
  }, [user, resendEmail]);

  useEffect(() => {
    if (!token || statusParam) return;

    let mounted = true;
    const verifyToken = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch("/api/auth/verify-email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });
        const data = await res.json();
        if (mounted) {
          if (res.ok && data.success) {
            setSuccess(true);
            // Refresh local auth session to reflect email_verified_at
            checkSession().catch(() => {});
          } else {
            setError(data.error || "Invalid or expired verification link.");
          }
        }
      } catch (err: any) {
        if (mounted) {
          setError("Network error while verifying email. Please check your connection.");
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };

    verifyToken();
    return () => {
      mounted = false;
    };
  }, [token, statusParam, checkSession]);

  const handleResend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (resendLoading) return;

    setResendLoading(true);
    setResendMessage(null);
    try {
      const res = await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: resendEmail.trim() || undefined }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setResendMessage(data.message || "A new verification link has been sent to your email.");
      } else {
        setError(data.error || "Failed to resend verification link.");
      }
    } catch {
      setError("Network error while resending link. Please try again.");
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center px-4 py-12 relative overflow-hidden">
      {/* Background radial glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl relative z-10">
        <div className="flex items-center justify-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shadow-inner">
            <ShieldCheck className="w-8 h-8" />
          </div>
        </div>

        <h1 className="text-2xl font-bold text-center text-slate-100 mb-2">
          Email Verification
        </h1>

        {loading ? (
          <div className="py-8 flex flex-col items-center justify-center space-y-4">
            <Loader2 className="w-10 h-10 text-indigo-400 animate-spin" />
            <p className="text-sm text-slate-400 font-medium">
              Verifying your email address security token...
            </p>
          </div>
        ) : success ? (
          <div className="space-y-6 text-center py-4">
            <div className="flex justify-center">
              <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/40">
                <CheckCircle2 className="w-7 h-7" />
              </div>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-emerald-400">
                Email Successfully Verified!
              </h2>
              <p className="text-sm text-slate-400 mt-2">
                Thank you for verifying your email address. Your account is now fully verified with unrestricted access to architectural tools, document exports, and collaboration.
              </p>
            </div>
            <Link
              href="/"
              className="inline-flex items-center justify-center w-full px-5 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium shadow-lg transition-colors group"
            >
              <span>Continue to Studio</span>
              <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        ) : (
          <div className="space-y-6 py-2">
            {error && (
              <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 flex items-start space-x-3 text-red-300 text-sm">
                <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {resendMessage && (
              <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-start space-x-3 text-emerald-300 text-sm">
                <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <span>{resendMessage}</span>
              </div>
            )}

            <div className="text-sm text-slate-400 text-center">
              {token
                ? "The verification link may have expired (24h) or has already been used."
                : "Please enter your registered email address to receive a fresh verification link."}
            </div>

            <form onSubmit={handleResend} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    value={resendEmail}
                    onChange={(e) => setResendEmail(e.target.value)}
                    placeholder="architect@company.com"
                    className="w-full bg-slate-950/80 border border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={resendLoading || !resendEmail}
                className="w-full flex items-center justify-center px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-medium text-sm transition-colors shadow-md"
              >
                {resendLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Sending Link...
                  </>
                ) : (
                  "Resend Verification Link"
                )}
              </button>
            </form>

            <div className="text-center pt-2">
              <Link
                href="/"
                className="text-xs text-slate-400 hover:text-slate-200 transition-colors inline-flex items-center"
              >
                Return to Architecture Studio
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
        </div>
      }
    >
      <VerifyEmailContent />
    </Suspense>
  );
}
