"use server";

import { cookies } from "next/headers";
import { createSessionToken } from "./session";
import { ANALYTICS_SESSION_COOKIE, ANALYTICS_SESSION_COOKIE_PATH, getAnalyticsPasscode } from "./auth";

const SESSION_DURATION_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

export interface LoginResult {
  success: boolean;
}

/**
 * Server Action behind the /analytics passcode form. The passcode itself
 * doubles as the session-signing secret, so rotating ANALYTICS_PASSCODE
 * immediately invalidates every outstanding session - not a bug.
 */
export async function loginToAnalytics(passcode: string): Promise<LoginResult> {
  const expected = getAnalyticsPasscode();
  if (!expected || passcode.trim() !== expected) {
    return { success: false };
  }

  const expiresAtMs = Date.now() + SESSION_DURATION_MS;
  const token = createSessionToken(expected, expiresAtMs);

  const cookieStore = await cookies();
  cookieStore.set(ANALYTICS_SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: ANALYTICS_SESSION_COOKIE_PATH,
    maxAge: SESSION_DURATION_MS / 1000,
  });

  return { success: true };
}

export async function logoutFromAnalytics(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete({ name: ANALYTICS_SESSION_COOKIE, path: ANALYTICS_SESSION_COOKIE_PATH });
}
