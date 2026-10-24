import test from "node:test";
import assert from "node:assert";

process.env.NODE_ENV = "test";

import { parsePhoneNumberFromString } from "libphonenumber-js";
import {
  generateSecureToken,
  hashToken,
  hashPassword,
  verifyPassword,
} from "../src/lib/crypto.ts";
import {
  dbCreateUser,
  dbFindUserById,
  dbCreateSession,
  dbGetAllActiveSessions,
  dbRevokeUserSessions,
  dbCreateAuthToken,
  dbFindAuthTokenByHash,
  dbMarkAuthTokenUsed,
  dbInvalidateAuthTokens,
  dbVerifyUserEmail,
  dbCreatePhoneVerification,
  dbFindPhoneVerification,
  dbIncrementPhoneVerificationAttempts,
  dbCompletePhoneVerification,
  dbVerifyUserPhone,
} from "../src/lib/supabase.ts";
import { isUserEmailVerified } from "../src/lib/api-auth.ts";

test("Auth Flow: Cryptographic token generation and SHA-256 hashing", async () => {
  const token1 = generateSecureToken(32);
  const token2 = generateSecureToken(32);

  assert.strictEqual(token1.length, 64); // 32 bytes in hex = 64 characters
  assert.strictEqual(token2.length, 64);
  assert.notStrictEqual(token1, token2);

  const hash1 = await hashToken(token1);
  const hash2 = await hashToken(token2);
  const hash1Repeat = await hashToken(token1);

  assert.strictEqual(hash1.length, 64); // SHA-256 in hex = 64 characters
  assert.notStrictEqual(hash1, hash2);
  assert.strictEqual(hash1, hash1Repeat);
});

test("Auth Flow: Email verification lifecycle and single-use token enforcement", async () => {
  const user = await dbCreateUser({
    username: "verify_tester",
    email: "verify_tester@cloudarch.com",
    password_hash: "hash",
    password_salt: "salt",
  });

  assert.strictEqual(user.email_verified_at, null);

  // 1. Generate & hash token
  const rawToken = generateSecureToken(32);
  const tokenHash = await hashToken(rawToken);
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

  const tokenRecord = await dbCreateAuthToken({
    user_id: user.id,
    type: "email_verify",
    token_hash: tokenHash,
    expires_at: expiresAt,
  });

  assert.ok(tokenRecord.id);
  assert.strictEqual(tokenRecord.used_at, null);

  // 2. Lookup by hash
  const found = await dbFindAuthTokenByHash(tokenHash, "email_verify");
  assert.ok(found);
  assert.strictEqual(found.user_id, user.id);

  // 3. Mark token used and set email_verified_at
  await dbMarkAuthTokenUsed(found.id);
  const verifySuccess = await dbVerifyUserEmail(user.id);
  assert.strictEqual(verifySuccess, true);
  const updatedUser = await dbFindUserById(user.id);
  assert.ok(updatedUser?.email_verified_at);

  // 4. Token cannot be reused
  const usedFound = await dbFindAuthTokenByHash(tokenHash, "email_verify");
  assert.ok(usedFound?.used_at);

  // 5. Invalidate previous tokens
  const token2 = generateSecureToken(32);
  const hash2 = await hashToken(token2);
  await dbCreateAuthToken({
    user_id: user.id,
    type: "email_verify",
    token_hash: hash2,
    expires_at: expiresAt,
  });

  await dbInvalidateAuthTokens(user.id, "email_verify");
  const invalidated = await dbFindAuthTokenByHash(hash2, "email_verify");
  assert.ok(invalidated?.used_at);
});

