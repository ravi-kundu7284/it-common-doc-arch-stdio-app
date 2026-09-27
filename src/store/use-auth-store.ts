import { create } from "zustand";

export interface UserProfile {
  id: string;
  username: string;
  email: string;
  fullName?: string;
  designation?: string;
  role?: string; // 'architect' | 'admin' | 'reviewer'
  lastLoginAt?: string;
}

export interface UserAiConfigInfo {
  provider: "builtin" | "openai" | "gemini" | "anthropic";
  modelName: string;
  keyLast4?: string | null;
  hasKey: boolean;
  expiresAt?: string | null;
  expiresInDays?: number;
  daysRemaining?: number | null;
  isKeyActive: boolean;
}

interface AuthState {
  user: UserProfile | null;
  aiConfig: UserAiConfigInfo | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isAuthModalOpen: boolean;
  authModalMode: "signin" | "signup" | "forgot" | "reset";
  activeResetToken: string | null;

  // Actions
  checkSession: () => Promise<void>;
  login: (identifier: string, password: string) => Promise<{
    success: boolean;
    error?: string;
    isLocked?: boolean;
    waitSeconds?: number;
    isRateLimited?: boolean;
    retryAfterSeconds?: number;
    attemptsRemaining?: number;
  }>;
  register: (
    username: string,
    email: string,
    password: string,
    fullName?: string,
    designation?: string
  ) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  forgotPassword: (email: string) => Promise<{
    success: boolean;
    message?: string;
    error?: string;
    previewResetLink?: string;
    previewToken?: string;
  }>;
  resetPassword: (
    token: string,
    newPassword: string
  ) => Promise<{ success: boolean; message?: string; error?: string }>;
  saveAiConfig: (
    provider: string,
    modelName: string,
    apiKey: string,
    expiresInDays: number
  ) => Promise<{ success: boolean; error?: string; message?: string }>;
  deleteAiConfig: () => Promise<{ success: boolean; error?: string }>;
  openAuthModal: (
    mode?: "signin" | "signup" | "forgot" | "reset",
    resetToken?: string
  ) => void;
  closeAuthModal: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  aiConfig: null,
  isAuthenticated: false,
  isLoading: true,
  isAuthModalOpen: false,
  authModalMode: "signin",
  activeResetToken: null,

  checkSession: async () => {
    try {
      set({ isLoading: true });
      const res = await fetch("/api/auth/me", { credentials: "include" });
      const data = await res.json();

      if (data.authenticated && data.user) {
        set({
          user: data.user,
          aiConfig: data.aiConfig || null,
          isAuthenticated: true,
          isLoading: false,
        });
      } else {
        set({
          user: null,
          aiConfig: null,
          isAuthenticated: false,
          isLoading: false,
        });
      }
    } catch (err) {
      console.error("Session check failed:", err);
      set({ user: null, aiConfig: null, isAuthenticated: false, isLoading: false });
    }
  },

  login: async (identifier, password) => {
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ identifier, password }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        return {
          success: false,
          error: data.error || "Login failed",
          isLocked: data.isLocked,
          waitSeconds: data.waitSeconds,
          isRateLimited: data.isRateLimited,
          retryAfterSeconds: data.retryAfterSeconds,
          attemptsRemaining: data.attemptsRemaining,
        };
      }

      set({
        user: data.user,
        isAuthenticated: true,
        isAuthModalOpen: false,
      });

      // Refresh session state to load AI config
      await get().checkSession();
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || "Network error" };
    }
  },

  register: async (username, email, password, fullName, designation) => {
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ username, email, password, fullName, designation }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        return { success: false, error: data.error || "Registration failed" };
      }

      set({
        user: data.user,
        isAuthenticated: true,
        isAuthModalOpen: false,
      });

      await get().checkSession();
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || "Network error" };
    }
  },

  forgotPassword: async (email: string) => {
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        return { success: false, error: data.error || "Failed to initiate reset." };
      }
      return {
        success: true,
        message: data.message,
        previewResetLink: data.previewResetLink,
        previewToken: data.previewToken,
      };
    } catch (err: any) {
      return { success: false, error: err.message || "Network error" };
    }
  },

  resetPassword: async (token: string, newPassword: string) => {
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        return { success: false, error: data.error || "Password reset failed." };
      }
      return { success: true, message: data.message };
    } catch (err: any) {
      return { success: false, error: err.message || "Network error" };
    }
  },

  logout: async () => {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });
      set({
        user: null,
        aiConfig: null,
        isAuthenticated: false,
      });
    } catch (err) {
      console.error("Logout error:", err);
    }
  },

  saveAiConfig: async (provider, modelName, apiKey, expiresInDays) => {
    try {
      const res = await fetch("/api/user/ai-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ provider, modelName, apiKey, expiresInDays }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        return { success: false, error: data.error || "Failed to save AI configuration" };
      }

      set({ aiConfig: data.config });
      return { success: true, message: data.message };
    } catch (err: any) {
      return { success: false, error: err.message || "Network error" };
    }
  },

  deleteAiConfig: async () => {
    try {
      const res = await fetch("/api/user/ai-config", {
        method: "DELETE",
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        return { success: false, error: data.error || "Failed to delete API key" };
      }

      set({ aiConfig: null });
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || "Network error" };
    }
  },

  openAuthModal: (mode = "signin", resetToken?: string) => {
    set({
      isAuthModalOpen: true,
      authModalMode: mode,
      activeResetToken: resetToken || null,
    });
  },

  closeAuthModal: () => {
    set({ isAuthModalOpen: false, activeResetToken: null });
  },
}));
