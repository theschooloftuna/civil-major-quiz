"use client";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ChoiceQuestion as ChoiceQuestionData } from "@/lib/quiz-data-choice";

interface ChoiceQuestionProps {
  question: ChoiceQuestionData;
  selectedOptionId?: string;
  onSelect: (optionId: string) => void;
}

function ChoiceQuestion({ question, selectedOptionId, onSelect }: ChoiceQuestionProps) {
  return (
    <fieldset className="flex w-full flex-col gap-3">
      <legend className="mb-2 text-lg font-semibold text-foreground sm:text-xl">
        {question.prompt}
      </legend>
      {question.options.map((option) => {
        const selected = option.id === selectedOptionId;
        return (
          <button
            key={option.id}
            type="button"
            aria-pressed={selected}
            onClick={() => onSelect(option.id)}
            className={cn(
              buttonVariants({ variant: selected ? "default" : "outline" }),
              "h-auto w-full justify-start whitespace-normal py-3 text-left text-sm"
            )}
          >
            {option.label}
          </button>
        );
      })}
    </fieldset>
  );
}

export { ChoiceQuestion };
