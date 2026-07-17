"use client";

import { buttonVariants } from "@/components/theme-custom/button";
import { cn } from "@/lib/utils";
import type { ChoiceQuestion as ChoiceQuestionData } from "@/lib/quiz-data-choice";

interface ChoiceQuestionProps {
  question: ChoiceQuestionData;
  questionNumber: number;
  totalQuestions: number;
  selectedOptionId?: string;
  onSelect: (optionId: string) => void;
}

function ChoiceQuestion({
  question,
  questionNumber,
  totalQuestions,
  selectedOptionId,
  onSelect,
}: ChoiceQuestionProps) {
  const headingId = `${question.id}-prompt`;

  return (
    <div className="flex w-full flex-col">
      <p className="mb-3 font-mono text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Question {questionNumber} of {totalQuestions}
      </p>
      <h2 id={headingId} className="mb-8 text-[40px] leading-[52px] font-normal text-foreground">
        {question.prompt}
      </h2>
      <div role="group" aria-labelledby={headingId} className="flex flex-col gap-4">
        {question.options.map((option) => {
          const selected = option.id === selectedOptionId;
          return (
            <button
              key={option.id}
              type="button"
              aria-pressed={selected}
              onClick={() => onSelect(option.id)}
              className={cn(
                buttonVariants({ variant: selected ? "primary" : "default", size: "lg" }),
                "h-auto w-full justify-start px-6 py-4 text-left text-lg whitespace-normal"
              )}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export { ChoiceQuestion };
