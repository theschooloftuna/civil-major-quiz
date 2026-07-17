import { beforeEach, describe, expect, test, vi } from "vitest";

const insertMock = vi.fn();
const fromMock = vi.fn(() => ({ insert: insertMock }));
const rpcMock = vi.fn();
const getSupabaseClientMock = vi.fn(() => ({ from: fromMock, rpc: rpcMock }));

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
    getSupabaseClientMock.mockReset().mockReturnValue({ from: fromMock, rpc: rpcMock });
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
    rpcMock.mockReset();
    getSupabaseClientMock.mockReset().mockReturnValue({ from: fromMock, rpc: rpcMock });
  });

  test("rejects a malformed email before running any query", async () => {
    const result = await subscribeToUpdates(baseInput.id, "not-an-email");
    expect(result).toEqual({ saved: false });
    expect(rpcMock).not.toHaveBeenCalled();
  });

  test("calls the subscribe_quiz_result function for a validly formatted email", async () => {
    rpcMock.mockResolvedValue({ data: true, error: null });
    const result = await subscribeToUpdates(baseInput.id, "student@example.com");

    expect(rpcMock).toHaveBeenCalledWith("subscribe_quiz_result", {
      result_id: baseInput.id,
      new_email: "student@example.com",
    });
    expect(result).toEqual({ saved: true });
  });

  test("reports saved: false when the function reports no row updated (already subscribed or unknown id)", async () => {
    rpcMock.mockResolvedValue({ data: false, error: null });
    const result = await subscribeToUpdates(baseInput.id, "student@example.com");
    expect(result).toEqual({ saved: false });
  });

  test("reports saved: false when the rpc call errors", async () => {
    rpcMock.mockResolvedValue({ data: null, error: { message: "network error" } });
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
