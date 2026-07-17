import type { MajorId } from "./majors";
import type { TopicId } from "./quiz-topics";

export interface ChoiceOption {
  id: string;
  label: string;
  weights: Partial<Record<MajorId, number>>;
}

export interface ChoiceQuestion {
  id: string;
  topicId: TopicId;
  prompt: string;
  options: ChoiceOption[];
}

export const CHOICE_QUESTIONS: ChoiceQuestion[] = [
  {
    id: "choice-field-vs-desk",
    topicId: "field-vs-desk",
    prompt: "It's a free Saturday during your internship. What sounds more fun?",
    options: [
      {
        id: "a",
        label: "Pulling on boots and taking soil samples out in the field.",
        weights: { geotechnical: 3, "disaster-risk-reduction": 1 },
      },
      {
        id: "b",
        label: "Running structural load calculations at your desk with good music on.",
        weights: { structural: 3 },
      },
      {
        id: "c",
        label: "Walking a construction site, checking on schedule and crew progress.",
        weights: { "construction-management": 3, transportation: 1 },
      },
      {
        id: "d",
        label: "Testing a water sample from the local river.",
        weights: { "water-resources": 3, environmental: 1 },
      },
    ],
  },
  {
    id: "choice-design-vs-people",
    topicId: "design-vs-people",
    prompt: "Your professor offers you two projects. Which do you pick?",
    options: [
      {
        id: "a",
        label: "Designing a striking bridge truss down to the last bolt.",
        weights: { structural: 3, geotechnical: 1 },
      },
      {
        id: "b",
        label: "Coordinating a class project's team, budget, and deadline.",
        weights: { "construction-management": 3 },
      },
      {
        id: "c",
        label: "Mapping out a new bus rapid transit route for your city.",
        weights: { transportation: 3 },
      },
      {
        id: "d",
        label: "Modeling how contaminants spread through groundwater.",
        weights: { environmental: 3, "water-resources": 1 },
      },
    ],
  },
  {
    id: "choice-ground-foundations",
    topicId: "ground-foundations",
    prompt: "A building's foundation is cracking. What's your instinct?",
    options: [
      {
        id: "a",
        label: "Check what's happening underground before touching anything else.",
        weights: { geotechnical: 3 },
      },
      {
        id: "b",
        label: "Check whether the structure above is overloaded.",
        weights: { structural: 3 },
      },
      {
        id: "c",
        label: "Check if drainage nearby has changed the water table.",
        weights: { "water-resources": 2, geotechnical: 1 },
      },
      {
        id: "d",
        label: "Check if it's even worth saving, or start planning for the worst.",
        weights: { "disaster-risk-reduction": 2, "construction-management": 1 },
      },
    ],
  },
  {
    id: "choice-mobility-systems",
    topicId: "mobility-systems",
    prompt: "Your city just got funding for one upgrade. What do you push for?",
    options: [
      {
        id: "a",
        label: "A smarter traffic signal network downtown.",
        weights: { transportation: 3 },
      },
      {
        id: "b",
        label: "Reinforcing bridges along the evacuation route.",
        weights: { "disaster-risk-reduction": 2, structural: 1 },
      },
      {
        id: "c",
        label: "A new stormwater drainage system.",
        weights: { "water-resources": 3 },
      },
      {
        id: "d",
        label: "Green space and pollution controls near the highway.",
        weights: { environmental: 3 },
      },
    ],
  },
  {
    id: "choice-environment-sustainability",
    topicId: "environment-sustainability",
    prompt: "You're most bothered by which headline?",
    options: [
      {
        id: "a",
        label: "\"River contaminated by industrial runoff.\"",
        weights: { environmental: 3, "water-resources": 1 },
      },
      {
        id: "b",
        label: "\"Hillside town at risk of landslides.\"",
        weights: { geotechnical: 2, "disaster-risk-reduction": 2 },
      },
      {
        id: "c",
        label: "\"Bridge closed indefinitely for safety inspections.\"",
        weights: { structural: 3 },
      },
      {
        id: "d",
        label: "\"Construction project way over budget and behind schedule.\"",
        weights: { "construction-management": 3 },
      },
    ],
  },
  {
    id: "choice-leadership-coordination",
    topicId: "leadership-coordination",
    prompt: "Group project time. Which role do you volunteer for first?",
    options: [
      {
        id: "a",
        label: "Project lead — tracking budget, schedule, and who's doing what.",
        weights: { "construction-management": 3 },
      },
      {
        id: "b",
        label: "The one running the structural analysis software.",
        weights: { structural: 3 },
      },
      {
        id: "c",
        label: "The one drawing up the emergency response plan.",
        weights: { "disaster-risk-reduction": 3 },
      },
      {
        id: "d",
        label: "The one figuring out the best transit route to the site.",
        weights: { transportation: 2, "construction-management": 1 },
      },
    ],
  },
  {
    id: "choice-crisis-response",
    topicId: "crisis-response",
    prompt: "News breaks of a major earthquake overseas. What's your first thought?",
    options: [
      {
        id: "a",
        label: "How do we design buildings that survive the next one?",
        weights: { "disaster-risk-reduction": 3, structural: 1 },
      },
      {
        id: "b",
        label: "How do we get roads and bridges reopened fast for aid to reach people?",
        weights: { transportation: 2, "disaster-risk-reduction": 1 },
      },
      {
        id: "c",
        label: "How do we make sure the water supply isn't contaminated afterward?",
        weights: { "water-resources": 2, environmental: 1 },
      },
      {
        id: "d",
        label: "How do we rebuild efficiently, on budget, without cutting corners?",
        weights: { "construction-management": 3 },
      },
    ],
  },
];
