import "server-only";
import { cookies } from "next/headers";
import { verifySessionToken } from "./session";

export const ANALYTICS_SESSION_COOKIE = "analytics_session";
export const ANALYTICS_SESSION_COOKIE_PATH = "/analytics";

/**
 * Trims the raw env var - some hosting platforms' env var UIs (unlike
 * dotenv-style local parsing) don't strip a copy-pasted trailing newline
 * or surrounding quotes, which would otherwise make every passcode
 * comparison fail silently in production only.
 */
export function getAnalyticsPasscode(): string | undefined {
  const raw = process.env.ANALYTICS_PASSCODE?.trim();
  return raw ? raw : undefined;
}

export async function hasValidAnalyticsSession(): Promise<boolean> {
  const secret = getAnalyticsPasscode();
  if (!secret) return false;

  const cookieStore = await cookies();
  const token = cookieStore.get(ANALYTICS_SESSION_COOKIE)?.value;
  if (!token) return false;

  return verifySessionToken(token, secret, Date.now());
}
