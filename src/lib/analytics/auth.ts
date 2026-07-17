import "server-only";
import { cookies } from "next/headers";
import { verifySessionToken } from "./session";

export const ANALYTICS_SESSION_COOKIE = "analytics_session";
export const ANALYTICS_SESSION_COOKIE_PATH = "/analytics";

export async function hasValidAnalyticsSession(): Promise<boolean> {
  const secret = process.env.ANALYTICS_PASSCODE;
  if (!secret) return false;

  const cookieStore = await cookies();
  const token = cookieStore.get(ANALYTICS_SESSION_COOKIE)?.value;
  if (!token) return false;

  return verifySessionToken(token, secret, Date.now());
}
