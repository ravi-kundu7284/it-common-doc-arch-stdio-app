"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/use-auth-store";
import { LoginLanding } from "@/components/login-landing";

export default function LoginPage() {
  const { user, isAuthenticated, isLoading, checkSession } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    checkSession();
  }, []);

  useEffect(() => {
    if (isAuthenticated || user) {
      router.push("/");
    }
  }, [isAuthenticated, user, router]);

  if (isLoading && !isAuthenticated && !user) {
    return (
      <div className="min-h-screen bg-[#090d16] flex items-center justify-center text-slate-400 text-sm">
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
          <span>Verifying credentials...</span>
        </div>
      </div>
    );
  }

  return <LoginLanding />;
}
