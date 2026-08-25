import type { Metadata } from "next";

import { NewsletterSignup } from "@/components/newsletter/newsletter-signup";

export const metadata: Metadata = {
  title: "Newsletter | Civil Major Quiz",
  description:
    "Where civil engineers actually get hired abroad, what those countries really require, and the skills, books and opportunities worth knowing about.",
};

export default function NewsletterPage() {
  return (
    <main className="mx-auto flex w-full max-w-xl flex-col gap-6 px-4 py-24">
      <h1 className="text-3xl font-normal text-foreground">
        The civil engineering opportunities newsletter
      </h1>
      <p className="text-lg text-muted-foreground">
        Where civil engineers actually get hired abroad, what those countries really require
        behind the marketing, and the skills, books and opportunities I come across along the
        way. Drop your email below and you&apos;ll get the next issue.
      </p>
      <NewsletterSignup />
    </main>
  );
}
