import "server-only";

import type { MajorScore } from "../scoring";
import type { QuizVariant } from "../quiz-variant";
import { getSupabaseAdminClient } from "./admin-client";

/**
 * Row shape the /analytics dashboard needs. Deliberately excludes
 * `answers`/`scores` (not used by any dashboard stat) to keep the payload
 * small, unlike the full quiz_results row.
 */
export interface AnalyticsRow {
  id: string;
  createdAt: string;
  variant: QuizVariant;
  topMajors: MajorScore[];
  email: string | null;
}

export async function getAnalyticsRows(): Promise<AnalyticsRow[] | null> {
  try {
    const { data, error } = await getSupabaseAdminClient()
      .from("quiz_results")
      .select("id, created_at, variant, top_majors, email")
      .order("created_at", { ascending: false });

    if (error || !data) return null;

    return data.map((row) => ({
      id: row.id,
      createdAt: row.created_at,
      variant: row.variant,
      topMajors: row.top_majors,
      email: row.email,
    }));
  } catch {
    // getSupabaseAdminClient() throws if env vars are missing/misconfigured -
    // the analytics page degrades to a config-error state instead of
    // crashing, same contract as the anon-key client's call sites.
    return null;
  }
}
