import { beforeEach, describe, expect, test, vi } from "vitest";

const maybeSingleMock = vi.fn();
const eqMock = vi.fn(() => ({ maybeSingle: maybeSingleMock }));
const selectMock = vi.fn(() => ({ eq: eqMock }));
const fromMock = vi.fn(() => ({ select: selectMock }));

vi.mock("./client", () => ({
  getSupabaseClient: () => ({ from: fromMock }),
}));

const { getQuizResultById } = await import("./quiz-results");

describe("getQuizResultById", () => {
  beforeEach(() => {
    maybeSingleMock.mockReset();
    fromMock.mockClear();
  });

  test("reads from the quiz_results_public view, not the base table", async () => {
    maybeSingleMock.mockResolvedValue({
      data: {
        id: "abc",
        created_at: "2026-01-01T00:00:00Z",
        variant: "choice",
        answers: {},
        scores: [],
        top_majors: [],
      },
      error: null,
    });

    await getQuizResultById("abc");
    expect(fromMock).toHaveBeenCalledWith("quiz_results_public");
  });

  test("never includes an email property, even if the underlying row somehow had one", async () => {
    maybeSingleMock.mockResolvedValue({
      data: {
        id: "abc",
        created_at: "2026-01-01T00:00:00Z",
        variant: "choice",
        answers: {},
        scores: [],
        top_majors: [],
        // A misconfigured view could theoretically leak this; the mapping in
        // getQuizResultById must not pass it through even if it's present.
        email: "leaked@example.com",
      },
      error: null,
    });

    const result = await getQuizResultById("abc");
    expect(result).not.toHaveProperty("email");
    expect(JSON.stringify(result)).not.toContain("leaked@example.com");
  });

  test("returns null when the row doesn't exist", async () => {
    maybeSingleMock.mockResolvedValue({ data: null, error: null });
    expect(await getQuizResultById("does-not-exist")).toBeNull();
  });

  test("returns null on a query error instead of throwing", async () => {
    maybeSingleMock.mockResolvedValue({ data: null, error: { message: "boom" } });
    expect(await getQuizResultById("abc")).toBeNull();
  });
});
