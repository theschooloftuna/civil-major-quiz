import { beforeEach, describe, expect, test, vi } from "vitest";

const insertMock = vi.fn();
const fromMock = vi.fn(() => ({ insert: insertMock }));

vi.mock("./client", () => ({
  getSupabaseClient: () => ({ from: fromMock }),
}));

const { saveQuizResult } = await import("./actions");

const baseInput = {
  id: "11111111-1111-1111-1111-111111111111",
  variant: "choice" as const,
  answers: { q1: "a" },
  scores: [],
  topMajors: [],
};

describe("saveQuizResult", () => {
  beforeEach(() => {
    insertMock.mockReset();
    fromMock.mockClear();
  });

  test("inserts into quiz_results with a null email when none is given", async () => {
    insertMock.mockResolvedValue({ error: null });
    const result = await saveQuizResult(baseInput);

    expect(fromMock).toHaveBeenCalledWith("quiz_results");
    expect(insertMock).toHaveBeenCalledWith(expect.objectContaining({ id: baseInput.id, email: null }));
    expect(result).toEqual({ id: baseInput.id, saved: true });
  });

  test("includes a validly formatted email", async () => {
    insertMock.mockResolvedValue({ error: null });
    await saveQuizResult({ ...baseInput, email: "student@example.com" });

    expect(insertMock).toHaveBeenCalledWith(expect.objectContaining({ email: "student@example.com" }));
  });

  test("discards a malformed email instead of saving it, even though the caller sent one", async () => {
    insertMock.mockResolvedValue({ error: null });
    await saveQuizResult({ ...baseInput, email: "not-an-email" });

    expect(insertMock).toHaveBeenCalledWith(expect.objectContaining({ email: null }));
  });

  test("reports saved: false when the insert fails, without throwing", async () => {
    insertMock.mockResolvedValue({ error: { message: "network error" } });
    const result = await saveQuizResult(baseInput);
    expect(result).toEqual({ id: baseInput.id, saved: false });
  });
});
