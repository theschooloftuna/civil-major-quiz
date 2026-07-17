"use client";

import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { ChoiceQuestion } from "@/components/quiz/choice-question";
import { ScaleQuestion } from "@/components/quiz/scale-question";
import { ProgressBar } from "@/components/quiz/progress-bar";
import { ResultsList } from "@/components/quiz/results-list";
import { SubmitPanel } from "@/components/quiz/submit-panel";
import { useQuizFlow } from "@/hooks/use-quiz-flow";
import { CHOICE_QUESTIONS } from "@/lib/quiz-data-choice";
import { SCALE_QUESTIONS } from "@/lib/quiz-data-scale";
import { getTopMajors, scoreChoiceAnswers, scoreScaleAnswers } from "@/lib/scoring";
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
    const topMajors = getTopMajors(scores, 3);

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
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-8 px-4 pb-24 pt-12">
      {currentChoiceQuestion && (
        <ChoiceQuestion
          question={currentChoiceQuestion}
          selectedOptionId={flow.answers[currentChoiceQuestion.id] as string | undefined}
          onSelect={(optionId) => flow.answer(currentChoiceQuestion.id, optionId)}
        />
      )}
      {currentScaleQuestion && (
        <ScaleQuestion
          question={currentScaleQuestion}
          selectedValue={flow.answers[currentScaleQuestion.id] as number | undefined}
          onSelect={(value) => flow.answer(currentScaleQuestion.id, value)}
        />
      )}

      <div className="flex justify-between gap-3">
        <Button type="button" variant="outline" disabled={!flow.canGoPrev} onClick={flow.prev}>
          Prev
        </Button>
        {flow.isLast ? (
          <Button
            type="button"
            disabled={!flow.canGoNext}
            onClick={() => setResultId(crypto.randomUUID())}
          >
            Submit
          </Button>
        ) : (
          <Button type="button" disabled={!flow.canGoNext} onClick={flow.next}>
            Next
          </Button>
        )}
      </div>

      <ProgressBar progress={flow.progress} />
    </div>
  );
}

export { QuizFlow };
