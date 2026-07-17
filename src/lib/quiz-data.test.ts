import { describe, expect, test } from "vitest";

import { MAJORS } from "./majors";
import { QUIZ_TOPICS } from "./quiz-topics";
import { CHOICE_QUESTIONS } from "./quiz-data-choice";
import { SCALE_QUESTIONS } from "./quiz-data-scale";

const MAJOR_IDS = new Set(MAJORS.map((m) => m.id));

describe("quiz data", () => {
  test("choice and scale variants cover the same 7 topics, in the same order", () => {
    expect(CHOICE_QUESTIONS.map((q) => q.topicId)).toEqual([...QUIZ_TOPICS]);
    expect(SCALE_QUESTIONS.map((q) => q.topicId)).toEqual([...QUIZ_TOPICS]);
  });

  test("every choice question has exactly 4 options", () => {
    for (const question of CHOICE_QUESTIONS) {
      expect(question.options).toHaveLength(4);
    }
  });

  test("every weight in the choice variant references a real major with a positive weight", () => {
    for (const question of CHOICE_QUESTIONS) {
      for (const option of question.options) {
        for (const [majorId, weight] of Object.entries(option.weights)) {
          expect(MAJOR_IDS.has(majorId as never)).toBe(true);
          expect(weight).toBeGreaterThan(0);
        }
      }
    }
  });

  test("every weight in the scale variant references a real major with a positive weight", () => {
    for (const question of SCALE_QUESTIONS) {
      for (const [majorId, weight] of Object.entries(question.weights)) {
        expect(MAJOR_IDS.has(majorId as never)).toBe(true);
        expect(weight).toBeGreaterThan(0);
      }
    }
  });

  test("every major gets weighted by at least one choice option and one scale statement", () => {
    const choiceMajors = new Set(
      CHOICE_QUESTIONS.flatMap((q) => q.options.flatMap((o) => Object.keys(o.weights)))
    );
    const scaleMajors = new Set(SCALE_QUESTIONS.flatMap((q) => Object.keys(q.weights)));

    for (const majorId of MAJOR_IDS) {
      expect(choiceMajors.has(majorId)).toBe(true);
      expect(scaleMajors.has(majorId)).toBe(true);
    }
  });
});
