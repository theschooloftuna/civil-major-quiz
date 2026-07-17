import type { Metadata } from "next";

import { QuizFlow } from "@/components/quiz/quiz-flow";

export const metadata: Metadata = {
  title: "Multiple Choice Quiz | Civil Major Quiz",
};

export default function QuizPage() {
  return <QuizFlow variant="choice" />;
}
