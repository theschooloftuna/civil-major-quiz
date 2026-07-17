"use client";

import { useCallback, useState } from "react";

export type QuizAnswerValue = string | number;

export interface UseQuizFlowOptions {
  questionIds: string[];
}

export function useQuizFlow({ questionIds }: UseQuizFlowOptions) {
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, QuizAnswerValue>>({});

  const currentQuestionId = questionIds[index];
  const isFirst = index === 0;
  const isLast = index === questionIds.length - 1;
  const canGoPrev = !isFirst;
  const canGoNext = answers[currentQuestionId] !== undefined;
  const answeredCount = questionIds.filter((id) => answers[id] !== undefined).length;
  const progress = questionIds.length > 0 ? answeredCount / questionIds.length : 0;

  const answer = useCallback((questionId: string, value: QuizAnswerValue) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  }, []);

  const next = useCallback(() => {
    setIndex((i) => Math.min(i + 1, questionIds.length - 1));
  }, [questionIds.length]);

  const prev = useCallback(() => {
    setIndex((i) => Math.max(i - 1, 0));
  }, []);

  const retake = useCallback(() => {
    setIndex(0);
    setAnswers({});
  }, []);

  return {
    index,
    currentQuestionId,
    answers,
    isFirst,
    isLast,
    canGoPrev,
    canGoNext,
    progress,
    answer,
    next,
    prev,
    retake,
  };
}
