"use server";

import type { MajorScore } from "../scoring";
import type { QuizVariant } from "../quiz-variant";
import { isValidEmail } from "../email";
import { getSupabaseClient } from "./client";

export interface SaveQuizResultInput {
  /** Client-generated UUID so the share link can be shown before save confirms. */
  id: string;
  variant: QuizVariant;
  answers: Record<string, string | number>;
  scores: MajorScore[];
  topMajors: MajorScore[];
}

export interface SaveQuizResultOutput {
  id: string;
  saved: boolean;
}

/**
 * Server Action: fires automatically as soon as results are computed.
 * Never carries an email — that's a separate action (subscribeToUpdates)
 * so the user has time to type one before anything saves. Anyone who can
 * POST here can call it directly, not just through the UI, but the insert
 * uses the anon key, so Postgres RLS (insert only, no select) is the real
 * enforcement boundary, not this function.
 */
export async function saveQuizResult(input: SaveQuizResultInput): Promise<SaveQuizResultOutput> {
  try {
    const { error } = await getSupabaseClient()
      .from("quiz_results")
      .insert({
        id: input.id,
        variant: input.variant,
        answers: input.answers,
        scores: input.scores,
        top_majors: input.topMajors,
      });

    return { id: input.id, saved: !error };
  } catch {
    // getSupabaseClient() throws if env vars are missing/misconfigured -
    // that's a deployment problem, not something the quiz-taker should ever
    // see as a crash. Same contract as a failed insert: caller retries.
    return { id: input.id, saved: false };
  }
}

export interface SubscribeOutput {
  saved: boolean;
}

/**
 * Server Action behind the results screen's "Subscribe" button. Re-validates
 * the email format server-side (render-time validation isn't a security
 * boundary). The update itself can only ever set `email` once — RLS only
 * matches rows where it's still null — so `saved: false` here can mean the
 * write failed OR that this row already has an email; the caller doesn't
 * need to tell those apart.
 */
export async function subscribeToUpdates(id: string, email: string): Promise<SubscribeOutput> {
  if (!isValidEmail(email)) {
    return { saved: false };
  }

  try {
    const { data, error } = await getSupabaseClient()
      .from("quiz_results")
      .update({ email })
      .eq("id", id)
      .select("id")
      .maybeSingle();

    return { saved: !error && data != null };
  } catch {
    return { saved: false };
  }
}
