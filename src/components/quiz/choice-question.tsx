"use client";

import { buttonVariants } from "@/components/theme-custom/button";
import { cn } from "@/lib/utils";
import type { ChoiceQuestion as ChoiceQuestionData } from "@/lib/quiz-data-choice";

interface ChoiceQuestionProps {
  question: ChoiceQuestionData;
  selectedOptionId?: string;
  onSelect: (optionId: string) => void;
}

function ChoiceQuestion({ question, selectedOptionId, onSelect }: ChoiceQuestionProps) {
  return (
    <fieldset className="flex w-full flex-col gap-4">
      <legend className="mb-2 text-2xl leading-snug font-normal text-foreground sm:text-[28px]">
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
              buttonVariants({ variant: selected ? "primary" : "default", size: "lg" }),
              "h-auto w-full justify-start px-6 py-4 text-left text-lg whitespace-normal"
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
