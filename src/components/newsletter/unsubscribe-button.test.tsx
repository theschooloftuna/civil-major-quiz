import { beforeEach, describe, expect, test, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const unsubscribeByTokenMock = vi.fn();

vi.mock("@/lib/newsletter/actions", () => ({
  unsubscribeByToken: (...args: unknown[]) => unsubscribeByTokenMock(...args),
}));

const { UnsubscribeButton } = await import("./unsubscribe-button");

beforeEach(() => {
  unsubscribeByTokenMock.mockReset().mockResolvedValue({ unsubscribed: true });
});

describe("UnsubscribeButton", () => {
  test("does not unsubscribe on render - only on click", () => {
    render(<UnsubscribeButton token="tok-1" />);

    expect(unsubscribeByTokenMock).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: /^unsubscribe$/i })).toBeInTheDocument();
  });

  test("unsubscribes with the token when clicked", async () => {
    const user = userEvent.setup();
    render(<UnsubscribeButton token="tok-1" />);

    await user.click(screen.getByRole("button", { name: /^unsubscribe$/i }));

    expect(unsubscribeByTokenMock).toHaveBeenCalledWith("tok-1");
  });

  test("confirms in place of the button on success", async () => {
    const user = userEvent.setup();
    render(<UnsubscribeButton token="tok-1" />);

    await user.click(screen.getByRole("button", { name: /^unsubscribe$/i }));

    expect(await screen.findByText(/you're unsubscribed/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^unsubscribe$/i })).not.toBeInTheDocument();
  });

  test("reports failure and leaves the button usable", async () => {
    unsubscribeByTokenMock.mockResolvedValue({ unsubscribed: false });
    const user = userEvent.setup();
    render(<UnsubscribeButton token="tok-1" />);

    await user.click(screen.getByRole("button", { name: /^unsubscribe$/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/couldn't unsubscribe/i);
    expect(screen.getByRole("button", { name: /^unsubscribe$/i })).toBeInTheDocument();
  });

  test("disables and relabels the button while in flight", async () => {
    let release: (value: { unsubscribed: boolean }) => void = () => {};
    unsubscribeByTokenMock.mockReturnValue(
      new Promise<{ unsubscribed: boolean }>((resolve) => {
        release = resolve;
      })
    );

    const user = userEvent.setup();
    render(<UnsubscribeButton token="tok-1" />);
    await user.click(screen.getByRole("button", { name: /^unsubscribe$/i }));

    const pending = await screen.findByRole("button", { name: /unsubscribing…/i });
    expect(pending).toBeDisabled();

    release({ unsubscribed: true });
    expect(await screen.findByText(/you're unsubscribed/i)).toBeInTheDocument();
  });

  test("a second click after success is impossible - the button is gone", async () => {
    const user = userEvent.setup();
    render(<UnsubscribeButton token="tok-1" />);

    await user.click(screen.getByRole("button", { name: /^unsubscribe$/i }));
    await screen.findByText(/you're unsubscribed/i);

    expect(unsubscribeByTokenMock).toHaveBeenCalledTimes(1);
  });
});
