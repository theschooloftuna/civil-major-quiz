"use client";

import { useMemo, useState } from "react";
import { ArrowCircleLeftIcon, ArrowCircleRightIcon, CheckCircleIcon } from "@phosphor-icons/react";

import { Button } from "@/components/theme-custom/button";
import { ChoiceQuestion } from "@/components/quiz/choice-question";
import { ScaleQuestion } from "@/components/quiz/scale-question";
import { ProgressBar } from "@/components/quiz/progress-bar";
import { ResultsList } from "@/components/quiz/results-list";
import { SubmitPanel } from "@/components/quiz/submit-panel";
import { useQuizFlow } from "@/hooks/use-quiz-flow";
import { CHOICE_QUESTIONS } from "@/lib/quiz-data-choice";
import { SCALE_QUESTIONS } from "@/lib/quiz-data-scale";
import { getTopMajors, normalizeToDisplayPercentage, scoreChoiceAnswers, scoreScaleAnswers } from "@/lib/scoring";
import type { QuizVariant } from "@/lib/quiz-variant";

interface QuizFlowProps {
  variant: QuizVariant;
}

function QuizFlow({ variant }: QuizFlowProps) {
  const questionIds = useMemo(
    () => (variant === "choice" ? CHOICE_QUESTIONS : SCALE_QUESTIONS).map((q) => q.id),
    [variant]
  );
  const flow = useQuizFlow({ questionIds });
  const [resultId, setResultId] = useState<string | null>(null);

  function handleRetake() {
    flow.retake();
    setResultId(null);
  }

  if (resultId) {
    const scores =
      variant === "choice"
        ? scoreChoiceAnswers(CHOICE_QUESTIONS, flow.answers as Record<string, string>)
        : scoreScaleAnswers(SCALE_QUESTIONS, flow.answers as Record<string, number>);
    const topMajors = normalizeToDisplayPercentage(getTopMajors(scores, 3));

    return (
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 pb-24 pt-12">
        <ResultsList results={topMajors} />
        <SubmitPanel
          resultId={resultId}
          variant={variant}
          answers={flow.answers}
          scores={scores}
          topMajors={topMajors}
          onRetake={handleRetake}
        />
      </div>
    );
  }

  const currentChoiceQuestion = variant === "choice" ? CHOICE_QUESTIONS[flow.index] : null;
  const currentScaleQuestion = variant === "scale" ? SCALE_QUESTIONS[flow.index] : null;

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-8 px-4 pt-8 pb-16 md:justify-center">
      {currentChoiceQuestion && (
        <ChoiceQuestion
          question={currentChoiceQuestion}
          questionNumber={flow.index + 1}
          totalQuestions={questionIds.length}
          selectedOptionId={flow.answers[currentChoiceQuestion.id] as string | undefined}
          onSelect={(optionId) => flow.answer(currentChoiceQuestion.id, optionId)}
        />
      )}
      {currentScaleQuestion && (
        <ScaleQuestion
          question={currentScaleQuestion}
          questionNumber={flow.index + 1}
          totalQuestions={questionIds.length}
          selectedValue={flow.answers[currentScaleQuestion.id] as number | undefined}
          onSelect={(value) => flow.answer(currentScaleQuestion.id, value)}
        />
      )}

      <div className="flex justify-between gap-3">
        <Button type="button" size="lg" disabled={!flow.canGoPrev} onClick={flow.prev}>
          <ArrowCircleLeftIcon />
          Prev
        </Button>
        {flow.isLast ? (
          <Button
            type="button"
            size="lg"
            variant="primary"
            disabled={!flow.canGoNext}
            onClick={() => setResultId(crypto.randomUUID())}
          >
            <CheckCircleIcon />
            Submit
          </Button>
        ) : (
          <Button type="button" size="lg" variant="primary" disabled={!flow.canGoNext} onClick={flow.next}>
            <ArrowCircleRightIcon />
            Next
          </Button>
        )}
      </div>

      <ProgressBar progress={flow.progress} />
    </div>
  );
}

export { QuizFlow };
