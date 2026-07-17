import { act, renderHook } from "@testing-library/react";
import { describe, expect, test } from "vitest";

import { useQuizFlow } from "./use-quiz-flow";

const IDS = ["q1", "q2", "q3"];

describe("useQuizFlow", () => {
  test("Prev is disabled on the first question", () => {
    const { result } = renderHook(() => useQuizFlow({ questionIds: IDS }));
    expect(result.current.canGoPrev).toBe(false);
  });

  test("Next is disabled until the current question is answered", () => {
    const { result } = renderHook(() => useQuizFlow({ questionIds: IDS }));
    expect(result.current.canGoNext).toBe(false);

    act(() => result.current.answer("q1", "a"));
    expect(result.current.canGoNext).toBe(true);
  });

  test("answers survive navigating prev -> next -> prev", () => {
    const { result } = renderHook(() => useQuizFlow({ questionIds: IDS }));

    act(() => result.current.answer("q1", "a"));
    act(() => result.current.next());
    expect(result.current.currentQuestionId).toBe("q2");

    act(() => result.current.answer("q2", "b"));
    act(() => result.current.prev());
    expect(result.current.currentQuestionId).toBe("q1");
    expect(result.current.answers).toEqual({ q1: "a", q2: "b" });
    expect(result.current.canGoNext).toBe(true); // q1 is still answered
  });

  test("isLast is true on the final question", () => {
    const { result } = renderHook(() => useQuizFlow({ questionIds: IDS }));
    act(() => result.current.answer("q1", "a"));
    act(() => result.current.next());
    act(() => result.current.answer("q2", "b"));
    act(() => result.current.next());

    expect(result.current.currentQuestionId).toBe("q3");
    expect(result.current.isLast).toBe(true);
    expect(result.current.canGoNext).toBe(false); // q3 unanswered yet
  });

  test("progress reflects answered count over total questions", () => {
    const { result } = renderHook(() => useQuizFlow({ questionIds: IDS }));
    expect(result.current.progress).toBe(0);

    act(() => result.current.answer("q1", "a"));
    expect(result.current.progress).toBeCloseTo(1 / 3);

    act(() => result.current.answer("q2", "b"));
    expect(result.current.progress).toBeCloseTo(2 / 3);
  });

  test("retake resets to question 1 with no answers retained", () => {
    const { result } = renderHook(() => useQuizFlow({ questionIds: IDS }));
    act(() => result.current.answer("q1", "a"));
    act(() => result.current.next());
    act(() => result.current.retake());

    expect(result.current.currentQuestionId).toBe("q1");
    expect(result.current.answers).toEqual({});
    expect(result.current.progress).toBe(0);
  });
});
