"use client";

import { buttonVariants } from "@/components/theme-custom/button";
import { cn } from "@/lib/utils";
import type { ScaleQuestion as ScaleQuestionData } from "@/lib/quiz-data-scale";

const SCALE_VALUES = [1, 2, 3, 4, 5] as const;

interface ScaleQuestionProps {
  question: ScaleQuestionData;
  questionNumber: number;
  totalQuestions: number;
  selectedValue?: number;
  onSelect: (value: number) => void;
}

function ScaleQuestion({
  question,
  questionNumber,
  totalQuestions,
  selectedValue,
  onSelect,
}: ScaleQuestionProps) {
  const headingId = `${question.id}-prompt`;

  return (
    <div className="flex w-full flex-col">
      <p className="mb-3 font-mono text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Question {questionNumber} of {totalQuestions}
      </p>
      <h2 id={headingId} className="mb-8 text-[40px] leading-[52px] font-normal text-foreground">
        {question.statement}
      </h2>
      <div role="group" aria-labelledby={headingId} className="flex flex-col gap-3">
        <div className="flex w-full items-center justify-between gap-3">
          {SCALE_VALUES.map((value) => {
            const selected = value === selectedValue;
            return (
              <button
                key={value}
                type="button"
                aria-pressed={selected}
                aria-label={`${value} out of 5`}
                onClick={() => onSelect(value)}
                className={cn(
                  buttonVariants({ variant: selected ? "primary" : "default", size: "icon-lg" }),
                  "rounded-full text-lg"
                )}
              >
                {value}
              </button>
            );
          })}
        </div>
        <div className="flex w-full justify-between font-mono text-xs uppercase tracking-wide text-muted-foreground">
          <span>Strongly disagree</span>
          <span>Strongly agree</span>
        </div>
      </div>
    </div>
  );
}

export { ScaleQuestion };
