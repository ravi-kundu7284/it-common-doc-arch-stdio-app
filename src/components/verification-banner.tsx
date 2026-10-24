"use client";

import React, { useState, useEffect } from "react";
import { AlertTriangle, Mail, X, CheckCircle, Loader2 } from "lucide-react";
import { useAuthStore } from "@/store/use-auth-store";

export function VerificationBanner() {
  const { user, isAuthenticated } = useAuthStore();
  const [dismissed, setDismissed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sentMessage, setSentMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Check if dismissed previously in this browser session
    const isDismissed = sessionStorage.getItem("dismiss_email_verification_banner");
    if (isDismissed === "true") {
      setDismissed(true);
    }
  }, []);

  // Show banner only if user is logged in, email is unverified, and banner not dismissed
  if (!isAuthenticated || !user || user.emailVerifiedAt || dismissed) {
    return null;
  }

  const handleDismiss = () => {
    setDismissed(true);
    try {
      sessionStorage.setItem("dismiss_email_verification_banner", "true");
    } catch {}
  };

  const handleResend = async () => {
    if (loading) return;
    setLoading(true);
    setError(null);
    setSentMessage(null);

    try {
      const res = await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: user.email }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSentMessage("Verification link sent! Check your inbox.");
        setTimeout(() => setSentMessage(null), 5000);
      } else {
        setError(data.error || "Failed to resend link. Please wait a moment.");
        setTimeout(() => setError(null), 5000);
      }
    } catch {
      setError("Network error. Please try again later.");
      setTimeout(() => setError(null), 5000);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full bg-amber-500/10 border-b border-amber-500/20 text-amber-200 px-4 py-2.5 text-xs sm:text-sm flex items-center justify-between transition-all duration-300">
      <div className="flex items-center space-x-2.5 overflow-hidden">
        <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />
        <span className="truncate">
          <strong>Email Verification Required:</strong> Your email (
          <span className="font-mono text-amber-300">{user.email}</span>) is unverified.
          Verify to unlock high-capacity exports and administrative governance.
        </span>
      </div>

      <div className="flex items-center space-x-3 flex-shrink-0 ml-3">
        {sentMessage ? (
          <span className="inline-flex items-center text-emerald-400 font-medium text-xs">
            <CheckCircle className="w-3.5 h-3.5 mr-1" />
            {sentMessage}
          </span>
        ) : error ? (
          <span className="inline-flex items-center text-red-400 font-medium text-xs">
            {error}
          </span>
        ) : (
          <button
            onClick={handleResend}
            disabled={loading}
            className="inline-flex items-center px-2.5 py-1 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 font-medium transition-colors disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Mail className="w-3 h-3 mr-1" />
                Resend Link
              </>
            )}
          </button>
        )}

        <button
          onClick={handleDismiss}
          className="p-1 rounded hover:bg-amber-500/20 text-amber-400/80 hover:text-amber-200 transition-colors"
          title="Dismiss banner for this session"
          aria-label="Dismiss banner"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
