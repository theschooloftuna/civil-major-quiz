// The 7 underlying topics both quiz variants ask about, just reformatted
// per variant (multiple choice vs. agree/disagree scale). Keeping this list
// as the single source of truth lets a test assert both variants cover the
// same topics, in the same order.
export const QUIZ_TOPICS = [
  "field-vs-desk",
  "design-vs-people",
  "ground-foundations",
  "mobility-systems",
  "environment-sustainability",
  "leadership-coordination",
  "crisis-response",
] as const;

export type TopicId = (typeof QUIZ_TOPICS)[number];
