import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, test, vi } from "vitest";

vi.mock("@/lib/supabase/actions", () => ({
  saveQuizResult: vi.fn().mockResolvedValue({ id: "test-id", saved: true }),
  subscribeToUpdates: vi.fn().mockResolvedValue({ saved: true }),
}));

const { QuizFlow } = await import("./quiz-flow");

async function completeQuiz(user: ReturnType<typeof userEvent.setup>) {
  for (let i = 0; i < 7; i++) {
    const options = screen.getAllByRole("button", { pressed: false });
    await user.click(options[0]);
    const isLast = i === 6;
    await user.click(screen.getByRole("button", { name: isLast ? "Submit" : "Next" }));
  }
}

describe("QuizFlow", () => {
  test("renders exactly one question at a time", () => {
    render(<QuizFlow variant="choice" />);
    expect(screen.getAllByRole("group")).toHaveLength(1);
  });

  test("Next is disabled until an option is picked, then advances to question 2", async () => {
    const user = userEvent.setup();
    render(<QuizFlow variant="choice" />);

    expect(screen.getByRole("button", { name: "Next" })).toBeDisabled();

    const [firstOption] = screen.getAllByRole("button", { pressed: false });
    await user.click(firstOption);
    expect(screen.getByRole("button", { name: "Next" })).not.toBeDisabled();

    await user.click(screen.getByRole("button", { name: "Next" }));
    expect(screen.getAllByRole("group")).toHaveLength(1);
  });

  test("a previously selected answer still shows as selected after Prev then revisiting", async () => {
    const user = userEvent.setup();
    render(<QuizFlow variant="choice" />);

    const [firstOption] = screen.getAllByRole("button", { pressed: false });
    const firstOptionLabel = firstOption.textContent;
    await user.click(firstOption);
    await user.click(screen.getByRole("button", { name: "Next" }));

    const [secondQuestionOption] = screen.getAllByRole("button", { pressed: false });
    await user.click(secondQuestionOption);
    await user.click(screen.getByRole("button", { name: "Prev" }));

    const selectedOption = screen.getByRole("button", { pressed: true });
    expect(selectedOption.textContent).toBe(firstOptionLabel);
  });

  test("progress bar fill grows as questions are answered", async () => {
    const user = userEvent.setup();
    render(<QuizFlow variant="choice" />);

    const progressBar = () => document.querySelector('[role="progressbar"]')!;
    expect(progressBar()).toHaveAttribute("aria-valuenow", "0");

    const [firstOption] = screen.getAllByRole("button", { pressed: false });
    await user.click(firstOption);
    expect(progressBar()).toHaveAttribute("aria-valuenow", String(Math.round((1 / 7) * 100)));
  });

  test("completing all 7 multiple-choice questions reaches the results view", async () => {
    const user = userEvent.setup();
    render(<QuizFlow variant="choice" />);

    await completeQuiz(user);

    expect(screen.getByRole("button", { name: "Retake quiz" })).toBeInTheDocument();
    expect(screen.getByText(/#1 match/i)).toBeInTheDocument();
  });

  test("completing all 7 scale questions reaches the results view", async () => {
    const user = userEvent.setup();
    render(<QuizFlow variant="scale" />);

    await completeQuiz(user);

    expect(screen.getByRole("button", { name: "Retake quiz" })).toBeInTheDocument();
    expect(screen.getByText(/#1 match/i)).toBeInTheDocument();
  });

  test("Retake returns to question 1 with progress reset", async () => {
    const user = userEvent.setup();
    render(<QuizFlow variant="choice" />);

    await completeQuiz(user);
    await user.click(screen.getByRole("button", { name: "Retake quiz" }));

    expect(screen.getAllByRole("group")).toHaveLength(1);
    expect(document.querySelector('[role="progressbar"]')).toHaveAttribute("aria-valuenow", "0");
    expect(screen.getByRole("button", { name: "Next" })).toBeDisabled();
  });
});
