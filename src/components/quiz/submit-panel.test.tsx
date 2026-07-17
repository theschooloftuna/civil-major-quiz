import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, test, vi } from "vitest";

const saveQuizResultMock = vi.fn();
const subscribeToUpdatesMock = vi.fn();

vi.mock("@/lib/supabase/actions", () => ({
  saveQuizResult: (...args: unknown[]) => saveQuizResultMock(...args),
  subscribeToUpdates: (...args: unknown[]) => subscribeToUpdatesMock(...args),
}));

const { SubmitPanel } = await import("./submit-panel");

const baseProps = {
  resultId: "11111111-1111-1111-1111-111111111111",
  variant: "choice" as const,
  answers: { q1: "a" },
  scores: [],
  topMajors: [],
};

describe("SubmitPanel", () => {
  beforeEach(() => {
    saveQuizResultMock.mockReset();
    subscribeToUpdatesMock.mockReset();
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText: vi.fn().mockResolvedValue(undefined) },
      configurable: true,
    });
  });

  test("fires the base save on mount with no email involved", async () => {
    saveQuizResultMock.mockResolvedValue({ id: baseProps.resultId, saved: true });
    render(<SubmitPanel {...baseProps} onRetake={vi.fn()} />);

    await waitFor(() => expect(saveQuizResultMock).toHaveBeenCalledTimes(1));
    const payload = saveQuizResultMock.mock.calls[0][0];
    expect(payload).not.toHaveProperty("email");
    expect(payload).toMatchObject({ id: baseProps.resultId, variant: "choice" });
  });

  test("Copy link is disabled until the save succeeds", async () => {
    saveQuizResultMock.mockResolvedValue({ id: baseProps.resultId, saved: true });
    render(<SubmitPanel {...baseProps} onRetake={vi.fn()} />);

    expect(screen.getByRole("button", { name: /preparing link/i })).toBeDisabled();
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /copy link/i })).not.toBeDisabled()
    );
  });

  test("calling Retake invokes onRetake", async () => {
    saveQuizResultMock.mockResolvedValue({ id: baseProps.resultId, saved: true });
    const onRetake = vi.fn();
    const user = userEvent.setup();
    render(<SubmitPanel {...baseProps} onRetake={onRetake} />);

    await user.click(screen.getByRole("button", { name: /retake quiz/i }));
    expect(onRetake).toHaveBeenCalledOnce();
  });

  test("malformed email shows an inline error and never calls subscribeToUpdates", async () => {
    saveQuizResultMock.mockResolvedValue({ id: baseProps.resultId, saved: true });
    const user = userEvent.setup();
    render(<SubmitPanel {...baseProps} onRetake={vi.fn()} />);

    await user.type(screen.getByLabelText(/get updates/i), "not-an-email");
    await user.click(screen.getByRole("button", { name: /^subscribe$/i }));

    expect(await screen.findByText(/enter a valid email/i)).toBeInTheDocument();
    expect(subscribeToUpdatesMock).not.toHaveBeenCalled();
  });

  test("valid email calls subscribeToUpdates and shows a subscribed state on success", async () => {
    saveQuizResultMock.mockResolvedValue({ id: baseProps.resultId, saved: true });
    subscribeToUpdatesMock.mockResolvedValue({ saved: true });
    const user = userEvent.setup();
    render(<SubmitPanel {...baseProps} onRetake={vi.fn()} />);

    await user.type(screen.getByLabelText(/get updates/i), "student@example.com");
    await user.click(screen.getByRole("button", { name: /^subscribe$/i }));

    expect(subscribeToUpdatesMock).toHaveBeenCalledWith(baseProps.resultId, "student@example.com");
    expect(await screen.findByText(/you're subscribed/i)).toBeInTheDocument();
  });
});
