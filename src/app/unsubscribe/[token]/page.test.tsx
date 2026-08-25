import { beforeEach, describe, expect, test, vi } from "vitest";
import { render, screen } from "@testing-library/react";

const newsletterTokenExistsMock = vi.fn();

vi.mock("@/lib/supabase/newsletter", () => ({
  newsletterTokenExists: (...args: unknown[]) => newsletterTokenExistsMock(...args),
}));

vi.mock("@/lib/newsletter/actions", () => ({
  unsubscribeByToken: vi.fn(),
}));

const { default: UnsubscribePage } = await import("./page");

beforeEach(() => {
  newsletterTokenExistsMock.mockReset();
});

describe("UnsubscribePage", () => {
  test("renders the confirmation button for a valid token", async () => {
    newsletterTokenExistsMock.mockResolvedValue(true);

    const jsx = await UnsubscribePage({ params: Promise.resolve({ token: "tok-1" }) });
    render(jsx);

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(/unsubscribe/i);
    expect(screen.getByRole("button", { name: /^unsubscribe$/i })).toBeInTheDocument();
  });

  test("looks the token up rather than trusting the URL", async () => {
    newsletterTokenExistsMock.mockResolvedValue(true);

    await UnsubscribePage({ params: Promise.resolve({ token: "tok-1" }) });

    expect(newsletterTokenExistsMock).toHaveBeenCalledWith("tok-1");
  });

  test("404s for an unknown token", async () => {
    newsletterTokenExistsMock.mockResolvedValue(false);

    await expect(
      UnsubscribePage({ params: Promise.resolve({ token: "nope" }) })
    ).rejects.toMatchObject({ digest: "NEXT_HTTP_ERROR_FALLBACK;404" });
  });

  test("404s for a token that isn't a uuid at all", async () => {
    newsletterTokenExistsMock.mockResolvedValue(false);

    await expect(
      UnsubscribePage({ params: Promise.resolve({ token: "../../etc/passwd" }) })
    ).rejects.toMatchObject({ digest: "NEXT_HTTP_ERROR_FALLBACK;404" });
  });
});
