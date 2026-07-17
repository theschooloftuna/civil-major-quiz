import { beforeEach, describe, expect, test, vi } from "vitest";

const orderMock = vi.fn();
const selectMock = vi.fn(() => ({ order: orderMock }));
const fromMock = vi.fn(() => ({ select: selectMock }));
const getSupabaseAdminClientMock = vi.fn(() => ({ from: fromMock }));

vi.mock("./admin-client", () => ({
  getSupabaseAdminClient: () => getSupabaseAdminClientMock(),
}));

const { getAnalyticsRows } = await import("./analytics");

describe("getAnalyticsRows", () => {
  beforeEach(() => {
    orderMock.mockReset();
    fromMock.mockClear();
    getSupabaseAdminClientMock.mockReset().mockReturnValue({ from: fromMock });
  });

  test("reads from the quiz_results base table, ordered newest first", async () => {
    orderMock.mockResolvedValue({ data: [], error: null });

    await getAnalyticsRows();

    expect(fromMock).toHaveBeenCalledWith("quiz_results");
    expect(orderMock).toHaveBeenCalledWith("created_at", { ascending: false });
  });

  test("maps rows to camelCase, including email", async () => {
    orderMock.mockResolvedValue({
      data: [
        {
          id: "abc",
          created_at: "2026-07-01T00:00:00Z",
          variant: "choice",
          top_majors: [{ majorId: "structural", raw: 3, max: 3, percentage: 100 }],
          email: "student@example.com",
        },
      ],
      error: null,
    });

    const result = await getAnalyticsRows();

    expect(result).toEqual([
      {
        id: "abc",
        createdAt: "2026-07-01T00:00:00Z",
        variant: "choice",
        topMajors: [{ majorId: "structural", raw: 3, max: 3, percentage: 100 }],
        email: "student@example.com",
      },
    ]);
  });

  test("returns an empty array when there are no rows, not null", async () => {
    orderMock.mockResolvedValue({ data: [], error: null });
    expect(await getAnalyticsRows()).toEqual([]);
  });

  test("returns null on a query error instead of throwing", async () => {
    orderMock.mockResolvedValue({ data: null, error: { message: "boom" } });
    expect(await getAnalyticsRows()).toBeNull();
  });

  test("returns null instead of crashing the page when the admin client can't even be constructed", async () => {
    getSupabaseAdminClientMock.mockImplementation(() => {
      throw new Error("Missing SUPABASE_URL or SUPABASE_SECRET_KEY environment variables.");
    });
    expect(await getAnalyticsRows()).toBeNull();
  });
});
