import test from "node:test";
import assert from "node:assert/strict";
import { resolveServerOpenAiKey, resolveServerOpenAiModel, parseOpenAiError } from "../src/lib/openai.ts";

test("OpenAI Helper: resolves server OpenAI key with prioritization", () => {
  const explicit = "sk-explicit-test-key-12345";
  assert.equal(resolveServerOpenAiKey(explicit), explicit);
  assert.equal(resolveServerOpenAiKey("   "), process.env.OPENAI_API_KEY?.trim() || "");
});

test("OpenAI Helper: resolves model with gpt-4o fallback", () => {
  assert.equal(resolveServerOpenAiModel("gpt-4o-mini"), "gpt-4o-mini");
  assert.equal(resolveServerOpenAiModel(""), process.env.OPENAI_MODEL?.trim() || "gpt-4o");
});

test("OpenAI Helper: parses missing API key error accurately", () => {
  const error = new Error("OPENAI_API_KEY is not configured on the server.");
  error.code = "MISSING_API_KEY";
  const parsed = parseOpenAiError(error);

  assert.equal(parsed.code, "MISSING_API_KEY");
  assert.equal(parsed.statusCode, 400);
  assert.match(parsed.message, /OpenAI API key is missing/);
});

test("OpenAI Helper: parses 401 invalid key error accurately", () => {
  const error = new Error("Incorrect API key provided: sk-invalid...");
  error.status = 401;
  const parsed = parseOpenAiError(error);

  assert.equal(parsed.code, "INVALID_API_KEY");
  assert.equal(parsed.statusCode, 401);
  assert.match(parsed.message, /Invalid OpenAI API key/);
});

test("OpenAI Helper: parses 429 quota and rate limit errors accurately", () => {
  const quotaError = new Error("You exceeded your current quota, please check your plan and billing details.");
  quotaError.status = 429;
  const parsedQuota = parseOpenAiError(quotaError);

  assert.equal(parsedQuota.code, "QUOTA_EXCEEDED");
  assert.equal(parsedQuota.statusCode, 429);
  assert.match(parsedQuota.message, /quota exceeded/);

  const rateError = new Error("Rate limit reached for requests.");
  rateError.status = 429;
  const parsedRate = parseOpenAiError(rateError);

  assert.equal(parsedRate.code, "RATE_LIMITED");
  assert.equal(parsedRate.statusCode, 429);
});
