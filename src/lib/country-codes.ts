/**
 * Country codes, Preset Avatars, and Timezones for DocArch AI Profile Management
 */

export interface CountryCode {
  id: string;
  name: string;
  code: string;
  flag: string;
}

export const COUNTRY_CODES: CountryCode[] = [
  { id: "US", name: "United States / Canada", code: "+1", flag: "🇺🇸" },
  { id: "IN", name: "India", code: "+91", flag: "🇮🇳" },
  { id: "GB", name: "United Kingdom", code: "+44", flag: "🇬🇧" },
  { id: "AU", name: "Australia", code: "+61", flag: "🇦🇺" },
  { id: "DE", name: "Germany", code: "+49", flag: "🇩🇪" },
  { id: "FR", name: "France", code: "+33", flag: "🇫🇷" },
  { id: "SG", name: "Singapore", code: "+65", flag: "🇸🇬" },
  { id: "AE", name: "United Arab Emirates", code: "+971", flag: "🇦🇪" },
  { id: "JP", name: "Japan", code: "+81", flag: "🇯🇵" },
  { id: "CH", name: "Switzerland", code: "+41", flag: "🇨🇭" },
  { id: "NL", name: "Netherlands", code: "+31", flag: "🇳🇱" },
  { id: "SE", name: "Sweden", code: "+46", flag: "🇸🇪" },
  { id: "IE", name: "Ireland", code: "+353", flag: "🇮🇪" },
  { id: "BR", name: "Brazil", code: "+55", flag: "🇧🇷" },
  { id: "ZA", name: "South Africa", code: "+27", flag: "🇿🇦" },
  { id: "NZ", name: "New Zealand", code: "+64", flag: "🇳🇿" },
  { id: "ES", name: "Spain", code: "+34", flag: "🇪🇸" },
  { id: "IT", name: "Italy", code: "+39", flag: "🇮🇹" },
  { id: "KR", name: "South Korea", code: "+82", flag: "🇰🇷" },
  { id: "IL", name: "Israel", code: "+972", flag: "🇮🇱" },
];

export interface PresetAvatar {
  id: string;
  name: string;
  badge: string;
  bgGradient: string;
  textColor: string;
  svgDataUri: string;
}

// Generate an SVG data URI avatar
const makeSvgAvatar = (bg1: string, bg2: string, iconColor: string, symbol: string) => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">
    <defs>
      <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${bg1}" />
        <stop offset="100%" stop-color="${bg2}" />
      </linearGradient>
    </defs>
    <rect width="100" height="100" rx="50" fill="url(#grad)" />
    <text x="50" y="58" font-size="34" font-weight="bold" font-family="system-ui, -apple-system, sans-serif" text-anchor="middle" dominant-baseline="middle" fill="${iconColor}">${symbol}</text>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
};

export const PRESET_AVATARS: PresetAvatar[] = [
  {
    id: "arch_indigo",
    name: "Enterprise Architect",
    badge: "🏛️",
    bgGradient: "from-indigo-600 to-purple-600",
    textColor: "text-white",
    svgDataUri: makeSvgAvatar("#4f46e5", "#9333ea", "#ffffff", "🏛️"),
  },
  {
    id: "cloud_cyan",
    name: "Cloud Specialist",
    badge: "☁️",
    bgGradient: "from-sky-500 to-blue-600",
    textColor: "text-white",
    svgDataUri: makeSvgAvatar("#0ea5e9", "#2563eb", "#ffffff", "☁️"),
  },
  {
    id: "security_emerald",
    name: "Security Architect",
    badge: "🛡️",
    bgGradient: "from-emerald-500 to-teal-700",
    textColor: "text-white",
    svgDataUri: makeSvgAvatar("#10b981", "#0f766e", "#ffffff", "🛡️"),
  },
  {
    id: "ai_violet",
    name: "AI Solutions Lead",
    badge: "⚡",
    bgGradient: "from-violet-600 to-fuchsia-600",
    textColor: "text-white",
    svgDataUri: makeSvgAvatar("#7c3aed", "#c026d3", "#ffffff", "⚡"),
  },
  {
    id: "lead_amber",
    name: "Engineering Director",
    badge: "🚀",
    bgGradient: "from-amber-500 to-orange-600",
    textColor: "text-white",
    svgDataUri: makeSvgAvatar("#f59e0b", "#ea580c", "#ffffff", "🚀"),
  },
  {
    id: "data_rose",
    name: "Data Architect",
    badge: "💎",
    bgGradient: "from-rose-500 to-pink-600",
    textColor: "text-white",
    svgDataUri: makeSvgAvatar("#f43f5e", "#db2777", "#ffffff", "💎"),
  },
];

export const TIMEZONES = [
  { value: "UTC", label: "UTC (Coordinated Universal Time)" },
  { value: "America/New_York", label: "America/New_York (EST / EDT - UTC-5 / -4)" },
  { value: "America/Chicago", label: "America/Chicago (CST / CDT - UTC-6 / -5)" },
  { value: "America/Denver", label: "America/Denver (MST / MDT - UTC-7 / -6)" },
  { value: "America/Los_Angeles", label: "America/Los_Angeles (PST / PDT - UTC-8 / -7)" },
  { value: "Europe/London", label: "Europe/London (GMT / BST - UTC+0 / +1)" },
  { value: "Europe/Berlin", label: "Europe/Berlin (CET / CEST - UTC+1 / +2)" },
  { value: "Europe/Paris", label: "Europe/Paris (CET / CEST - UTC+1 / +2)" },
  { value: "Asia/Dubai", label: "Asia/Dubai (GST - UTC+4)" },
  { value: "Asia/Kolkata", label: "Asia/Kolkata (IST - UTC+5:30)" },
  { value: "Asia/Singapore", label: "Asia/Singapore (SGT - UTC+8)" },
  { value: "Asia/Tokyo", label: "Asia/Tokyo (JST - UTC+9)" },
  { value: "Australia/Sydney", label: "Australia/Sydney (AEST / AEDT - UTC+10 / +11)" },
];

