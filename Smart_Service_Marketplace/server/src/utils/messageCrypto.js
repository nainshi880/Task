import crypto from "crypto";
import env from "../config/env.js";
import logger from "./logger.js";

const ALGO = "aes-256-gcm";
const IV_LENGTH = 12;

function getKey() {
  const secret = env.CHAT_ENCRYPTION_KEY || env.JWT_SECRET || "";
  if (!secret) return null;
  // Derive a 32-byte key
  return crypto.createHash("sha256").update(secret).digest();
}

export function isChatEncryptionEnabled() {
  return Boolean(env.CHAT_ENCRYPTION_KEY || env.JWT_SECRET);
}

/**
 * Encrypt plaintext for at-rest storage.
 * Format: enc:v1:<iv_b64>:<tag_b64>:<ciphertext_b64>
 */
export function encryptMessage(plaintext) {
  if (!plaintext) return plaintext;

  const key = getKey();
  if (!key) return plaintext;

  try {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGO, key, iv);
    const encrypted = Buffer.concat([
      cipher.update(String(plaintext), "utf8"),
      cipher.final(),
    ]);
    const tag = cipher.getAuthTag();

    return [
      "enc:v1",
      iv.toString("base64url"),
      tag.toString("base64url"),
      encrypted.toString("base64url"),
    ].join(":");
  } catch (error) {
    logger.warn(`Message encryption failed: ${error.message}`);
    return plaintext;
  }
}

/**
 * Decrypt stored content. Returns original string if not encrypted.
 */
export function decryptMessage(stored) {
  if (!stored || typeof stored !== "string") return stored;
  if (!stored.startsWith("enc:v1:")) return stored;

  const key = getKey();
  if (!key) return "[encrypted]";

  try {
    const parts = stored.split(":");
    // enc:v1:iv:tag:ciphertext
    if (parts.length !== 5) return stored;

    const iv = Buffer.from(parts[2], "base64url");
    const tag = Buffer.from(parts[3], "base64url");
    const ciphertext = Buffer.from(parts[4], "base64url");

    const decipher = crypto.createDecipheriv(ALGO, key, iv);
    decipher.setAuthTag(tag);

    const decrypted = Buffer.concat([
      decipher.update(ciphertext),
      decipher.final(),
    ]);

    return decrypted.toString("utf8");
  } catch (error) {
    logger.warn(`Message decryption failed: ${error.message}`);
    return "[unable to decrypt]";
  }
}

/**
 * Plaintext used for search index (never store encrypted-only for search).
 */
export function toSearchPlaintext(content) {
  if (!content) return "";
  if (content.startsWith("enc:v1:")) {
    return decryptMessage(content);
  }
  return content;
}

export default {
  encryptMessage,
  decryptMessage,
  isChatEncryptionEnabled,
  toSearchPlaintext,
};
