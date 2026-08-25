import { describe, expect, test, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("@/lib/newsletter/actions", () => ({
  subscribeToNewsletter: vi.fn(),
}));

const { default: NewsletterPage, metadata } = await import("./page");

describe("NewsletterPage", () => {
  test("renders the Tuna Times masthead and tagline", () => {
    render(<NewsletterPage />);

    expect(screen.getByText(/the school of tuna presents/i)).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Tuna Times");
    expect(screen.getByText(/still figuring things out/i)).toBeInTheDocument();
  });

  test("states the launch date", () => {
    render(<NewsletterPage />);

    expect(screen.getByText(/launching september 1st, 2026/i)).toBeInTheDocument();
  });

  test("shows the illustration with descriptive alt text", () => {
    render(<NewsletterPage />);

    const illustration = screen.getByRole("img", { name: /person reading a newspaper/i });
    expect(illustration).toBeInTheDocument();
  });

  test("lists every topic the newsletter covers", () => {
    render(<NewsletterPage />);

    const items = screen.getAllByRole("listitem");
    expect(items).toHaveLength(7);
    expect(items[0]).toHaveTextContent(/opportunities around the world/i);
    expect(items[6]).toHaveTextContent(/learning struggles/i);
  });

  test("pairs each topic with an icon", () => {
    const { container } = render(<NewsletterPage />);

    // Phosphor renders an <svg> per topic; the alt-texted illustration is an
    // <img>, so it can't be inflating this count.
    expect(container.querySelectorAll("li svg")).toHaveLength(7);
  });

  test("no longer carries the 5-steps line", () => {
    render(<NewsletterPage />);

    expect(screen.queryByText(/nonsense/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/5 steps/i)).not.toBeInTheDocument();
  });

  test("leads with the illustration, above the masthead", () => {
    render(<NewsletterPage />);

    const illustration = screen.getByRole("img", { name: /person reading a newspaper/i });
    const heading = screen.getByRole("heading", { level: 1 });

    expect(
      illustration.compareDocumentPosition(heading) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
  });

  test("puts the signup form ahead of the topic list", () => {
    render(<NewsletterPage />);

    const button = screen.getByRole("button", { name: /join the tuna times/i });
    const topics = screen.getByText(/expect things like/i);

    expect(
      button.compareDocumentPosition(topics) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
  });

  test("renders the signup form", () => {
    render(<NewsletterPage />);

    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /join the tuna times/i })).toBeInTheDocument();
  });

  test("still has no quiz cross-link and makes no cadence promise", () => {
    render(<NewsletterPage />);

    expect(screen.queryByRole("link")).not.toBeInTheDocument();
    expect(screen.queryByText(/quiz/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/weekly|monthly|every week|every month/i)).not.toBeInTheDocument();
  });

  test("sets the page title", () => {
    expect(metadata.title).toBe("Tuna Times | Civil Major Quiz");
  });
});
