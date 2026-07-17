import { render, screen } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";

const getQuizResultByIdMock = vi.fn();

vi.mock("@/lib/supabase/quiz-results", () => ({
  getQuizResultById: (...args: unknown[]) => getQuizResultByIdMock(...args),
}));

const { default: ResultPage } = await import("./page");

describe("ResultPage", () => {
  test("renders the major's name, percentage, description, and careers for a known id", async () => {
    getQuizResultByIdMock.mockResolvedValue({
      id: "abc",
      createdAt: "2026-01-01T00:00:00Z",
      variant: "choice",
      answers: {},
      scores: [],
      topMajors: [
        { majorId: "geotechnical", raw: 9, max: 9, percentage: 100 },
      ],
    });

    const jsx = await ResultPage({ params: Promise.resolve({ id: "abc" }) });
    render(jsx);

    expect(screen.getByText("Geotechnical Engineering")).toBeInTheDocument();
    expect(screen.getByText("100%")).toBeInTheDocument();
    expect(screen.getByText(/soil and rock/i)).toBeInTheDocument();
    expect(screen.getByText(/Foundation Designer/)).toBeInTheDocument();
  });

  test("calls notFound() for an unknown id", async () => {
    getQuizResultByIdMock.mockResolvedValue(null);

    await expect(ResultPage({ params: Promise.resolve({ id: "does-not-exist" }) })).rejects.toMatchObject(
      { digest: "NEXT_HTTP_ERROR_FALLBACK;404" }
    );
  });
});
