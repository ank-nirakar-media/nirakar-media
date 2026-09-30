import crypto from "node:crypto";

export function randomToken(bytes = 32) {
  return crypto.randomBytes(bytes).toString("base64url");
}

export function sha256(value: string) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

export function hashPassword(password: string) {
  const salt = crypto.randomBytes(16);
  const key = crypto.scryptSync(password, salt, 64);
  return `scrypt$${salt.toString("base64")}$${key.toString("base64")}`;
}

export function verifyPassword(password: string, stored: string | null | undefined) {
  if (!stored) return false;
  const [scheme, salt, key] = stored.split("$");
  if (scheme !== "scrypt" || !salt || !key) return false;
  const expected = Buffer.from(key, "base64");
  const actual = crypto.scryptSync(password, Buffer.from(salt, "base64"), expected.length);
  return crypto.timingSafeEqual(expected, actual);
}

// OAuth tokens are stored encrypted with ENCRYPTION_KEY: 32 bytes as base64
// (openssl rand -base64 32), or any other string of 32+ characters, which is
// hashed to a 32-byte key.
export function encryptionKeyStatus(): "ok" | "missing" | "too short" {
  const raw = process.env.ENCRYPTION_KEY?.trim();
  if (!raw) return "missing";
  if (Buffer.from(raw, "base64").length === 32 && /^[A-Za-z0-9+/]{43}=?$/.test(raw)) return "ok";
  return raw.length >= 32 ? "ok" : "too short";
}

function key() {
  const raw = process.env.ENCRYPTION_KEY?.trim();
  const status = encryptionKeyStatus();
  if (status !== "ok") throw new Error(`ENCRYPTION_KEY is ${status}`);
  const b64 = Buffer.from(raw!, "base64");
  if (b64.length === 32 && /^[A-Za-z0-9+/]{43}=?$/.test(raw!)) return b64;
  return crypto.createHash("sha256").update(raw!).digest();
}

export function encrypt(plain: string) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key(), iv);
  const data = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  return [iv, cipher.getAuthTag(), data].map((b) => b.toString("base64")).join(".");
}

export function decrypt(sealed: string) {
  const [iv, tag, data] = sealed.split(".").map((s) => Buffer.from(s, "base64"));
  const decipher = crypto.createDecipheriv("aes-256-gcm", key(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
}