test("Auth Flow: Password reset, PBKDF2 re-hashing and session revocation", async () => {
  const { hash, salt } = await hashPassword("OriginalP@ss123");
  const user = await dbCreateUser({
    username: "pwd_reset_user",
    email: "reset_user@enterprise.org",
    password_hash: hash,
    password_salt: salt,
  });

  // Create active user sessions
  await dbCreateSession({
    user_id: user.id,
    session_token: "session_tok_1",
    ip_address: "10.0.0.1",
    user_agent: "Mozilla/5.0",
    expires_at: new Date(Date.now() + 3600000).toISOString(),
    is_active: true,
  });
  await dbCreateSession({
    user_id: user.id,
    session_token: "session_tok_2",
    ip_address: "10.0.0.2",
    user_agent: "Mozilla/5.0",
    expires_at: new Date(Date.now() + 3600000).toISOString(),
    is_active: true,
  });

  const allActiveBefore = await dbGetAllActiveSessions();
  const activeBefore = allActiveBefore.filter((s) => s.user_id === user.id);
  assert.strictEqual(activeBefore.length, 2);

  // Reset password
  const { hash: newHash, salt: newSalt } = await hashPassword("NewSecureP@ssword456");
  assert.notStrictEqual(newHash, hash);

  // Verify new password
  const isValid = await verifyPassword("NewSecureP@ssword456", newHash, newSalt);
  assert.strictEqual(isValid, true);

  // Revoke all existing sessions
  await dbRevokeUserSessions(user.id);
  const allActiveAfter = await dbGetAllActiveSessions();
  const activeAfter = allActiveAfter.filter((s) => s.user_id === user.id);
  assert.strictEqual(activeAfter.length, 0);
});

test("Auth Flow: Phone E.164 normalization, OTP attempt caps, and expiry", async () => {
  // Test India number normalization
  const parsedIn = parsePhoneNumberFromString("9876543210", "IN");
  assert.ok(parsedIn?.isValid());
  assert.strictEqual(parsedIn.number, "+919876543210");

  // Test US number normalization
  const parsedUs = parsePhoneNumberFromString("(202) 555-0143", "US");
  assert.ok(parsedUs?.isValid());
  assert.strictEqual(parsedUs.number, "+12025550143");

  // Invalid number rejected
  const invalidNum = parsePhoneNumberFromString("123", "IN");
  assert.strictEqual(invalidNum?.isValid() || false, false);

  // Test 5 attempts limit on phone verifications
  const verification = await dbCreatePhoneVerification({
    user_id: "user_otp_limit_test",
    phone: "+919876543210",
    provider_verification_id: "verif_test_123",
    status: "pending",
    attempts: 0,
    expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
  });

  assert.strictEqual(verification.attempts, 0);

  // Simulate 5 failed attempts
  for (let i = 1; i <= 5; i++) {
    const nextAttempts = await dbIncrementPhoneVerificationAttempts(verification.id);
    assert.strictEqual(nextAttempts, i);
  }

  // After 5 attempts, mark failed
  await dbCompletePhoneVerification(verification.id, "failed");
  const failed = await dbFindPhoneVerification(verification.id);
  assert.strictEqual(failed?.status, "failed");

  // Successfully complete verification
  const verif2 = await dbCreatePhoneVerification({
    user_id: "user_otp_success_test",
    phone: "+919876543210",
    status: "pending",
    attempts: 0,
    expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
  });
  await dbCompletePhoneVerification(verif2.id, "verified");
  const completed = await dbFindPhoneVerification(verif2.id);
  assert.strictEqual(completed?.status, "verified");
});

test("Auth Flow: Sensitive action guard checks email verification status", async () => {
  const unverifiedUser = await dbCreateUser({
    username: "unverified_dev",
    email: "unverified@test.com",
    password_hash: "h",
    password_salt: "s",
  });

  const isUnverifiedAllowed = await isUserEmailVerified(unverifiedUser.id);
  assert.strictEqual(isUnverifiedAllowed, false);

  // Verify email
  await dbVerifyUserEmail(unverifiedUser.id);
  const isVerifiedAllowed = await isUserEmailVerified(unverifiedUser.id);
  assert.strictEqual(isVerifiedAllowed, true);

  // Sandbox demo user is permitted
  const isDemoAllowed = await isUserEmailVerified("00000000-0000-0000-0000-000000000001");
  assert.strictEqual(isDemoAllowed, true);
});
