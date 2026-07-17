import "server-only";

import type { MajorScore } from "../scoring";
import type { QuizVariant } from "../quiz-variant";
import { getSupabaseClient } from "./client";

/**
 * Shape returned by the public read path. There is no `email` field here —
 * not `email?: undefined`, the field does not exist — because this reads
 * from `quiz_results_public`, a view that never had an email column.
 */
export interface PublicQuizResult {
  id: string;
  createdAt: string;
  variant: QuizVariant;
  answers: Record<string, string | number>;
  scores: MajorScore[];
  topMajors: MajorScore[];
}

export async function getQuizResultById(id: string): Promise<PublicQuizResult | null> {
  try {
    const { data, error } = await getSupabaseClient()
      .from("quiz_results_public")
      .select("id, created_at, variant, answers, scores, top_majors")
      .eq("id", id)
      .maybeSingle();

    if (error || !data) return null;

    return {
      id: data.id,
      createdAt: data.created_at,
      variant: data.variant,
      answers: data.answers,
      scores: data.scores,
      topMajors: data.top_majors,
    };
  } catch {
    // getSupabaseClient() throws if env vars are missing/misconfigured -
    // that should degrade to the same not-found page as an unknown id, not
    // crash the whole route with an unhandled render error.
    return null;
  }
}
