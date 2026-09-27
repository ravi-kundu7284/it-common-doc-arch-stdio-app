import { getEnvVar } from "./env";

// Universal Web Crypto API - 100% compatible with Edge Runtime, Node.js, and Cloudflare Pages
const getEncryptionSecret = (): string => {
  return (
    getEnvVar("ENCRYPTION_SECRET") ||
    "docarch-ai-super-secret-key-32-chars-min-length-required!!"
  );
};

const buf2hex = (buf: ArrayBuffer): string => {
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
};

const hex2buf = (hex: string): Uint8Array => {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.substring(i * 2, i * 2 + 2), 16);
  }
  return bytes;
};

function getCrypto(): Crypto {
  if (typeof globalThis !== "undefined" && globalThis.crypto?.subtle) {
    return globalThis.crypto;
  }
  try {
    const req = typeof eval !== "undefined" ? eval("require") : null;
    if (req) {
      const nodeCrypto = req("crypto");
      if (nodeCrypto?.webcrypto) {
        return nodeCrypto.webcrypto as unknown as Crypto;
      }
    }
  } catch {}
  return (globalThis as any)?.crypto;
}

// Derive AES-GCM Key from secret using SHA-256
async function getAesKey(): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const secret = getEncryptionSecret();
  const keyHash = await getCrypto().subtle.digest(
    "SHA-256",
    enc.encode(secret)
  );
  return getCrypto().subtle.importKey(
    "raw",
    keyHash,
    { name: "AES-GCM" },
    false,
    ["encrypt", "decrypt"]
  );
}

/**
 * Hash a password using PBKDF2 with SHA-512 and a cryptographically secure random salt.
 */
export async function hashPassword(
  password: string
): Promise<{ hash: string; salt: string }> {
  const saltBytes = new Uint8Array(16);
  getCrypto().getRandomValues(saltBytes);
  const salt = buf2hex(saltBytes.buffer);

  const enc = new TextEncoder();
  const keyMaterial = await getCrypto().subtle.importKey(
    "raw",
    enc.encode(password),
    "PBKDF2",
    false,
    ["deriveBits"]
  );

  const derivedBits = await getCrypto().subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: saltBytes,
      iterations: 100000,
      hash: "SHA-512",
    },
    keyMaterial,
    512
  );

  return {
    hash: buf2hex(derivedBits),
    salt,
  };
}

/**
 * Verify a plain password against a stored PBKDF2 hash and salt.
 */
export async function verifyPassword(
  password: string,
  storedHash: string,
  storedSalt: string
): Promise<boolean> {
  try {
    const saltBytes = hex2buf(storedSalt);
    const enc = new TextEncoder();
    const keyMaterial = await getCrypto().subtle.importKey(
      "raw",
      enc.encode(password),
      "PBKDF2",
      false,
      ["deriveBits"]
    );

    const derivedBits = await getCrypto().subtle.deriveBits(
      {
        name: "PBKDF2",
        salt: saltBytes as unknown as BufferSource,
        iterations: 100000,
        hash: "SHA-512",
      },
      keyMaterial,
      512
    );

    const computedHash = buf2hex(derivedBits);
    return computedHash === storedHash;
  } catch (err) {
    console.error("Password verification error:", err);
    return false;
  }
}

/**
 * Encrypt a confidential API key at rest using AES-256-GCM.
 */
export async function encryptApiKey(apiKey: string): Promise<{
  encryptedKey: string;
  iv: string;
  authTag: string;
  last4: string;
}> {
  const cleanKey = apiKey.trim();
  const last4 = cleanKey.length >= 4 ? cleanKey.slice(-4) : cleanKey;

  const key = await getAesKey();
  const iv = new Uint8Array(12);
  getCrypto().getRandomValues(iv);

  const enc = new TextEncoder();
  const ciphertext = await getCrypto().subtle.encrypt(
    { name: "AES-GCM", iv: iv as unknown as BufferSource },
    key,
    enc.encode(cleanKey)
  );

  return {
    encryptedKey: buf2hex(ciphertext),
    iv: buf2hex(iv.buffer),
    authTag: "gcm",
    last4,
  };
}

/**
 * Decrypt an AES-256-GCM encrypted API key.
 */
export async function decryptApiKey(
  encryptedHex: string,
  ivHex: string
): Promise<string> {
  const key = await getAesKey();
  const iv = hex2buf(ivHex);
  const ciphertext = hex2buf(encryptedHex);

  const decrypted = await getCrypto().subtle.decrypt(
    { name: "AES-GCM", iv: iv as unknown as BufferSource },
    key,
    ciphertext as unknown as BufferSource
  );

  return new TextDecoder().decode(decrypted);
}

/**
 * Calculate expiration timestamp based on user-selected days.
 */
export function calculateExpirationDate(days: number): string {
  const exp = new Date();
  exp.setDate(exp.getDate() + Math.max(1, days));
  return exp.toISOString();
}

/**
 * Check if a given ISO timestamp has expired.
 */
export function isExpired(expiresAt: string | null | undefined): boolean {
  if (!expiresAt) return false;
  const expDate = new Date(expiresAt);
  return expDate.getTime() <= Date.now();
}

export interface SessionData {
  userId: string;
  username: string;
  email: string;
  fullName?: string;
  designation?: string;
  role?: string;
  expiresAt: number;
}

/**
 * Creates an AES-256-GCM encrypted session token.
 */
export async function createSessionToken(
  data: Omit<SessionData, "expiresAt">,
  durationDays = 30
): Promise<string> {
  const expiresAt = Date.now() + durationDays * 24 * 60 * 60 * 1000;
  const payload: SessionData = { ...data, expiresAt };
  const json = JSON.stringify(payload);
  const encrypted = await encryptApiKey(json);
  return `${encrypted.iv}.${encrypted.encryptedKey}`;
}

/**
 * Verifies and decrypts an AES-256-GCM session token.
 */
export async function verifySessionToken(
  token: string | undefined | null
): Promise<SessionData | null> {
  if (!token) return null;
  try {
    const parts = token.split(".");
    if (parts.length !== 2) return null;
    const [iv, encryptedKey] = parts;
    const json = await decryptApiKey(encryptedKey, iv);
    const data: SessionData = JSON.parse(json);
    if (Date.now() > data.expiresAt) return null;
    return data;
  } catch {
    return null;
  }
}

export interface StoredAiConfigData {
  provider: "builtin" | "openai" | "gemini" | "anthropic";
  modelName: string;
  encryptedApiKey?: string | null;
  keyIv?: string | null;
  keyAuthTag?: string | null;
  keyLast4?: string | null;
  expiresAt?: string | null;
  expiresInDays?: number;
}

/**
 * Serialize and encrypt AI config for secure HTTP-only cookie storage.
 */
export async function serializeAiConfigCookie(
  config: StoredAiConfigData
): Promise<string> {
  const json = JSON.stringify(config);
  const enc = await encryptApiKey(json);
  return `${enc.iv}.${enc.encryptedKey}`;
}

/**
 * Deserialize and decrypt AI config, auto-purging if expired.
 */
export async function deserializeAiConfigCookie(
  token: string | undefined | null
): Promise<StoredAiConfigData | null> {
  if (!token) return null;
  try {
    const parts = token.split(".");
    if (parts.length !== 2) return null;
    const [iv, encryptedKey] = parts;
    const json = await decryptApiKey(encryptedKey, iv);
    const cfg: StoredAiConfigData = JSON.parse(json);
    if (isExpired(cfg.expiresAt)) {
      return null;
    }
    return cfg;
  } catch {
    return null;
  }
}

