import test from "node:test";
import assert from "node:assert";

process.env.NODE_ENV = "test";

import {
  ConsoleMailer,
  ConsoleSmsSender,
  Smtp2goMailer,
  MessageCentralSmsSender,
  guardEmailUsage,
  guardSmsUsage,
  NotificationService,
} from "../src/lib/notifications/index.ts";
import {
  dbCreateUser,
  dbVerifyUserEmail,
  dbVerifyUserPhone,
  dbUpdateUserNotificationPrefs,
  dbIncrementUsageCounter,
} from "../src/lib/supabase.ts";

test("Notifications: ConsoleMailer and ConsoleSmsSender dev fallback & production safety", async () => {
  const mailer = new ConsoleMailer();
  const smsSender = new ConsoleSmsSender();

  // Test ConsoleMailer send
  const mailResult = await mailer.send({
    to: "architect@example.com",
    subject: "Test Architecture Alert",
    html: "<p>Hello Architect</p>",
    text: "Hello Architect",
  });
  assert.strictEqual(mailResult.success, true);
  assert.ok(mailResult.messageId?.startsWith("console_msg_"));

  // Test ConsoleSmsSender sendOtp and checkOtp
  const otpResult = await smsSender.sendOtp({
    phoneE164: "+919876543210",
  });
  assert.strictEqual(otpResult.success, true);
  assert.ok(otpResult.verificationId);

  // Wrong code fails
  const wrongCheck = await smsSender.checkOtp(otpResult.verificationId, "999999", "+919876543210");
  assert.strictEqual(wrongCheck.verified, false);

  // Production environment protection
  const originalEnv = process.env.NODE_ENV;
  try {
    process.env.NODE_ENV = "production";
    assert.throws(
      () => new ConsoleMailer(),
      /ConsoleMailer cannot be used in production/
    );
    assert.throws(
      () => new ConsoleSmsSender(),
      /ConsoleSmsSender cannot be used in production/
    );
  } finally {
    process.env.NODE_ENV = originalEnv;
  }
});

test("Notifications: Cost Guards enforce hard caps and security priority", async () => {
  // Test daily email guard
  const today = new Date().toISOString().slice(0, 10);
  
  // High capacity usage simulation
  await dbIncrementUsageCounter("email", `daily:${today}`, 175); // Cap is 180, 175 > 95%

  // Low-priority notification should be dropped near cap
  const lowPriGuard = await guardEmailUsage("notification");
  assert.strictEqual(lowPriGuard.allowed, false);
  assert.ok(lowPriGuard.reason?.toLowerCase().includes("approaching daily limit"));

  // Security notification must still be allowed
  const secGuard = await guardEmailUsage("security");
  assert.strictEqual(secGuard.allowed, true);

  // Test SMS daily per-user cap
  const testUserId = "user_sms_guard_test";
  await dbIncrementUsageCounter("sms", `user:${testUserId}:${today}`, 5); // User cap is 5

  const userGuard = await guardSmsUsage(testUserId, "127.0.0.1");
  assert.strictEqual(userGuard.allowed, false);
  assert.ok(userGuard.reason?.includes("per day reached"));
});

test("Notifications: Preference gating - security emails mandatory, notifications opt-in, SMS phone verified", async () => {
  const user = await dbCreateUser({
    username: "notif_pref_user",
    email: "pref_test@enterprise.com",
    password_hash: "hash",
    password_salt: "salt",
  });

  // 1. Security notifications are ALWAYS allowed regardless of prefs
  const secAllowed = await NotificationService.shouldSendNotification(
    user.id,
    "email",
    "verify-email"
  );
  assert.strictEqual(secAllowed, true);

  const resetAllowed = await NotificationService.shouldSendNotification(
    user.id,
    "email",
    "password-reset"
  );
  assert.strictEqual(resetAllowed, true);

  // 2. Opt-out check
  await dbUpdateUserNotificationPrefs(user.id, {
    email: { export: false, audit: true, adr: true },
    sms: { export: false, audit: false, adr: false },
  });

  const exportEmailAllowed = await NotificationService.shouldSendNotification(
    user.id,
    "email",
    "export-alert"
  );
  assert.strictEqual(exportEmailAllowed, false);

  const auditEmailAllowed = await NotificationService.shouldSendNotification(
    user.id,
    "email",
    "audit-alert"
  );
  assert.strictEqual(auditEmailAllowed, true);

  // 3. SMS requires phone verification
  const unverifiedSmsAllowed = await NotificationService.shouldSendNotification(
    user.id,
    "sms",
    "audit-alert"
  );
  assert.strictEqual(unverifiedSmsAllowed, false);

  // Now verify user phone and opt in to audit SMS
  await dbVerifyUserPhone(user.id, "+919876543210");
  await dbUpdateUserNotificationPrefs(user.id, {
    email: { export: true, audit: true, adr: true },
    sms: { export: false, audit: true, adr: false },
  });

  const verifiedSmsAllowed = await NotificationService.shouldSendNotification(
    user.id,
    "sms",
    "audit-alert"
  );
  assert.strictEqual(verifiedSmsAllowed, true);
});

