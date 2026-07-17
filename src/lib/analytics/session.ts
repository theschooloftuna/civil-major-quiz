import { createHmac, timingSafeEqual } from "crypto";

const SEPARATOR = ".";

function sign(expiresAtMs: number, secret: string): string {
  return createHmac("sha256", secret).update(String(expiresAtMs)).digest("hex");
}

/** Signed session token: `<expiresAtMs>.<hmac>`. No user identity or role
 * is encoded - just "issued to a passcode holder, valid until this time." */
export function createSessionToken(secret: string, expiresAtMs: number): string {
  return `${expiresAtMs}${SEPARATOR}${sign(expiresAtMs, secret)}`;
}

export function verifySessionToken(token: string, secret: string, nowMs: number): boolean {
  const separatorIndex = token.indexOf(SEPARATOR);
  if (separatorIndex === -1) return false;

  const expiresAtRaw = token.slice(0, separatorIndex);
  const signature = token.slice(separatorIndex + 1);

  const expiresAtMs = Number(expiresAtRaw);
  if (!Number.isFinite(expiresAtMs)) return false;
  if (nowMs >= expiresAtMs) return false;

  const expectedSignature = sign(expiresAtMs, secret);
  const expectedBuffer = Buffer.from(expectedSignature, "hex");
  const actualBuffer = Buffer.from(signature, "hex");

  if (expectedBuffer.length !== actualBuffer.length) return false;
  return timingSafeEqual(expectedBuffer, actualBuffer);
}
