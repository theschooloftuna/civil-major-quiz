import { MAJORS, type MajorId } from "./majors";
import type { ChoiceQuestion } from "./quiz-data-choice";
import type { ScaleQuestion } from "./quiz-data-scale";

export interface MajorScore {
  majorId: MajorId;
  raw: number;
  max: number;
  percentage: number;
}

interface QuestionContribution {
  /** Weights actually earned for this question, given the user's answer. */
  contribution: Partial<Record<MajorId, number>>;
  /** Best-case weights this question could have contributed. */
  maxContribution: Partial<Record<MajorId, number>>;
}

export function computeResults(contributions: QuestionContribution[]): MajorScore[] {
  const raw = new Map<MajorId, number>(MAJORS.map((m) => [m.id, 0]));
  const max = new Map<MajorId, number>(MAJORS.map((m) => [m.id, 0]));

  for (const { contribution, maxContribution } of contributions) {
    for (const [majorId, weight] of Object.entries(contribution)) {
      const id = majorId as MajorId;
      raw.set(id, (raw.get(id) ?? 0) + (weight ?? 0));
    }
    for (const [majorId, weight] of Object.entries(maxContribution)) {
      const id = majorId as MajorId;
      max.set(id, (max.get(id) ?? 0) + (weight ?? 0));
    }
  }

  return MAJORS.map((major) => {
    const majorRaw = raw.get(major.id) ?? 0;
    const majorMax = max.get(major.id) ?? 0;
    return {
      majorId: major.id,
      raw: majorRaw,
      max: majorMax,
      percentage: majorMax > 0 ? (majorRaw / majorMax) * 100 : 0,
    };
  });
}

/** Top n results by percentage, including every major tied at the cutoff. */
export function getTopMajors(results: MajorScore[], n = 3): MajorScore[] {
  const sorted = [...results].sort((a, b) => b.percentage - a.percentage);
  if (sorted.length <= n) return sorted;

  const cutoff = sorted[n - 1].percentage;
  return sorted.filter((result) => result.percentage >= cutoff);
}

export function scoreChoiceAnswers(
  questions: ChoiceQuestion[],
  answers: Record<string, string>
): MajorScore[] {
  const contributions = questions.map((question) => {
    const selected = question.options.find((option) => option.id === answers[question.id]);
    const maxContribution: Partial<Record<MajorId, number>> = {};
    for (const option of question.options) {
      for (const [majorId, weight] of Object.entries(option.weights)) {
        const id = majorId as MajorId;
        maxContribution[id] = Math.max(maxContribution[id] ?? 0, weight ?? 0);
      }
    }
    return { contribution: selected?.weights ?? {}, maxContribution };
  });

  return computeResults(contributions);
}

export function scoreScaleAnswers(
  questions: ScaleQuestion[],
  answers: Record<string, number>
): MajorScore[] {
  const contributions = questions.map((question) => {
    const rating = answers[question.id];
    const multiplier = rating != null ? (rating - 1) / 4 : 0;
    const contribution: Partial<Record<MajorId, number>> = {};
    for (const [majorId, weight] of Object.entries(question.weights)) {
      contribution[majorId as MajorId] = (weight ?? 0) * multiplier;
    }
    return { contribution, maxContribution: question.weights };
  });

  return computeResults(contributions);
}
