import { beforeEach, describe, expect, test, vi } from "vitest";

const insertMock = vi.fn();
const maybeSingleMock = vi.fn();
const selectMock = vi.fn(() => ({ maybeSingle: maybeSingleMock }));
const eqMock = vi.fn(() => ({ select: selectMock }));
const updateMock = vi.fn(() => ({ eq: eqMock }));
const fromMock = vi.fn(() => ({ insert: insertMock, update: updateMock }));
const getSupabaseClientMock = vi.fn(() => ({ from: fromMock }));

vi.mock("./client", () => ({
  getSupabaseClient: () => getSupabaseClientMock(),
}));

const { saveQuizResult, subscribeToUpdates } = await import("./actions");

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
    getSupabaseClientMock.mockReset().mockReturnValue({ from: fromMock });
  });

  test("inserts into quiz_results with no email field at all", async () => {
    insertMock.mockResolvedValue({ error: null });
    const result = await saveQuizResult(baseInput);

    expect(fromMock).toHaveBeenCalledWith("quiz_results");
    const payload = insertMock.mock.calls[0][0];
    expect(payload).not.toHaveProperty("email");
    expect(payload).toMatchObject({ id: baseInput.id, variant: "choice" });
    expect(result).toEqual({ id: baseInput.id, saved: true });
  });

  test("reports saved: false when the insert fails, without throwing", async () => {
    insertMock.mockResolvedValue({ error: { message: "network error" } });
    const result = await saveQuizResult(baseInput);
    expect(result).toEqual({ id: baseInput.id, saved: false });
  });

  test("reports saved: false instead of rejecting when the client can't even be constructed", async () => {
    getSupabaseClientMock.mockImplementation(() => {
      throw new Error("Missing SUPABASE_URL or SUPABASE_ANON_KEY environment variables.");
    });
    const result = await saveQuizResult(baseInput);
    expect(result).toEqual({ id: baseInput.id, saved: false });
  });
});

describe("subscribeToUpdates", () => {
  beforeEach(() => {
    updateMock.mockClear();
    eqMock.mockClear();
    maybeSingleMock.mockReset();
    getSupabaseClientMock.mockReset().mockReturnValue({ from: fromMock });
  });

  test("rejects a malformed email before running any query", async () => {
    const result = await subscribeToUpdates(baseInput.id, "not-an-email");
    expect(result).toEqual({ saved: false });
    expect(updateMock).not.toHaveBeenCalled();
  });

  test("sends a scoped update for a validly formatted email", async () => {
    maybeSingleMock.mockResolvedValue({ data: { id: baseInput.id }, error: null });
    const result = await subscribeToUpdates(baseInput.id, "student@example.com");

    expect(updateMock).toHaveBeenCalledWith({ email: "student@example.com" });
    expect(eqMock).toHaveBeenCalledWith("id", baseInput.id);
    expect(result).toEqual({ saved: true });
  });

  test("reports saved: false when RLS matches no rows (already subscribed or unknown id)", async () => {
    maybeSingleMock.mockResolvedValue({ data: null, error: null });
    const result = await subscribeToUpdates(baseInput.id, "student@example.com");
    expect(result).toEqual({ saved: false });
  });

  test("reports saved: false instead of rejecting when the client can't even be constructed", async () => {
    getSupabaseClientMock.mockImplementation(() => {
      throw new Error("Missing SUPABASE_URL or SUPABASE_ANON_KEY environment variables.");
    });
    const result = await subscribeToUpdates(baseInput.id, "student@example.com");
    expect(result).toEqual({ saved: false });
  });
});
