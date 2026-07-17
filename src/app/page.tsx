import Link from "next/link";

import { buttonVariants } from "@/components/theme-custom/button";
import { Alert, AlertDescription } from "@/components/theme-custom/alert";
import { CompassDoodle, TSquareDoodle, TrussDoodle } from "@/components/theme-custom/doodles";

export default function Home() {
  return (
    <div className="relative mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center gap-10 overflow-hidden px-4 py-16 text-center">
      <TSquareDoodle className="absolute top-6 left-2 hidden -rotate-6 text-moss/25 sm:block" />
      <CompassDoodle className="absolute top-10 right-2 hidden rotate-12 text-primary/40 sm:block" />
      <TrussDoodle className="absolute bottom-10 left-1/2 hidden -translate-x-1/2 text-moss/15 md:block" />

      <div className="flex flex-col gap-5">
        <p className="font-mono text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          A 7-question personality quiz
        </p>
        <h1 className="text-[40px] leading-[52px] font-normal text-foreground">
          Which civil engineering major fits you?
        </h1>
        <p className="text-lg text-muted-foreground">
          Answer 7 quick questions and get your top matches out of 7 civil engineering
          specializations, each with a match percentage.
        </p>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row">
        <Link href="/quiz" className={buttonVariants({ size: "lg" })}>
          Multiple choice
        </Link>
        <Link href="/quiz/scale" className={buttonVariants({ size: "lg" })}>
          Rate each statement
        </Link>
      </div>

      <Alert variant="notice" className="max-w-md">
        <AlertDescription>
          Just for fun — a personality-style guide, not professional career advice.
        </AlertDescription>
      </Alert>
    </div>
  );
}
