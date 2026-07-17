import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ResultsList } from "@/components/quiz/results-list";
import { getQuizResultById } from "@/lib/supabase/quiz-results";

export const metadata: Metadata = {
  title: "Quiz Result | Civil Major Quiz",
};

interface ResultPageProps {
  params: Promise<{ id: string }>;
}

export default async function ResultPage({ params }: ResultPageProps) {
  const { id } = await params;
  const result = await getQuizResultById(id);

  if (!result) {
    notFound();
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-12">
      <ResultsList results={result.topMajors} />
    </div>
  );
}
