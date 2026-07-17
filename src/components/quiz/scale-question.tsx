"use client";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ScaleQuestion as ScaleQuestionData } from "@/lib/quiz-data-scale";

const SCALE_VALUES = [1, 2, 3, 4, 5] as const;

interface ScaleQuestionProps {
  question: ScaleQuestionData;
  selectedValue?: number;
  onSelect: (value: number) => void;
}

function ScaleQuestion({ question, selectedValue, onSelect }: ScaleQuestionProps) {
  return (
    <fieldset className="flex w-full flex-col gap-4">
      <legend className="mb-2 text-lg font-semibold text-foreground sm:text-xl">
        {question.statement}
      </legend>
      <div className="flex w-full items-center justify-between gap-2">
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
                buttonVariants({ variant: selected ? "default" : "outline", size: "icon-lg" }),
                "rounded-full"
              )}
            >
              {value}
            </button>
          );
        })}
      </div>
      <div className="flex w-full justify-between text-xs text-muted-foreground">
        <span>Strongly disagree</span>
        <span>Strongly agree</span>
      </div>
    </fieldset>
  );
}

export { ScaleQuestion };
