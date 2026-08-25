import { beforeEach, describe, expect, test, vi } from "vitest";

const rpcMock = vi.fn();

vi.mock("../supabase/client", () => ({
  getSupabaseClient: () => ({ rpc: (...args: unknown[]) => rpcMock(...args) }),
}));

const { subscribeToNewsletter, unsubscribeByToken } = await import("./actions");

beforeEach(() => {
  rpcMock.mockReset().mockResolvedValue({ data: true, error: null });
});

describe("subscribeToNewsletter", () => {
  test("calls the subscribe function for a valid address", async () => {
    await expect(subscribeToNewsletter("a@b.co")).resolves.toEqual({ saved: true });
    expect(rpcMock).toHaveBeenCalledWith("subscribe_newsletter", { new_email: "a@b.co" });
  });

  test.each(["", "   ", "not-an-email", "missing@domain", "@example.com", "a b@c.co"])(
    "rejects %j server-side without touching the database",
    async (bad) => {
      await expect(subscribeToNewsletter(bad)).resolves.toEqual({ saved: false });
      expect(rpcMock).not.toHaveBeenCalled();
    }
  );

  test("accepts a padded address, leaving normalization to the database", async () => {
    await expect(subscribeToNewsletter("  A@B.co ")).resolves.toEqual({ saved: true });
    expect(rpcMock).toHaveBeenCalledWith("subscribe_newsletter", { new_email: "  A@B.co " });
  });

  test("reports the same success for an address already on the list", async () => {
    // The database function returns true either way; no enumeration signal
    // reaches the caller.
    rpcMock.mockResolvedValue({ data: true, error: null });
    await expect(subscribeToNewsletter("existing@example.com")).resolves.toEqual({ saved: true });
  });

  test("reports failure when the database errors", async () => {
    rpcMock.mockResolvedValue({ data: null, error: { message: "boom" } });
    await expect(subscribeToNewsletter("a@b.co")).resolves.toEqual({ saved: false });
  });

  test("reports failure when the client throws (missing env vars)", async () => {
    rpcMock.mockImplementation(() => {
      throw new Error("Missing SUPABASE_URL");
    });
    await expect(subscribeToNewsletter("a@b.co")).resolves.toEqual({ saved: false });
  });
});

describe("unsubscribeByToken", () => {
  test("calls the unsubscribe function with the token", async () => {
    await expect(unsubscribeByToken("tok-1")).resolves.toEqual({ unsubscribed: true });
    expect(rpcMock).toHaveBeenCalledWith("unsubscribe_newsletter", { token: "tok-1" });
  });

  test("reports failure for an unknown token", async () => {
    rpcMock.mockResolvedValue({ data: false, error: null });
    await expect(unsubscribeByToken("nope")).resolves.toEqual({ unsubscribed: false });
  });

  test("reports failure when the database errors", async () => {
    rpcMock.mockResolvedValue({ data: null, error: { message: "boom" } });
    await expect(unsubscribeByToken("tok-1")).resolves.toEqual({ unsubscribed: false });
  });

  test("reports failure when the client throws", async () => {
    rpcMock.mockImplementation(() => {
      throw new Error("Missing SUPABASE_URL");
    });
    await expect(unsubscribeByToken("tok-1")).resolves.toEqual({ unsubscribed: false });
  });
});
