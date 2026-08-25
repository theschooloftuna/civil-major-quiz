import { beforeEach, describe, expect, test, vi } from "vitest";

const selectChain = { order: vi.fn() };
const fromMock = vi.fn(() => ({ select: () => selectChain }));
const getSupabaseAdminClientMock = vi.fn(() => ({ from: fromMock }));

vi.mock("./admin-client", () => ({
  getSupabaseAdminClient: () => getSupabaseAdminClientMock(),
}));

const { getSubscriberRows } = await import("./subscribers");

const DB_ROW = {
  id: "sub-1",
  email: "reader@example.com",
  status: "subscribed",
  source: "quiz",
  created_at: "2026-08-01T10:00:00Z",
  subscribed_at: "2026-08-01T10:00:00Z",
  unsubscribed_at: null,
};

beforeEach(() => {
  selectChain.order.mockReset();
  fromMock.mockClear();
  getSupabaseAdminClientMock.mockClear().mockReturnValue({ from: fromMock });
});

describe("getSubscriberRows", () => {
  test("reads the subscriber table, newest first", async () => {
    selectChain.order.mockResolvedValue({ data: [], error: null });

    await getSubscriberRows();

    expect(fromMock).toHaveBeenCalledWith("newsletter_subscribers");
    expect(selectChain.order).toHaveBeenCalledWith("created_at", { ascending: false });
  });

  test("maps snake_case columns onto the camelCase row shape", async () => {
    selectChain.order.mockResolvedValue({ data: [DB_ROW], error: null });

    await expect(getSubscriberRows()).resolves.toEqual([
      {
        id: "sub-1",
        email: "reader@example.com",
        status: "subscribed",
        source: "quiz",
        createdAt: "2026-08-01T10:00:00Z",
        subscribedAt: "2026-08-01T10:00:00Z",
        unsubscribedAt: null,
      },
    ]);
  });

  test("returns an empty list, not null, when there are no subscribers", async () => {
    selectChain.order.mockResolvedValue({ data: [], error: null });
    await expect(getSubscriberRows()).resolves.toEqual([]);
  });

  test("returns null when the query errors, so the page can show config-error", async () => {
    selectChain.order.mockResolvedValue({ data: null, error: { message: "boom" } });
    await expect(getSubscriberRows()).resolves.toBeNull();
  });

  test("returns null when the admin client throws on missing env vars", async () => {
    getSupabaseAdminClientMock.mockImplementation(() => {
      throw new Error("Missing SUPABASE_SECRET_KEY");
    });

    await expect(getSubscriberRows()).resolves.toBeNull();
  });
});