test("Notifications: Smtp2goMailer native fetch REST API with mock", async () => {
  const originalFetch = globalThis.fetch;
  const originalApiKey = process.env.SMTP2GO_API_KEY;
  process.env.SMTP2GO_API_KEY = "api-mock-smtp2go-key";

  let capturedUrl = "";
  let capturedHeaders = {};
  let capturedBody = {};

  globalThis.fetch = async (url, options) => {
    capturedUrl = String(url);
    capturedHeaders = options?.headers || {};
    capturedBody = JSON.parse(options?.body || "{}");
    return {
      ok: true,
      json: async () => ({
        data: {
          succeeded: 1,
          failed: 0,
          email_id: "smtp2go_msg_12345",
        },
      }),
    };
  };

  try {
    const mailer = new Smtp2goMailer();
    const res = await mailer.send({
      to: "recipient@architect.io",
      subject: "Test SMTP2GO Dispatch",
      html: "<p>Architecture Ready</p>",
      text: "Architecture Ready",
    });

    assert.strictEqual(res.success, true);
    assert.strictEqual(res.messageId, "smtp2go_msg_12345");
    assert.strictEqual(capturedUrl, "https://api.smtp2go.com/v3/email/send");
    assert.strictEqual(capturedHeaders["X-Smtp2go-Api-Key"], "api-mock-smtp2go-key");
    assert.deepStrictEqual(capturedBody.to, ["recipient@architect.io"]);
    assert.strictEqual(capturedBody.subject, "Test SMTP2GO Dispatch");
  } finally {
    globalThis.fetch = originalFetch;
    process.env.SMTP2GO_API_KEY = originalApiKey;
  }
});

test("Notifications: MessageCentralSmsSender token cache, sendOtp and checkOtp with mock", async () => {
  const originalFetch = globalThis.fetch;
  const originalCustId = process.env.MESSAGECENTRAL_CUSTOMER_ID;
  const originalKey = process.env.MESSAGECENTRAL_KEY;

  process.env.MESSAGECENTRAL_CUSTOMER_ID = "C-mock-customer";
  process.env.MESSAGECENTRAL_KEY = "mock-mc-key";

  let tokenFetched = false;
  let sendCalled = false;
  let validateCalled = false;

  globalThis.fetch = async (url) => {
    const urlStr = String(url);
    if (urlStr.includes("/auth/v1/authentication/token")) {
      tokenFetched = true;
      return {
        ok: true,
        json: async () => ({ token: "jwt_mock_token_abc123" }),
      };
    }
    if (urlStr.includes("/verification/v3/send")) {
      sendCalled = true;
      return {
        ok: true,
        json: async () => ({
          responseCode: 200,
          data: { verificationId: "mc_verif_998877" },
        }),
      };
    }
    if (urlStr.includes("/verification/v3/validateOtp")) {
      validateCalled = true;
      return {
        ok: true,
        json: async () => ({
          responseCode: 200,
          data: { verificationStatus: "VERIFICATION_COMPLETED" },
        }),
      };
    }
    return { ok: false, json: async () => ({}) };
  };

  try {
    const sender = new MessageCentralSmsSender();
    
    // Send OTP
    const sendRes = await sender.sendOtp({
      phoneE164: "+919988776655",
      countryCode: "91",
    });
    assert.strictEqual(sendRes.success, true);
    assert.strictEqual(sendRes.verificationId, "mc_verif_998877");
    assert.strictEqual(tokenFetched, true);
    assert.strictEqual(sendCalled, true);

    // Validate OTP
    const checkRes = await sender.checkOtp("+919988776655", "1234", "mc_verif_998877");
    assert.strictEqual(checkRes.success, true);
    assert.strictEqual(validateCalled, true);
  } finally {
    globalThis.fetch = originalFetch;
    process.env.MESSAGECENTRAL_CUSTOMER_ID = originalCustId;
    process.env.MESSAGECENTRAL_KEY = originalKey;
  }
});
