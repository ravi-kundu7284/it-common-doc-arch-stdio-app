"use client";

import React, { useState, useEffect } from "react";
import { useDocStore } from "@/store/use-doc-store";
import { useAuthStore } from "@/store/use-auth-store";
import {
  Settings,
  Key,
  Cpu,
  Check,
  X,
  ShieldCheck,
  Calendar,
  Trash2,
  Lock,
  Eye,
  EyeOff,
  Clock,
  Database,
  User,
  Sparkles,
  AlertCircle,
  AlertTriangle,
  Phone,
  Upload,
  Camera,
  Building2,
  Globe,
  ChevronDown,
  Briefcase,
  Mail,
  Bell,
  CheckCircle2,
  Loader2,
  Smartphone,
} from "lucide-react";
import {
  COUNTRY_CODES,
  PRESET_AVATARS,
  TIMEZONES,
} from "@/lib/country-codes";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const EXPIRY_OPTIONS = [
  { days: 1, label: "1 Day", tag: "Strict Security" },
  { days: 7, label: "7 Days", tag: "1 Week" },
  { days: 14, label: "14 Days", tag: "2 Weeks" },
  { days: 30, label: "30 Days", tag: "Recommended" },
  { days: 90, label: "90 Days", tag: "Quarterly" },
];

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const { apiSettings, setApiSettings } = useDocStore();
  const {
    user,
    aiConfig,
    isAuthenticated,
    saveAiConfig,
    deleteAiConfig,
    openAuthModal,
    updateProfile,
    sendPhoneOtp,
    verifyPhoneOtp,
    updateNotificationPrefs,
  } = useAuthStore();

  const [activeTab, setActiveTab] = useState<"profile" | "ai" | "notifications">("profile");

  // Phone OTP verification state
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [showOtpInput, setShowOtpInput] = useState(false);
  const [verificationSessionId, setVerificationSessionId] = useState<string | null>(null);
  const [otpCode, setOtpCode] = useState("");
  const [otpCooldown, setOtpCooldown] = useState(0);
  const [otpFeedback, setOtpFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Notification preferences state
  const [notifPrefs, setNotifPrefs] = useState({
    email: { export: true, audit: true, adr: true },
    sms: { export: false, audit: false, adr: false },
  });
  const [isSavingPrefs, setIsSavingPrefs] = useState(false);
  const [prefsFeedback, setPrefsFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Profile states
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [phoneCountryCode, setPhoneCountryCode] = useState("+1");
  const [avatarUrl, setAvatarUrl] = useState(PRESET_AVATARS[0].svgDataUri);
  const [company, setCompany] = useState("");
  const [timezone, setTimezone] = useState("UTC");
  const [bio, setBio] = useState("");
  const [designation, setDesignation] = useState("Principal Solutions Architect");

  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileFeedback, setProfileFeedback] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // AI Vault states
  const [provider, setProvider] = useState(apiSettings.provider);
  const [apiKey, setApiKey] = useState(apiSettings.apiKey);
  const [modelName, setModelName] = useState(apiSettings.modelName);
  const [expiresInDays, setExpiresInDays] = useState<number>(30);
  const [showKey, setShowKey] = useState(false);

  const [isSaving, setIsSaving] = useState(false);
  const [isRevoking, setIsRevoking] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: "success" | "error"; text: string } | null>(
    null
  );

  // Sync state when modal opens or user/aiConfig changes
  useEffect(() => {
    if (!isOpen) return;

    if (user) {
      setFirstName(user.firstName || "");
      setLastName(user.lastName || "");
      setFullName(user.fullName || "");
      setPhone(user.phone || "");
      if (user.phoneCountryCode) setPhoneCountryCode(user.phoneCountryCode);
      if (user.avatarUrl) setAvatarUrl(user.avatarUrl);
      setCompany(user.company || "");
      if (user.timezone) setTimezone(user.timezone);
      setBio(user.bio || "");
      setDesignation(user.designation || "Principal Solutions Architect");
    }

    const targetProvider = apiSettings.provider || (aiConfig ? aiConfig.provider : "openai");
    setProvider(targetProvider);

    let targetModel = apiSettings.modelName || (aiConfig ? aiConfig.modelName : "gpt-4o");
    // Ensure model matches provider family
    if (targetProvider === "openai") {
      if (!targetModel || targetModel.toLowerCase().includes("gemini") || targetModel === "builtin") {
        targetModel = "gpt-4o";
      }
    } else if (targetProvider === "gemini") {
      if (!targetModel || targetModel.toLowerCase().includes("gpt") || targetModel === "builtin") {
        targetModel = "gemini-1.5-pro";
      }
    }
    setModelName(targetModel);
    setApiKey(apiSettings.apiKey || "");
    if (aiConfig?.expiresInDays) setExpiresInDays(aiConfig.expiresInDays);

    if (user?.notificationPrefs) {
      setNotifPrefs({
        email: {
          export: user.notificationPrefs.email?.export !== false,
          audit: user.notificationPrefs.email?.audit !== false,
          adr: user.notificationPrefs.email?.adr !== false,
        },
        sms: {
          export: Boolean(user.notificationPrefs.sms?.export),
          audit: Boolean(user.notificationPrefs.sms?.audit),
          adr: Boolean(user.notificationPrefs.sms?.adr),
        },
      });
    }
  }, [aiConfig, apiSettings, isOpen, user]);

  useEffect(() => {
    if (otpCooldown <= 0) return;
    const timer = setInterval(() => {
      setOtpCooldown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [otpCooldown]);

  const handleSendPhoneOtp = async () => {
    if (!phone || isSendingOtp || otpCooldown > 0) return;
    setIsSendingOtp(true);
    setOtpFeedback(null);

    const res = await sendPhoneOtp(phone, phoneCountryCode);
    setIsSendingOtp(false);

    if (res.success && res.verificationId) {
      setVerificationSessionId(res.verificationId);
      setShowOtpInput(true);
      setOtpCooldown(60);
      setOtpFeedback({
        type: "success",
        text: res.message || "Verification code sent to your phone via SMS.",
      });
    } else {
      setOtpFeedback({
        type: "error",
        text: res.error || "Failed to send SMS OTP.",
      });
    }
  };

  const handleVerifyPhoneOtp = async () => {
    if (!verificationSessionId || !otpCode || isVerifyingOtp) return;
    setIsVerifyingOtp(true);
    setOtpFeedback(null);

    const res = await verifyPhoneOtp(verificationSessionId, otpCode);
    setIsVerifyingOtp(false);

    if (res.success) {
      setShowOtpInput(false);
      setOtpCode("");
      setOtpFeedback({
        type: "success",
        text: res.message || "Phone verified! SMS notifications are now unlocked.",
      });
    } else {
      setOtpFeedback({
        type: "error",
        text: res.error || "Incorrect or expired verification code.",
      });
    }
  };

  const handleSaveNotificationPrefs = async () => {
    setIsSavingPrefs(true);
    setPrefsFeedback(null);

    const res = await updateNotificationPrefs(notifPrefs);
    setIsSavingPrefs(false);

    if (res.success) {
      setPrefsFeedback({
        type: "success",
        text: "Notification preferences saved successfully.",
      });
      setTimeout(() => setPrefsFeedback(null), 4000);
    } else {
      setPrefsFeedback({
        type: "error",
        text: res.error || "Failed to save preferences.",
      });
    }
  };

  if (!isOpen) return null;

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      setProfileFeedback({ type: "error", text: "Avatar image must be under 2MB" });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setAvatarUrl(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSaveProfile = async () => {
    if (!isAuthenticated) {
      setProfileFeedback({ type: "error", text: "Please sign in to save your profile." });
      return;
    }
    setIsSavingProfile(true);
    setProfileFeedback(null);

    const derivedFullName = [firstName.trim(), lastName.trim()].filter(Boolean).join(" ");
    const computedFullName = fullName.trim() || derivedFullName || user?.username || "";

    const res = await updateProfile({
      firstName: firstName.trim() || undefined,
      lastName: lastName.trim() || undefined,
      fullName: computedFullName,
      phone: phone.trim() || undefined,
      phoneCountryCode: phone.trim() ? phoneCountryCode : undefined,
      avatarUrl: avatarUrl || undefined,
      company: company.trim() || undefined,
      timezone: timezone || "UTC",
      bio: bio.trim() || undefined,
      designation: designation.trim() || "Principal Solutions Architect",
    });

    setIsSavingProfile(false);
    if (res.success) {
      setProfileFeedback({
        type: "success",
        text: "Profile updated successfully in Supabase PostgreSQL!",
      });
    } else {
      setProfileFeedback({
        type: "error",
        text: res.error || "Failed to update profile",
      });
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    setFeedbackMsg(null);

    const effectiveKey = apiKey.trim().length > 0 ? apiKey.trim() : apiSettings.apiKey;
    let effectiveModel = modelName.trim();
    if (provider === "openai" && (!effectiveModel || effectiveModel.toLowerCase().includes("gemini"))) {
      effectiveModel = "gpt-4o";
    } else if (provider === "gemini" && (!effectiveModel || effectiveModel.toLowerCase().includes("gpt"))) {
      effectiveModel = "gemini-1.5-pro";
    } else if (!effectiveModel) {
      effectiveModel = provider === "openai" ? "gpt-4o" : "gemini-1.5-pro";
    }

    // Save in client doc store
    setApiSettings({
      provider,
      apiKey: effectiveKey,
      modelName: effectiveModel,
    });

    // If authenticated, also save and encrypt in Supabase PostgreSQL
    if (isAuthenticated && effectiveKey.length > 0) {
      try {
        const res = await saveAiConfig(provider, effectiveModel, effectiveKey, expiresInDays);
        if (res.success) {
          setFeedbackMsg({
            type: "success",
            text: `Key encrypted with AES-256-GCM. Set to auto-purge in ${expiresInDays} days!`,
          });
        } else {
          setFeedbackMsg({
            type: "success",
            text: `Active for session & browser storage. (Cloud DB offline)`,
          });
        }
      } catch {
        setFeedbackMsg({
          type: "success",
          text: `Active for session & browser storage.`,
        });
      }
    } else {
      setFeedbackMsg({ type: "success", text: "Settings saved successfully." });
    }

    setIsSaving(false);
    setTimeout(() => {
      onClose();
    }, 1200);
  };

  const handleRevokeKey = async () => {
    if (!confirm("Are you sure you want to permanently delete your stored API key from the database?")) {
      return;
    }
    setIsRevoking(true);
    const res = await deleteAiConfig();
    setIsRevoking(false);

    if (res.success) {
      setFeedbackMsg({ type: "success", text: "API key permanently revoked from database." });
      setApiKey("");
      setApiSettings({ apiKey: "" });
    } else {
      setFeedbackMsg({ type: "error", text: res.error || "Failed to revoke key." });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in">
      <div className="relative w-full max-w-xl rounded-2xl border border-slate-700/80 bg-slate-900 shadow-2xl p-6 sm:p-7 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100">Settings & Studio Preferences</h3>
              <p className="text-xs text-slate-400">
                Manage your architect profile identity, contact settings, and AI security vault
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* User Account & Database Status Banner */}
        <div className="my-4 p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-indigo-600/30 text-indigo-400 border border-indigo-500/40 flex items-center justify-center font-bold overflow-hidden shrink-0">
              {avatarUrl || user?.avatarUrl ? (
                <img
                  src={(avatarUrl || user?.avatarUrl) || undefined}
                  alt={user?.username || "Avatar"}
                  className="w-full h-full object-cover"
                />
              ) : user ? (
                user.username.charAt(0).toUpperCase()
              ) : (
                <User className="w-4 h-4" />
              )}
            </div>
            <div>
              {isAuthenticated ? (
                <>
                  <div className="font-semibold text-slate-200 flex items-center gap-2">
                    <span>{fullName || user?.fullName || `@${user?.username}`}</span>
                    <span className="text-[10px] text-indigo-400 font-mono">@{user?.username}</span>
                  </div>
                  <div className="text-[10px] text-slate-400 flex items-center gap-2 mt-0.5">
                    <span>{designation || user?.designation || "Solutions Architect"}</span>
                    <span>•</span>
                    <span className="text-emerald-400 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
                      PostgreSQL Connected
                    </span>
                  </div>
                </>
              ) : (
                <>
                  <div className="font-semibold text-slate-300">Guest Mode (Session Only)</div>
                  <div className="text-[10px] text-slate-400">Sign in to save profile and keys</div>
                </>
              )}
            </div>
          </div>

          {!isAuthenticated && (
            <button
              onClick={() => {
                onClose();
                openAuthModal("signin");
              }}
              className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition"
            >
              Sign In
            </button>
          )}
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-800 gap-2 mb-4">
          <button
            type="button"
            onClick={() => setActiveTab("profile")}
            className={`pb-2.5 px-3 text-xs font-semibold flex items-center gap-2 border-b-2 transition ${
              activeTab === "profile"
                ? "border-indigo-500 text-white"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span>Profile Settings</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("ai")}
            className={`pb-2.5 px-3 text-xs font-semibold flex items-center gap-2 border-b-2 transition ${
              activeTab === "ai"
                ? "border-indigo-500 text-white"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <Key className="w-3.5 h-3.5" />
            <span>AI & Security Vault</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("notifications")}
            className={`pb-2.5 px-3 text-xs font-semibold flex items-center gap-2 border-b-2 transition ${
              activeTab === "notifications"
                ? "border-indigo-500 text-white"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <Bell className="w-3.5 h-3.5" />
            <span>Notifications & SMS</span>
          </button>
        </div>

        {/* TAB 1: PROFILE SETTINGS */}
        {activeTab === "profile" && (
          <div className="space-y-4 text-xs animate-in fade-in">
            {profileFeedback && (
              <div
                className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
                  profileFeedback.type === "success"
                    ? "bg-emerald-950/40 border-emerald-800/60 text-emerald-300"
                    : "bg-red-950/40 border-red-800/60 text-red-300"
                }`}
              >
                {profileFeedback.type === "success" ? (
                  <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                )}
                <span>{profileFeedback.text}</span>
              </div>
            )}

            {!isAuthenticated && (
              <div className="p-4 rounded-xl bg-slate-950 border border-indigo-900/40 text-center space-y-2">
                <p className="text-slate-300">
                  Sign in or create an account to customize and persist your architect profile settings to Supabase PostgreSQL.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    openAuthModal("signup");
                  }}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold transition"
                >
                  Create Account / Sign In
                </button>
              </div>
            )}

            {/* Profile Picture Avatar Selector */}
            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
              <label className="block text-xs font-medium text-slate-300 mb-2">
                Profile Avatar Picture
              </label>
              <div className="flex items-center gap-4">
                <div className="relative group shrink-0">
                  <img
                    src={avatarUrl}
                    alt="Current avatar"
                    className="w-14 h-14 rounded-full border-2 border-indigo-500 object-cover bg-slate-900 shadow-md"
                  />
                  <label
                    htmlFor="settings-avatar-upload"
                    className="absolute inset-0 rounded-full bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center cursor-pointer transition text-white"
                    title="Upload photo"
                  >
                    <Camera className="w-5 h-5" />
                  </label>
                  <input
                    id="settings-avatar-upload"
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarUpload}
                    className="hidden"
                  />
                </div>

                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    {PRESET_AVATARS.map((preset) => (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => setAvatarUrl(preset.svgDataUri)}
                        title={preset.name}
                        className={`w-8 h-8 rounded-full flex items-center justify-center transition border ${
                          avatarUrl === preset.svgDataUri
                            ? "border-indigo-400 scale-110 shadow-md shadow-indigo-500/50"
                            : "border-slate-700 hover:border-slate-500 opacity-80 hover:opacity-100"
                        }`}
                      >
                        <img
                          src={preset.svgDataUri}
                          alt={preset.name}
                          className="w-full h-full rounded-full object-cover"
                        />
                      </button>
                    ))}
                    <label
                      htmlFor="settings-avatar-upload"
                      className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-[11px] text-slate-300 flex items-center gap-1.5 cursor-pointer transition font-medium"
                    >
                      <Upload className="w-3 h-3" />
                      <span>Upload Photo</span>
                    </label>
                  </div>
                  <div className="text-[10px] text-slate-400 mt-1.5">
                    Click a preset persona or upload any PNG/JPEG image (&lt;2MB).
                  </div>
                </div>
              </div>
            </div>

            {/* Name Fields: First Name & Last Name */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">First Name</label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={firstName}
                    onChange={(e) => {
                      setFirstName(e.target.value);
                      setFullName(`${e.target.value} ${lastName}`.trim());
                    }}
                    placeholder="e.g. Ravi"
                    className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Last Name</label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={lastName}
                    onChange={(e) => {
                      setLastName(e.target.value);
                      setFullName(`${firstName} ${e.target.value}`.trim());
                    }}
                    placeholder="e.g. Kundu"
                    className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>
            </div>

            {/* Full Name & Designation */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Full Display Name
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Ravi Kundu"
                    className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
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
                    className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>
            </div>

            {/* Email & Username */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Username</label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    disabled
                    value={user?.username || ""}
                    className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-950/60 border border-slate-800 text-xs text-slate-400 cursor-not-allowed"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Corporate Email</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    disabled
                    value={user?.email || ""}
                    className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-950/60 border border-slate-800 text-xs text-slate-400 cursor-not-allowed"
                  />
                </div>
              </div>
            </div>

            {/* Optional Phone Number with Country Code */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-medium text-slate-300">Phone Number</label>
                <span className="text-[10px] text-slate-500 font-normal">Optional</span>
              </div>
              <div className="flex gap-2">
                <div className="w-36 shrink-0 relative">
                  <select
                    value={phoneCountryCode}
                    onChange={(e) => setPhoneCountryCode(e.target.value)}
                    className="w-full px-2.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-indigo-500 appearance-none cursor-pointer"
                  >
                    {COUNTRY_CODES.map((c) => (
                      <option key={c.id} value={c.code} className="bg-slate-900 text-white">
                        {c.flag} {c.code} ({c.id})
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
                <div className="flex-1 relative">
                  <Phone className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="e.g. (555) 234-5678"
                    className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Phone Verification Section */}
              {user?.phoneVerifiedAt ? (
                <div className="mt-1.5 flex items-center gap-1.5 text-[11px] text-emerald-400">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Verified ({user.phone || phone}) • SMS alerts enabled</span>
                </div>
              ) : (
                <div className="mt-2 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-slate-500">
                      SMS is optional. Only required to enable SMS notifications.
                    </span>
                    {phone.trim().length >= 6 && !showOtpInput && (
                      <button
                        type="button"
                        onClick={handleSendPhoneOtp}
                        disabled={isSendingOtp || otpCooldown > 0}
                        className="px-2.5 py-1 rounded-lg bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-300 border border-indigo-500/40 text-[11px] font-semibold transition disabled:opacity-50 flex items-center gap-1"
                      >
                        {isSendingOtp ? (
                          <>
                            <Loader2 className="w-3 h-3 animate-spin" />
                            Sending OTP...
                          </>
                        ) : otpCooldown > 0 ? (
                          `Resend in ${otpCooldown}s`
                        ) : (
                          "Verify Phone via SMS"
                        )}
                      </button>
                    )}
                  </div>

                  {showOtpInput && (
                    <div className="p-3 rounded-xl bg-slate-950 border border-indigo-500/40 space-y-2.5">
                      <div className="text-[11px] text-slate-300 font-medium">
                        Enter 6-Digit OTP sent to your phone:
                      </div>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          maxLength={6}
                          value={otpCode}
                          onChange={(e) => setOtpCode(e.target.value)}
                          placeholder="123456"
                          className="w-32 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-center text-sm font-mono tracking-widest text-white focus:outline-none focus:border-indigo-500"
                        />
                        <button
                          type="button"
                          onClick={handleVerifyPhoneOtp}
                          disabled={isVerifyingOtp || otpCode.length < 4}
                          className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold disabled:opacity-50 flex items-center gap-1"
                        >
                          {isVerifyingOtp ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <CheckCircle2 className="w-3 h-3" />
                          )}
                          <span>Verify Code</span>
                        </button>
                        <button
                          type="button"
                          onClick={handleSendPhoneOtp}
                          disabled={isSendingOtp || otpCooldown > 0}
                          className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs disabled:opacity-50"
                        >
                          {otpCooldown > 0 ? `${otpCooldown}s` : "Resend OTP"}
                        </button>
                      </div>
                    </div>
                  )}

                  {otpFeedback && (
                    <div
                      className={`p-2 rounded-lg text-[11px] flex items-center gap-1.5 ${
                        otpFeedback.type === "success"
                          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                          : "bg-red-500/10 text-red-400 border border-red-500/20"
                      }`}
                    >
                      {otpFeedback.type === "success" ? (
                        <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                      ) : (
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      )}
                      <span>{otpFeedback.text}</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Company & Timezone */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Company / Organization
                </label>
                <div className="relative">
                  <Building2 className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    placeholder="e.g. Enterprise Cloud Systems"
                    className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Timezone</label>
                <div className="relative">
                  <Globe className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <select
                    value={timezone}
                    onChange={(e) => setTimezone(e.target.value)}
                    className="w-full pl-9 pr-8 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-indigo-500 appearance-none cursor-pointer"
                  >
                    {TIMEZONES.map((tz) => (
                      <option key={tz.value} value={tz.value} className="bg-slate-900 text-white">
                        {tz.label}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>
            </div>

            {/* Professional Bio */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Professional Bio & Architectural Specialization
              </label>
              <textarea
                rows={3}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Describe your architecture specialty, e.g. Enterprise microservices, event-driven designs, high availability..."
                className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 resize-none"
              />
            </div>
          </div>
        )}

        {/* TAB 2: AI & SECURITY VAULT */}
        {activeTab === "ai" && (
          <div className="space-y-5 text-sm animate-in fade-in">
            {feedbackMsg && (
              <div
                className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
                  feedbackMsg.type === "success"
                    ? "bg-emerald-950/40 border-emerald-800/60 text-emerald-300"
                    : "bg-red-950/40 border-red-800/60 text-red-300"
                }`}
              >
                {feedbackMsg.type === "success" ? (
                  <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                )}
                <span>{feedbackMsg.text}</span>
              </div>
            )}

            {/* Provider Selection */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
              Select AI Engine
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <button
                type="button"
                onClick={() => {
                  setProvider("builtin");
                  setModelName("builtin");
                }}
                className={`flex flex-col items-start p-3 rounded-xl border text-left transition ${
                  provider === "builtin"
                    ? "border-indigo-500 bg-indigo-950/40 text-white"
                    : "border-slate-800 bg-slate-950/60 text-slate-400 hover:border-slate-700"
                }`}
              >
                <div className="flex items-center gap-2 font-semibold text-xs text-indigo-300">
                  <Cpu className="w-4 h-4" />
                  <span>Built-in Generator</span>
                </div>
                <span className="text-[10px] text-slate-400 mt-1">Zero config & offline</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setProvider("gemini");
                  if (!modelName || modelName.includes("gpt") || modelName === "builtin") {
                    setModelName("gemini-1.5-pro");
                  }
                }}
                className={`flex flex-col items-start p-3 rounded-xl border text-left transition ${
                  provider === "gemini"
                    ? "border-indigo-500 bg-indigo-950/40 text-white"
                    : "border-slate-800 bg-slate-950/60 text-slate-400 hover:border-slate-700"
                }`}
              >
                <div className="flex items-center gap-2 font-semibold text-xs text-indigo-300">
                  <Key className="w-4 h-4" />
                  <span>Google Gemini</span>
                </div>
                <span className="text-[10px] text-slate-400 mt-1">Gemini 1.5 Pro / Flash</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setProvider("openai");
                  if (!modelName || modelName.includes("gemini") || modelName === "builtin") {
                    setModelName("gpt-4o");
                  }
                }}
                className={`flex flex-col items-start p-3 rounded-xl border text-left transition ${
                  provider === "openai"
                    ? "border-indigo-500 bg-indigo-950/40 text-white"
                    : "border-slate-800 bg-slate-950/60 text-slate-400 hover:border-slate-700"
                }`}
              >
                <div className="flex items-center gap-2 font-semibold text-xs text-indigo-300">
                  <Key className="w-4 h-4" />
                  <span>OpenAI</span>
                </div>
                <span className="text-[10px] text-slate-400 mt-1">GPT-4o & GPT-4o-mini</span>
              </button>
            </div>
          </div>

          {/* Model Name */}
          {provider !== "builtin" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-slate-300">
                    Target Model Identifier
                  </label>
                  {provider === "openai" && (
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setModelName("gpt-4o")}
                        className={`px-1.5 py-0.5 rounded text-[10px] font-mono transition ${
                          modelName === "gpt-4o"
                            ? "bg-indigo-600 text-white font-bold"
                            : "bg-slate-800 text-slate-400 hover:text-slate-200"
                        }`}
                      >
                        gpt-4o
                      </button>
                      <button
                        type="button"
                        onClick={() => setModelName("gpt-4o-mini")}
                        className={`px-1.5 py-0.5 rounded text-[10px] font-mono transition ${
                          modelName === "gpt-4o-mini"
                            ? "bg-indigo-600 text-white font-bold"
                            : "bg-slate-800 text-slate-400 hover:text-slate-200"
                        }`}
                      >
                        gpt-4o-mini
                      </button>
                      <button
                        type="button"
                        onClick={() => setModelName("o3-mini")}
                        className={`px-1.5 py-0.5 rounded text-[10px] font-mono transition ${
                          modelName === "o3-mini"
                            ? "bg-indigo-600 text-white font-bold"
                            : "bg-slate-800 text-slate-400 hover:text-slate-200"
                        }`}
                      >
                        o3-mini
                      </button>
                    </div>
                  )}
                  {provider === "gemini" && (
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setModelName("gemini-1.5-pro")}
                        className={`px-1.5 py-0.5 rounded text-[10px] font-mono transition ${
                          modelName === "gemini-1.5-pro"
                            ? "bg-indigo-600 text-white font-bold"
                            : "bg-slate-800 text-slate-400 hover:text-slate-200"
                        }`}
                      >
                        1.5-pro
                      </button>
                      <button
                        type="button"
                        onClick={() => setModelName("gemini-1.5-flash")}
                        className={`px-1.5 py-0.5 rounded text-[10px] font-mono transition ${
                          modelName === "gemini-1.5-flash"
                            ? "bg-indigo-600 text-white font-bold"
                            : "bg-slate-800 text-slate-400 hover:text-slate-200"
                        }`}
                      >
                        1.5-flash
                      </button>
                    </div>
                  )}
                </div>
                <input
                  type="text"
                  value={modelName}
                  onChange={(e) => setModelName(e.target.value)}
                  placeholder={provider === "openai" ? "gpt-4o" : "gemini-1.5-pro"}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 font-mono text-xs focus:outline-none focus:border-indigo-500"
                />
                {provider === "openai" && modelName.toLowerCase().includes("gemini") && (
                  <div className="mt-1.5 p-2 rounded-lg bg-amber-950/60 border border-amber-800/80 text-[11px] text-amber-300 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <span>Google model selected for OpenAI. Reset to gpt-4o?</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setModelName("gpt-4o")}
                      className="px-2 py-0.5 rounded bg-amber-600 hover:bg-amber-500 text-white font-bold text-[10px]"
                    >
                      Use gpt-4o
                    </button>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Security Protection
                </label>
                <div className="p-2 rounded-xl bg-slate-950 border border-slate-800 text-[11px] text-emerald-400 flex items-center gap-2">
                  <Lock className="w-3.5 h-3.5 shrink-0" />
                  <span>AES-256-GCM Hardware Cipher</span>
                </div>
              </div>
            </div>
          )}

          {/* API Key Input & Stored Key Status */}
          {provider !== "builtin" && (
            <div className="space-y-4">
              {/* If user already has active key stored in database */}
              {aiConfig?.hasKey && (
                <div className="p-3.5 rounded-xl bg-indigo-950/30 border border-indigo-800/60 flex items-center justify-between gap-3 text-xs">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-200">Active Encrypted Key:</span>
                      <code className="font-mono text-indigo-300 bg-slate-900 px-2 py-0.5 rounded border border-slate-700">
                        •••••••••••••••••{aiConfig.keyLast4}
                      </code>
                    </div>
                    <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-cyan-400" />
                      <span>
                        Auto-expires in{" "}
                        <strong className="text-cyan-300">{aiConfig.daysRemaining} days</strong> (
                        {new Date(aiConfig.expiresAt!).toLocaleDateString()})
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleRevokeKey}
                    disabled={isRevoking}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-red-950/60 hover:bg-red-900 border border-red-800 text-red-300 text-xs font-medium transition"
                    title="Permanently remove key from records now"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>{isRevoking ? "Revoking..." : "Revoke"}</span>
                  </button>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  {aiConfig?.hasKey ? "Update API Key (Optional)" : "Confidential API Key"}
                </label>
                <div className="relative">
                  <input
                    type={showKey ? "text" : "password"}
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder={
                      aiConfig?.hasKey
                        ? "Enter new key to replace existing..."
                        : provider === "openai"
                        ? "sk-proj-..."
                        : "AIzaSy..."
                    }
                    className="w-full pl-3.5 pr-10 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 font-mono text-xs"
                  />
                  <button
                    type="button"
                    onClick={() => setShowKey(!showKey)}
                    className="absolute right-3 top-3 text-slate-500 hover:text-slate-300"
                  >
                    {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Expiration Days Picker */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Auto-Expiration Duration</span>
                  </label>
                  <span className="text-[11px] text-slate-400 font-mono">
                    Auto-purged from PostgreSQL
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  {EXPIRY_OPTIONS.map((opt) => {
                    const isSelected = expiresInDays === opt.days;
                    return (
                      <button
                        key={opt.days}
                        type="button"
                        onClick={() => setExpiresInDays(opt.days)}
                        className={`p-2.5 rounded-xl border text-center transition ${
                          isSelected
                            ? "border-indigo-500 bg-indigo-950/60 text-white font-bold"
                            : "border-slate-800 bg-slate-950/50 text-slate-400 hover:border-slate-700"
                        }`}
                      >
                        <div className="text-xs">{opt.label}</div>
                        <div className="text-[10px] text-indigo-300/80 font-normal">{opt.tag}</div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Security Notice */}
          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-[11px] text-slate-400 flex items-start gap-2.5">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <p>
              Your API keys are <strong>never stored in plain text</strong>. Keys are encrypted with{" "}
              <strong>AES-256-GCM</strong> using dedicated cryptographic initialization vectors and
              authenticated tags. Once the chosen expiration days elapse, the record is permanently deleted.
            </p>
          </div>
        </div>
        )}

        {/* TAB 3: NOTIFICATION PREFERENCES & SMS */}
        {activeTab === "notifications" && (
          <div className="space-y-4 text-xs animate-in fade-in">
            {prefsFeedback && (
              <div
                className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
                  prefsFeedback.type === "success"
                    ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                    : "bg-red-500/10 border-red-500/30 text-red-300"
                }`}
              >
                {prefsFeedback.type === "success" ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 shrink-0" />
                )}
                <span>{prefsFeedback.text}</span>
              </div>
            )}

            {/* Email Notifications Section */}
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5">
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-indigo-400" />
                  <span className="font-semibold text-slate-200">Email Notifications</span>
                </div>
                <span className="text-[10px] text-slate-400 font-mono">
                  Delivered to {user?.email || "registered email"}
                </span>
              </div>

              <div className="space-y-2.5 pt-1">
                <label className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-900/50 cursor-pointer">
                  <div>
                    <div className="font-medium text-slate-200">Document Export Alerts</div>
                    <div className="text-[11px] text-slate-400">Receive an email receipt whenever technical documents or HTML packages are generated.</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={notifPrefs.email.export}
                    onChange={(e) =>
                      setNotifPrefs({
                        ...notifPrefs,
                        email: { ...notifPrefs.email, export: e.target.checked },
                      })
                    }
                    className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-indigo-600 focus:ring-indigo-500"
                  />
                </label>

                <label className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-900/50 cursor-pointer">
                  <div>
                    <div className="font-medium text-slate-200">Architecture Quality Reviews</div>
                    <div className="text-[11px] text-slate-400">Receive reports when automated SPOF, financial audit, and governance reviews complete.</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={notifPrefs.email.audit}
                    onChange={(e) =>
                      setNotifPrefs({
                        ...notifPrefs,
                        email: { ...notifPrefs.email, audit: e.target.checked },
                      })
                    }
                    className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-indigo-600 focus:ring-indigo-500"
                  />
                </label>

                <label className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-900/50 cursor-pointer">
                  <div>
                    <div className="font-medium text-slate-200">ADR Governance & Supersession</div>
                    <div className="text-[11px] text-slate-400">Receive notifications when Architecture Decision Records are approved, rejected, or superseded.</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={notifPrefs.email.adr}
                    onChange={(e) =>
                      setNotifPrefs({
                        ...notifPrefs,
                        email: { ...notifPrefs.email, adr: e.target.checked },
                      })
                    }
                    className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-indigo-600 focus:ring-indigo-500"
                  />
                </label>
              </div>
            </div>

            {/* SMS Notifications Section (Optional) */}
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5">
                <div className="flex items-center gap-2">
                  <Smartphone className="w-4 h-4 text-emerald-400" />
                  <span className="font-semibold text-slate-200">SMS Mobile Alerts</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">Optional</span>
                </div>
                {user?.phoneVerifiedAt ? (
                  <span className="text-[10px] text-emerald-400 font-mono flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    Verified: {user.phone}
                  </span>
                ) : (
                  <span className="text-[10px] text-amber-400 font-medium">Phone Unverified</span>
                )}
              </div>

              {!user?.phoneVerifiedAt ? (
                <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300 text-[11px] space-y-1.5">
                  <div className="font-semibold flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    Phone Verification Required for SMS Alerts
                  </div>
                  <p className="text-amber-300/80">
                    To protect security and eliminate unsolicited SMS volume, SMS alerts default to OFF and require a verified mobile phone number.
                  </p>
                  <button
                    type="button"
                    onClick={() => setActiveTab("profile")}
                    className="mt-1 text-xs text-indigo-400 hover:text-indigo-300 underline font-medium"
                  >
                    Go to Profile Settings to verify your phone number &rarr;
                  </button>
                </div>
              ) : (
                <div className="space-y-2.5 pt-1">
                  <label className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-900/50 cursor-pointer">
                    <div>
                      <div className="font-medium text-slate-200">High-Priority Export SMS</div>
                      <div className="text-[11px] text-slate-400">Instant SMS alert when large documentation bundles complete exporting.</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={notifPrefs.sms.export}
                      onChange={(e) =>
                        setNotifPrefs({
                          ...notifPrefs,
                          sms: { ...notifPrefs.sms, export: e.target.checked },
                        })
                      }
                      className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-emerald-500 focus:ring-emerald-500"
                    />
                  </label>

                  <label className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-900/50 cursor-pointer">
                    <div>
                      <div className="font-medium text-slate-200">Critical Quality Audit Failure SMS</div>
                      <div className="text-[11px] text-slate-400">Instant SMS dispatch if an architectural review fails high-severity SPOF or DLQ security checks.</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={notifPrefs.sms.audit}
                      onChange={(e) =>
                        setNotifPrefs({
                          ...notifPrefs,
                          sms: { ...notifPrefs.sms, audit: e.target.checked },
                        })
                      }
                      className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-emerald-500 focus:ring-emerald-500"
                    />
                  </label>

                  <label className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-900/50 cursor-pointer">
                    <div>
                      <div className="font-medium text-slate-200">Critical ADR Supersession SMS</div>
                      <div className="text-[11px] text-slate-400">Receive SMS notifications when production Architecture Decision Records are superseded.</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={notifPrefs.sms.adr}
                      onChange={(e) =>
                        setNotifPrefs({
                          ...notifPrefs,
                          sms: { ...notifPrefs.sms, adr: e.target.checked },
                        })
                      }
                      className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-emerald-500 focus:ring-emerald-500"
                    />
                  </label>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Sticky Footer Actions */}
        <div className="sticky bottom-0 bg-slate-900 pt-3 mt-4 border-t border-slate-800 flex items-center justify-end gap-2.5 z-10">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition"
          >
            Cancel
          </button>
          {activeTab === "profile" ? (
            <button
              onClick={handleSaveProfile}
              disabled={isSavingProfile || !isAuthenticated}
              className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/30 transition disabled:opacity-50"
            >
              <Check className="w-4 h-4" />
              <span>{isSavingProfile ? "Saving Profile..." : "Save Profile Settings"}</span>
            </button>
          ) : activeTab === "notifications" ? (
            <button
              onClick={handleSaveNotificationPrefs}
              disabled={isSavingPrefs || !isAuthenticated}
              className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/30 transition disabled:opacity-50"
            >
              <Check className="w-4 h-4" />
              <span>{isSavingPrefs ? "Saving..." : "Save Preferences"}</span>
            </button>
          ) : (
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/30 transition disabled:opacity-50"
            >
              <Check className="w-4 h-4" />
              <span>{isSaving ? "Encrypting & Saving..." : "Save Configuration"}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
