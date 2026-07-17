import { describe, expect, test } from "vitest";

import { MAJORS } from "./majors";
import { CHOICE_QUESTIONS } from "./quiz-data-choice";
import { SCALE_QUESTIONS } from "./quiz-data-scale";
import {
  computeResults,
  getTopMajors,
  normalizeToDisplayPercentage,
  scoreChoiceAnswers,
  scoreScaleAnswers,
  type MajorScore,
} from "./scoring";

function score(majorId: MajorScore["majorId"], raw: number, max: number): MajorScore {
  return { majorId, raw, max, percentage: max > 0 ? (raw / max) * 100 : 0 };
}

describe("computeResults", () => {
  test("percentage is raw / max * 100, independently per major", () => {
    const results = computeResults([
      { contribution: { structural: 3 }, maxContribution: { structural: 3, geotechnical: 3 } },
      { contribution: { structural: 1, geotechnical: 3 }, maxContribution: { structural: 3, geotechnical: 3 } },
    ]);

    const structural = results.find((r) => r.majorId === "structural")!;
    const geotechnical = results.find((r) => r.majorId === "geotechnical")!;

    expect(structural).toEqual(score("structural", 4, 6));
    expect(geotechnical).toEqual(score("geotechnical", 3, 6));
  });

  test("returns every major, even ones with zero max (no NaN)", () => {
    const results = computeResults([{ contribution: {}, maxContribution: {} }]);
    expect(results).toHaveLength(MAJORS.length);
    for (const result of results) {
      expect(result.max).toBe(0);
      expect(result.percentage).toBe(0);
    }
  });
});

describe("getTopMajors", () => {
  test("returns exactly n when there are no ties at the cutoff", () => {
    const results: MajorScore[] = [
      score("structural", 90, 100),
      score("geotechnical", 80, 100),
      score("transportation", 70, 100),
      score("environmental", 60, 100),
    ];
    const top = getTopMajors(results, 3);
    expect(top.map((r) => r.majorId)).toEqual(["structural", "geotechnical", "transportation"]);
  });

  test("includes every major tied at the 3rd-place cutoff", () => {
    const results: MajorScore[] = [
      score("structural", 90, 100),
      score("geotechnical", 70, 100),
      score("transportation", 70, 100),
      score("environmental", 70, 100),
      score("water-resources", 50, 100),
    ];
    const top = getTopMajors(results, 3);
    expect(top.map((r) => r.majorId).sort()).toEqual(
      ["structural", "geotechnical", "transportation", "environmental"].sort()
    );
  });

  test("includes ties above the cutoff without over-including", () => {
    const results: MajorScore[] = [
      score("structural", 90, 100),
      score("geotechnical", 90, 100),
      score("transportation", 50, 100),
      score("environmental", 10, 100),
    ];
    const top = getTopMajors(results, 3);
    expect(top.map((r) => r.majorId).sort()).toEqual(["structural", "geotechnical", "transportation"].sort());
  });

  test("returns everything when there are fewer results than n", () => {
    const results: MajorScore[] = [score("structural", 90, 100), score("geotechnical", 80, 100)];
    expect(getTopMajors(results, 3)).toHaveLength(2);
  });
});

describe("normalizeToDisplayPercentage", () => {
  test("rescales raw scores so percentages sum to 100", () => {
    const results: MajorScore[] = [
      score("structural", 30, 100),
      score("geotechnical", 20, 100),
      score("transportation", 10, 100),
    ];
    const normalized = normalizeToDisplayPercentage(results);

    expect(normalized.reduce((sum, r) => sum + r.percentage, 0)).toBeCloseTo(100);
    expect(normalized.find((r) => r.majorId === "structural")!.percentage).toBeCloseTo(50);
    expect(normalized.find((r) => r.majorId === "geotechnical")!.percentage).toBeCloseTo(33.333, 2);
    expect(normalized.find((r) => r.majorId === "transportation")!.percentage).toBeCloseTo(16.667, 2);
  });

  test("normalizes whatever set is passed in, including ties beyond 3", () => {
    const results: MajorScore[] = [
      score("structural", 10, 100),
      score("geotechnical", 10, 100),
      score("transportation", 10, 100),
      score("environmental", 10, 100),
    ];
    const normalized = normalizeToDisplayPercentage(results);

    expect(normalized).toHaveLength(4);
    for (const result of normalized) {
      expect(result.percentage).toBeCloseTo(25);
    }
  });

  test("splits evenly instead of dividing by zero when every raw score is 0", () => {
    const results: MajorScore[] = [
      score("structural", 0, 100),
      score("geotechnical", 0, 100),
      score("transportation", 0, 100),
    ];
    const normalized = normalizeToDisplayPercentage(results);

    for (const result of normalized) {
      expect(result.percentage).toBeCloseTo(33.333, 2);
    }
  });

  test("leaves raw and max untouched, only rewrites percentage", () => {
    const results: MajorScore[] = [score("structural", 30, 100), score("geotechnical", 10, 100)];
    const normalized = normalizeToDisplayPercentage(results);

    expect(normalized[0]).toMatchObject({ majorId: "structural", raw: 30, max: 100 });
    expect(normalized[1]).toMatchObject({ majorId: "geotechnical", raw: 10, max: 100 });
  });
});

describe("scoreChoiceAnswers", () => {
  test("unanswered questions contribute 0 raw but still count toward max", () => {
    const results = scoreChoiceAnswers(CHOICE_QUESTIONS, {});
    for (const result of results) {
      expect(result.raw).toBe(0);
      expect(result.max).toBeGreaterThan(0);
      expect(result.percentage).toBe(0);
    }
  });

  test("answering every question with the geotechnical-leaning option scores it highest", () => {
    const answers = Object.fromEntries(
      CHOICE_QUESTIONS.map((q) => {
        const best = q.options.find((o) => (o.weights.geotechnical ?? 0) > 0) ?? q.options[0];
        return [q.id, best.id];
      })
    );
    const results = scoreChoiceAnswers(CHOICE_QUESTIONS, answers);
    const top = getTopMajors(results, 1);
    expect(top[0].majorId).toBe("geotechnical");
    expect(top[0].percentage).toBe(100);
  });
});

describe("scoreScaleAnswers", () => {
  test("rating 1 (strongly disagree) contributes nothing", () => {
    const answers = Object.fromEntries(SCALE_QUESTIONS.map((q) => [q.id, 1]));
    const results = scoreScaleAnswers(SCALE_QUESTIONS, answers);
    for (const result of results) {
      expect(result.raw).toBe(0);
    }
  });

  test("rating 5 (strongly agree) contributes the full weight", () => {
    const answers = Object.fromEntries(SCALE_QUESTIONS.map((q) => [q.id, 5]));
    const results = scoreScaleAnswers(SCALE_QUESTIONS, answers);
    for (const result of results) {
      expect(result.raw).toBeCloseTo(result.max);
    }
  });

  test("rating 3 (neutral) contributes half the weight", () => {
    const question = SCALE_QUESTIONS[0];
    const results = scoreScaleAnswers([question], { [question.id]: 3 });
    const majorId = Object.keys(question.weights)[0] as MajorScore["majorId"];
    const result = results.find((r) => r.majorId === majorId)!;
    expect(result.raw).toBeCloseTo((question.weights[majorId] ?? 0) / 2);
  });
});
