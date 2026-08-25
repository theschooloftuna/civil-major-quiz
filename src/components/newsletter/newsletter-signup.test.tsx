import { beforeEach, describe, expect, test, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const subscribeToNewsletterMock = vi.fn();

vi.mock("@/lib/newsletter/actions", () => ({
  subscribeToNewsletter: (...args: unknown[]) => subscribeToNewsletterMock(...args),
}));

const { NewsletterSignup } = await import("./newsletter-signup");

beforeEach(() => {
  subscribeToNewsletterMock.mockReset().mockResolvedValue({ saved: true });
});

describe("NewsletterSignup", () => {
  test("renders an email field and a subscribe button", () => {
    render(<NewsletterSignup />);

    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^subscribe$/i })).toBeInTheDocument();
  });

  test("subscribes a valid address", async () => {
    const user = userEvent.setup();
    render(<NewsletterSignup />);

    await user.type(screen.getByLabelText(/email/i), "reader@example.com");
    await user.click(screen.getByRole("button", { name: /^subscribe$/i }));

    expect(subscribeToNewsletterMock).toHaveBeenCalledWith("reader@example.com");
  });

  test("shows a success message in place of the form", async () => {
    const user = userEvent.setup();
    render(<NewsletterSignup />);

    await user.type(screen.getByLabelText(/email/i), "reader@example.com");
    await user.click(screen.getByRole("button", { name: /^subscribe$/i }));

    expect(await screen.findByText(/on the list/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/email/i)).not.toBeInTheDocument();
  });

  test("shows the same success for an address already on the list", async () => {
    // The action cannot distinguish the two cases, so neither can the UI.
    const user = userEvent.setup();
    render(<NewsletterSignup />);

    await user.type(screen.getByLabelText(/email/i), "existing@example.com");
    await user.click(screen.getByRole("button", { name: /^subscribe$/i }));

    expect(await screen.findByText(/on the list/i)).toBeInTheDocument();
    expect(screen.queryByText(/already/i)).not.toBeInTheDocument();
  });

  test("rejects an invalid address inline without calling the action", async () => {
    const user = userEvent.setup();
    render(<NewsletterSignup />);

    await user.type(screen.getByLabelText(/email/i), "not-an-email");
    await user.click(screen.getByRole("button", { name: /^subscribe$/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/valid email/i);
    expect(subscribeToNewsletterMock).not.toHaveBeenCalled();
  });

  test("clears the validation error once the address is edited", async () => {
    const user = userEvent.setup();
    render(<NewsletterSignup />);

    const field = screen.getByLabelText(/email/i);
    await user.type(field, "nope");
    await user.click(screen.getByRole("button", { name: /^subscribe$/i }));
    expect(await screen.findByRole("alert")).toBeInTheDocument();

    await user.type(field, "@example.com");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  test("surfaces a failure from the action and keeps the form usable", async () => {
    subscribeToNewsletterMock.mockResolvedValue({ saved: false });
    const user = userEvent.setup();
    render(<NewsletterSignup />);

    await user.type(screen.getByLabelText(/email/i), "reader@example.com");
    await user.click(screen.getByRole("button", { name: /^subscribe$/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/couldn't subscribe/i);
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
  });

  test("disables and relabels the button while the request is in flight", async () => {
    let release: (value: { saved: boolean }) => void = () => {};
    subscribeToNewsletterMock.mockReturnValue(
      new Promise<{ saved: boolean }>((resolve) => {
        release = resolve;
      })
    );

    const user = userEvent.setup();
    render(<NewsletterSignup />);

    await user.type(screen.getByLabelText(/email/i), "reader@example.com");
    await user.click(screen.getByRole("button", { name: /^subscribe$/i }));

    const pending = await screen.findByRole("button", { name: /subscribing…/i });
    expect(pending).toBeDisabled();

    release({ saved: true });
    expect(await screen.findByText(/on the list/i)).toBeInTheDocument();
  });
});
