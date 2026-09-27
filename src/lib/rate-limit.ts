import { NextRequest } from "next/server";
import { AppUser, dbUpdateUserLockout, dbRecordAuditLog } from "./supabase";

// In-memory sliding window cache for IP throttling (5 attempts per minute)
// Persists in memory across requests in the current worker/process
interface IpThrottleState {
  attempts: number[];
}

declare global {
  var __docarch_ip_throttle__: Map<string, IpThrottleState> | undefined;
}

const getIpThrottleMap = (): Map<string, IpThrottleState> => {
  if (!globalThis.__docarch_ip_throttle__) {
    globalThis.__docarch_ip_throttle__ = new Map();
  }
  return globalThis.__docarch_ip_throttle__;
};

/**
 * Extract client IP from incoming Next.js request.
 */
export function getClientIp(req: NextRequest): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  const cfIp = req.headers.get("cf-connecting-ip");
  if (cfIp) return cfIp.trim();
  const realIp = req.headers.get("x-real-ip");
  if (realIp) return realIp.trim();
  return "127.0.0.1";
}

/**
 * Rule: Maximum 5 attempts per minute to login.
 * Sliding 60-second window per IP / client.
 */
export function checkIpRateLimit(ip: string): {
  allowed: boolean;
  retryAfterSeconds: number;
  attemptsInWindow: number;
} {
  const map = getIpThrottleMap();
  const now = Date.now();
  const windowMs = 60 * 1000; // 1 minute
  const maxAttempts = 5;

  let state = map.get(ip);
  if (!state) {
    state = { attempts: [] };
    map.set(ip, state);
  }

  // Filter out attempts older than 60 seconds
  state.attempts = state.attempts.filter((ts) => now - ts < windowMs);

  if (state.attempts.length >= maxAttempts) {
    const oldest = state.attempts[0];
    const retryAfterSeconds = Math.max(1, Math.ceil((oldest + windowMs - now) / 1000));
    return {
      allowed: false,
      retryAfterSeconds,
      attemptsInWindow: state.attempts.length,
    };
  }

  // Record this attempt
  state.attempts.push(now);

  return {
    allowed: true,
    retryAfterSeconds: 0,
    attemptsInWindow: state.attempts.length,
  };
}

/**
 * Rule: User can attempt 3 times; after that user needs to wait for 2 minutes (120 seconds).
 */
export function checkUserLockout(user: AppUser): {
  isLocked: boolean;
  waitSeconds: number;
} {
  if (!user.locked_until) {
    return { isLocked: false, waitSeconds: 0 };
  }

  const now = Date.now();
  const lockedUntil = new Date(user.locked_until).getTime();

  if (now < lockedUntil) {
    const waitSeconds = Math.max(1, Math.ceil((lockedUntil - now) / 1000));
    return { isLocked: true, waitSeconds };
  }

  // Lockout has expired
  return { isLocked: false, waitSeconds: 0 };
}

/**
 * Handle a failed login attempt:
 * - Increments failed attempts counter.
 * - If attempts reach 3, locks the account for 2 minutes (120 seconds).
 */
export async function recordFailedLogin(
  user: AppUser,
  ip: string,
  userAgent: string
): Promise<{
  attempts: number;
  isLocked: boolean;
  waitSeconds: number;
}> {
  // If previous lockout expired, start fresh at 1
  let currentAttempts = (user.failed_login_attempts || 0) + 1;
  const now = Date.now();

  let lockedUntilIso: string | null = null;
  let isLocked = false;
  let waitSeconds = 0;

  if (currentAttempts >= 3) {
    isLocked = true;
    waitSeconds = 120; // 2 minutes wait
    lockedUntilIso = new Date(now + 120 * 1000).toISOString();

    await dbRecordAuditLog({
      user_id: user.id,
      action: "ACCOUNT_LOCKED",
      details: `Account locked for 2 minutes after 3 consecutive failed login attempts. IP: ${ip}`,
      ip_address: ip,
      user_agent: userAgent,
    });
  } else {
    await dbRecordAuditLog({
      user_id: user.id,
      action: "LOGIN_FAILED",
      details: `Failed password attempt ${currentAttempts} of 3. IP: ${ip}`,
      ip_address: ip,
      user_agent: userAgent,
    });
  }

  await dbUpdateUserLockout(user.id, currentAttempts, lockedUntilIso);

  return {
    attempts: currentAttempts,
    isLocked,
    waitSeconds,
  };
}

/**
 * Reset failed login attempts on successful authentication.
 */
export async function recordSuccessfulLogin(
  user: AppUser,
  ip: string,
  userAgent: string
): Promise<void> {
  await dbUpdateUserLockout(user.id, 0, null);

  await dbRecordAuditLog({
    user_id: user.id,
    action: "LOGIN_SUCCESS",
    details: `Successful login for @${user.username} (${user.designation || user.role}). IP: ${ip}`,
    ip_address: ip,
    user_agent: userAgent,
  });
}
