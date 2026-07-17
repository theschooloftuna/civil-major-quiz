import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, test, vi } from "vitest";

const loginToAnalyticsMock = vi.fn();
const refreshMock = vi.fn();

vi.mock("@/lib/analytics/actions", () => ({
  loginToAnalytics: (...args: unknown[]) => loginToAnalyticsMock(...args),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: refreshMock }),
}));

const { LoginForm } = await import("./login-form");

describe("LoginForm", () => {
  beforeEach(() => {
    loginToAnalyticsMock.mockReset();
    refreshMock.mockReset();
  });

  test("submitting the correct passcode refreshes the router", async () => {
    loginToAnalyticsMock.mockResolvedValue({ success: true });
    const user = userEvent.setup();
    render(<LoginForm />);

    await user.type(screen.getByLabelText(/passcode/i), "correct-passcode");
    await user.click(screen.getByRole("button", { name: /enter/i }));

    expect(loginToAnalyticsMock).toHaveBeenCalledWith("correct-passcode");
    expect(refreshMock).toHaveBeenCalledOnce();
  });

  test("submitting an incorrect passcode shows an inline error and does not refresh", async () => {
    loginToAnalyticsMock.mockResolvedValue({ success: false });
    const user = userEvent.setup();
    render(<LoginForm />);

    await user.type(screen.getByLabelText(/passcode/i), "wrong-passcode");
    await user.click(screen.getByRole("button", { name: /enter/i }));

    expect(await screen.findByText(/incorrect passcode/i)).toBeInTheDocument();
    expect(refreshMock).not.toHaveBeenCalled();
  });

  test("the submit button is disabled until a passcode is entered", () => {
    render(<LoginForm />);
    expect(screen.getByRole("button", { name: /enter/i })).toBeDisabled();
  });
});
