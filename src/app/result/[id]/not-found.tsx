import Link from "next/link";

import { buttonVariants } from "@/components/theme-custom/button";

export default function ResultNotFound() {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col items-center gap-4 px-4 py-24 text-center">
      <h1 className="text-3xl font-normal text-foreground">This result doesn&apos;t exist</h1>
      <p className="text-lg text-muted-foreground">
        The link might be broken, or the result never finished saving. Take the quiz to get your
        own.
      </p>
      <Link href="/" className={buttonVariants({ size: "lg" })}>
        Take the quiz
      </Link>
    </div>
  );
}
