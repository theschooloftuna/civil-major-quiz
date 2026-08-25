import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";

import { ParticipantsTable } from "./participants-table";
import type { AnalyticsRow } from "@/lib/supabase/analytics";

function row(): AnalyticsRow {
  return {
    id: crypto.randomUUID(),
    createdAt: "2026-08-01T10:00:00Z",
    variant: "choice",
    topMajors: [{ majorId: "structural", raw: 3, max: 3, percentage: 100 }],
    email: null,
  };
}

describe("ParticipantsTable", () => {
  test("points pagination at the basePath it is given, not a hardcoded route", () => {
    render(
      <ParticipantsTable
        rows={[row()]}
        currentPage={2}
        totalPages={3}
        basePath="/analytics/quiz"
      />
    );

    expect(screen.getByRole("link", { name: /previous/i })).toHaveAttribute(
      "href",
      "/analytics/quiz?page=1"
    );
    expect(screen.getByRole("link", { name: /next/i })).toHaveAttribute(
      "href",
      "/analytics/quiz?page=3"
    );
  });

  test("hides pagination on a single page", () => {
    render(
      <ParticipantsTable rows={[row()]} currentPage={1} totalPages={1} basePath="/analytics/quiz" />
    );

    expect(screen.queryByRole("link", { name: /next/i })).not.toBeInTheDocument();
  });
});
