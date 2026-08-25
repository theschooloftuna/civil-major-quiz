import { describe, expect, test, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("@/lib/newsletter/actions", () => ({
  subscribeToNewsletter: vi.fn(),
}));

const { default: NewsletterPage, metadata } = await import("./page");

describe("NewsletterPage", () => {
  test("renders a heading, one paragraph, an email field and a button", () => {
    const { container } = render(<NewsletterPage />);

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(/newsletter/i);
    expect(container.querySelectorAll("p")).toHaveLength(1);
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^subscribe$/i })).toBeInTheDocument();
  });

  test("carries nothing beyond the pitch - no quiz cross-link, no cadence promise", () => {
    render(<NewsletterPage />);

    expect(screen.queryByRole("link")).not.toBeInTheDocument();
    expect(screen.queryByText(/quiz/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/weekly|monthly|every week|every month/i)).not.toBeInTheDocument();
  });

  test("sets the page title", () => {
    expect(metadata.title).toBe("Newsletter | Civil Major Quiz");
  });
});
