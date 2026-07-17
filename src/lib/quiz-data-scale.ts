import type { MajorId } from "./majors";
import type { TopicId } from "./quiz-topics";

export interface ScaleQuestion {
  id: string;
  topicId: TopicId;
  statement: string;
  weights: Partial<Record<MajorId, number>>;
}

export const SCALE_QUESTIONS: ScaleQuestion[] = [
  {
    id: "scale-field-vs-desk",
    topicId: "field-vs-desk",
    statement:
      "I'd rather be out in the field taking measurements and samples than running numbers at a desk.",
    weights: { geotechnical: 3, "disaster-risk-reduction": 1 },
  },
  {
    id: "scale-design-vs-people",
    topicId: "design-vs-people",
    statement:
      "I get more satisfaction from precise technical calculations than from managing people and schedules.",
    weights: { structural: 3, geotechnical: 1 },
  },
  {
    id: "scale-ground-foundations",
    topicId: "ground-foundations",
    statement:
      "I'm fascinated by what's happening underground — soil, rock, and how foundations hold everything up.",
    weights: { geotechnical: 3, "water-resources": 1 },
  },
  {
    id: "scale-mobility-systems",
    topicId: "mobility-systems",
    statement:
      "I think a lot about how traffic, roads, and transit systems could work better.",
    weights: { transportation: 3 },
  },
  {
    id: "scale-environment-sustainability",
    topicId: "environment-sustainability",
    statement:
      "Protecting water quality and the environment matters more to me than almost anything else in engineering.",
    weights: { environmental: 3, "water-resources": 2 },
  },
  {
    id: "scale-leadership-coordination",
    topicId: "leadership-coordination",
    statement:
      "I'd rather lead a team and keep a project on budget and on schedule than do the technical design myself.",
    weights: { "construction-management": 3 },
  },
  {
    id: "scale-crisis-response",
    topicId: "crisis-response",
    statement:
      "I think about how infrastructure should be built to survive disasters like earthquakes and floods.",
    weights: { "disaster-risk-reduction": 3, structural: 1 },
  },
];
