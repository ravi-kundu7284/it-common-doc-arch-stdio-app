import { getEnvVar } from "../env";
import { NotificationPriority, UsageCapsConfig } from "./types";
import { dbGetUsageCounter, dbIncrementUsageCounter } from "../supabase";

export class CostGuardError extends Error {
  public code: string;
  constructor(message: string, code: string) {
    super(message);
    this.code = code;
    this.name = "CostGuardError";
  }
}

export function getUsageCapsConfig(): UsageCapsConfig {
  return {
    emailDailyCap: parseInt(getEnvVar("EMAIL_DAILY_CAP") || "180", 10),
    emailMonthlyCap: parseInt(getEnvVar("EMAIL_MONTHLY_CAP") || "900", 10),
    smsDailyCap: parseInt(getEnvVar("SMS_DAILY_CAP") || "50", 10),
    smsPerUserDailyCap: parseInt(getEnvVar("SMS_PER_USER_DAILY_CAP") || "5", 10),
    smsPerIpDailyCap: parseInt(getEnvVar("SMS_PER_IP_DAILY_CAP") || "10", 10),
  };
}

function getTodayKey(): string {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD
}

function getMonthKey(): string {
  return new Date().toISOString().slice(0, 7); // YYYY-MM
}

/**
 * Validates and records email usage against free-tier limits.
 * Security emails (verification, reset, changed) are prioritized over notifications.
 */
export async function guardEmailUsage(
  priority: NotificationPriority = "notification"
): Promise<{ allowed: boolean; reason?: string }> {
  const caps = getUsageCapsConfig();
  const dayKey = `daily:${getTodayKey()}`;
  const monthKey = `monthly:${getMonthKey()}`;

  const [dailyCount, monthlyCount] = await Promise.all([
    dbGetUsageCounter("email", dayKey),
    dbGetUsageCounter("email", monthKey),
  ]);

  // Emit 80% capacity warning
  if (dailyCount >= Math.floor(caps.emailDailyCap * 0.8)) {
    console.warn(
      `[CostGuard Warning] Daily email usage is at ${dailyCount}/${caps.emailDailyCap} (>=80% cap).`
    );
  }
  if (monthlyCount >= Math.floor(caps.emailMonthlyCap * 0.8)) {
    console.warn(
      `[CostGuard Warning] Monthly email usage is at ${monthlyCount}/${caps.emailMonthlyCap} (>=80% cap).`
    );
  }

  // Monthly hard cap check
  if (monthlyCount >= caps.emailMonthlyCap) {
    console.error(
      `[CostGuard Alert] Monthly email cap hit: ${monthlyCount}/${caps.emailMonthlyCap}. All sends blocked.`
    );
    return {
      allowed: false,
      reason: "Monthly email quota has been exhausted. Please try again next month.",
    };
  }

  // Daily cap check with security email priority
  // Defer or drop low-priority notifications when approaching daily cap (>=95%)
  const isNearDailyCap = dailyCount >= Math.floor(caps.emailDailyCap * 0.95);
  if (isNearDailyCap && priority !== "security") {
    console.warn(
      `[CostGuard Deferral] Approaching daily limit (${dailyCount}/${caps.emailDailyCap}). Dropping low-priority notification email.`
    );
    return {
      allowed: false,
      reason: "Approaching daily limit. Security actions prioritized.",
    };
  }

  if (dailyCount >= caps.emailDailyCap) {
    if (priority !== "security") {
      console.warn(
        `[CostGuard Deferral] Daily email cap reached (${dailyCount}/${caps.emailDailyCap}). Dropping low-priority notification email.`
      );
      return {
        allowed: false,
        reason: "Daily notification email quota reached. Security actions prioritized.",
      };
    }

    // Absolute emergency buffer for security emails: allow up to 195 (5 under SMTP2GO's 200 limit)
    const absoluteDailyMax = Math.min(caps.emailDailyCap + 15, 195);
    if (dailyCount >= absoluteDailyMax) {
      console.error(
        `[CostGuard Alert] Absolute daily security email limit hit (${dailyCount}/${absoluteDailyMax}).`
      );
      return {
        allowed: false,
        reason: "Daily verification request limit reached. Please try again tomorrow.",
      };
    }
  }

  // Increment counters concurrently
  await Promise.all([
    dbIncrementUsageCounter("email", dayKey),
    dbIncrementUsageCounter("email", monthKey),
  ]);

  return { allowed: true };
}

/**
 * Validates and records SMS usage against strict cost prevention caps.
 */
export async function guardSmsUsage(
  userId?: string,
  ip?: string
): Promise<{ allowed: boolean; reason?: string }> {
  const caps = getUsageCapsConfig();
  const day = getTodayKey();
  const dayKey = `daily:${day}`;

  const dailyCount = await dbGetUsageCounter("sms", dayKey);

  // 80% warning
  if (dailyCount >= Math.floor(caps.smsDailyCap * 0.8)) {
    console.warn(
      `[CostGuard Warning] Daily SMS usage is at ${dailyCount}/${caps.smsDailyCap} (>=80% cap).`
    );
  }

  if (dailyCount >= caps.smsDailyCap) {
    console.error(
      `[CostGuard Alert] Global daily SMS cap reached (${dailyCount}/${caps.smsDailyCap}).`
    );
    return {
      allowed: false,
      reason: "Daily SMS quota has been reached. Please try again tomorrow.",
    };
  }

  // Per-user daily check
  if (userId) {
    const userKey = `user:${userId}:${day}`;
    const userCount = await dbGetUsageCounter("sms", userKey);
    if (userCount >= caps.smsPerUserDailyCap) {
      return {
        allowed: false,
        reason: `Maximum SMS limit of ${caps.smsPerUserDailyCap} per day reached for this account.`,
      };
    }
  }

  // Per-IP daily check
  if (ip && ip !== "127.0.0.1") {
    const ipKey = `ip:${ip}:${day}`;
    const ipCount = await dbGetUsageCounter("sms", ipKey);
    if (ipCount >= caps.smsPerIpDailyCap) {
      return {
        allowed: false,
        reason: `Maximum verification attempts reached for this network today.`,
      };
    }
  }

  // Increment global, user, and IP counters
  const increments = [dbIncrementUsageCounter("sms", dayKey)];
  if (userId) increments.push(dbIncrementUsageCounter("sms", `user:${userId}:${day}`));
  if (ip && ip !== "127.0.0.1") increments.push(dbIncrementUsageCounter("sms", `ip:${ip}:${day}`));

  await Promise.all(increments);

  return { allowed: true };
}
