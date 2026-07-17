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
  /** Only persisted when it passes format validation; caller decides whether
   * the consent checkbox was ticked before ever sending a value here. */
  email?: string;
}

export interface SaveQuizResultOutput {
  id: string;
  saved: boolean;
}

/**
 * Server Action: anyone who can POST here can call it directly, not just
 * through the UI, so email format is re-validated server-side rather than
 * trusted from the client. Inserts with the anon key — Postgres RLS (insert
 * only, no select) is the real enforcement boundary, not this function.
 */
export async function saveQuizResult(input: SaveQuizResultInput): Promise<SaveQuizResultOutput> {
  const email = input.email && isValidEmail(input.email) ? input.email : null;

  const { error } = await getSupabaseClient()
    .from("quiz_results")
    .insert({
      id: input.id,
      variant: input.variant,
      answers: input.answers,
      scores: input.scores,
      top_majors: input.topMajors,
      email,
    });

  return { id: input.id, saved: !error };
}
