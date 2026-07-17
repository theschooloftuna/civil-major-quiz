import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";

export default function Home() {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-center justify-center gap-8 px-4 py-12 text-center">
      <div className="flex flex-col gap-4">
        <p className="font-mono text-xs uppercase tracking-wide text-muted-foreground">
          A 7-question personality quiz
        </p>
        <h1 className="text-3xl font-semibold text-foreground sm:text-4xl">
          Which civil engineering major fits you?
        </h1>
        <p className="text-base text-muted-foreground">
          Answer 7 quick questions and get your top matches out of 7 civil engineering
          specializations, each with a match percentage.
        </p>
      </div>
      <div className="flex flex-col gap-3 sm:flex-row">
        <Link href="/quiz" className={buttonVariants({ size: "lg" })}>
          Multiple choice
        </Link>
        <Link href="/quiz/scale" className={buttonVariants({ variant: "outline", size: "lg" })}>
          Rate each statement
        </Link>
      </div>
    </div>
  );
}
