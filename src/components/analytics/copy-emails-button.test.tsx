import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

const toastSuccess = vi.fn();
const toastError = vi.fn();

vi.mock("sonner", () => ({
  toast: { success: (...a: unknown[]) => toastSuccess(...a), error: (...a: unknown[]) => toastError(...a) },
}));

const { CopyEmailsButton } = await import("./copy-emails-button");

const writeText = vi.fn();

beforeEach(() => {
  toastSuccess.mockReset();
  toastError.mockReset();
  writeText.mockReset().mockResolvedValue(undefined);
  // navigator.clipboard is getter-only in jsdom, so it has to be redefined
  // rather than assigned - same approach as submit-panel.test.tsx.
  Object.defineProperty(navigator, "clipboard", {
    value: { writeText },
    configurable: true,
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("CopyEmailsButton", () => {
  test("states how many addresses it will copy", () => {
    render(<CopyEmailsButton emails={["a@x.co", "b@x.co"]} />);

    expect(screen.getByRole("button", { name: /copy 2 subscribed emails/i })).toBeInTheDocument();
  });

  test("uses the singular for one address", () => {
    render(<CopyEmailsButton emails={["a@x.co"]} />);

    expect(screen.getByRole("button", { name: /copy 1 subscribed email$/i })).toBeInTheDocument();
  });

  test("copies the addresses newline-separated", async () => {
    const user = userEvent.setup();
    Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
    render(<CopyEmailsButton emails={["a@x.co", "b@x.co"]} />);

    await user.click(screen.getByRole("button"));

    expect(writeText).toHaveBeenCalledWith("a@x.co\nb@x.co");
    expect(toastSuccess).toHaveBeenCalledWith("Copied 2 emails.");
  });

  test("is disabled with nothing to copy, rather than copying an empty string", async () => {
    render(<CopyEmailsButton emails={[]} />);

    const button = screen.getByRole("button", { name: /no emails to copy/i });
    expect(button).toBeDisabled();
    expect(writeText).not.toHaveBeenCalled();
  });

  test("reports a clipboard rejection instead of appearing to have worked", async () => {
    writeText.mockRejectedValue(new Error("denied"));
    const user = userEvent.setup();
    Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
    render(<CopyEmailsButton emails={["a@x.co"]} />);

    await user.click(screen.getByRole("button"));

    expect(toastError).toHaveBeenCalledWith("Couldn't copy to the clipboard.");
    expect(toastSuccess).not.toHaveBeenCalled();
  });
});
