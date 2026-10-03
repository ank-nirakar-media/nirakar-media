import assert from "node:assert/strict";
import { test } from "node:test";
import { decrypt, encrypt, encryptionKeyStatus, hashPassword, verifyPassword } from "../lib/crypto";

test("encrypt and decrypt round-trip, and tampering is detected", () => {
  process.env.ENCRYPTION_KEY = "a-test-encryption-key-that-is-long-enough";
  assert.equal(encryptionKeyStatus(), "ok");
  const sealed = encrypt("oauth-refresh-token");
  assert.notEqual(sealed, "oauth-refresh-token");
  assert.equal(decrypt(sealed), "oauth-refresh-token");
  const [iv, tag, data] = sealed.split(".");
  const flipped = Buffer.from(data, "base64");
  flipped[0] ^= 1;
  assert.throws(() => decrypt([iv, tag, flipped.toString("base64")].join(".")));
});

test("encryption refuses to run with a short key", () => {
  process.env.ENCRYPTION_KEY = "short";
  assert.equal(encryptionKeyStatus(), "too short");
  assert.throws(() => encrypt("x"));
});

test("passwords verify only with the right password", () => {
  const stored = hashPassword("correct horse");
  assert.equal(verifyPassword("correct horse", stored), true);
  assert.equal(verifyPassword("wrong horse", stored), false);
  assert.equal(verifyPassword("anything", null), false);
});
