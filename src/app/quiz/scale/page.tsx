import type { Metadata } from "next";

import { QuizFlow } from "@/components/quiz/quiz-flow";

export const metadata: Metadata = {
  title: "Rate Each Statement | Civil Major Quiz",
};

export default function QuizScalePage() {
  return <QuizFlow variant="scale" />;
}
