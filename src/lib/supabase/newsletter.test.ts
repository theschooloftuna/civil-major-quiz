import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

const rpcMock = vi.fn();

vi.mock("./client", () => ({
  getSupabaseClient: () => ({ rpc: (...args: unknown[]) => rpcMock(...args) }),
}));

const { newsletterTokenExists } = await import("./newsletter");

describe("newsletterTokenExists", () => {
  beforeEach(() => {
    rpcMock.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  test("calls the token-existence function with the token", async () => {
    rpcMock.mockResolvedValue({ data: true, error: null });

    await newsletterTokenExists("abc-123");

    expect(rpcMock).toHaveBeenCalledWith("newsletter_token_exists", { token: "abc-123" });
  });

  test("is true for a known token", async () => {
    rpcMock.mockResolvedValue({ data: true, error: null });
    await expect(newsletterTokenExists("abc-123")).resolves.toBe(true);
  });

  test("is false for an unknown token", async () => {
    rpcMock.mockResolvedValue({ data: false, error: null });
    await expect(newsletterTokenExists("nope")).resolves.toBe(false);
  });

  test("is false when the query errors", async () => {
    rpcMock.mockResolvedValue({ data: null, error: { message: "boom" } });
    await expect(newsletterTokenExists("abc-123")).resolves.toBe(false);
  });

  test("degrades to false when the client throws (missing env vars)", async () => {
    rpcMock.mockImplementation(() => {
      throw new Error("Missing SUPABASE_URL");
    });

    await expect(newsletterTokenExists("abc-123")).resolves.toBe(false);
  });
});
