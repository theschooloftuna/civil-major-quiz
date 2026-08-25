import type { Metadata } from "next";
import Image from "next/image";
import {
  BookOpenText,
  Brain,
  Briefcase,
  Compass,
  GlobeHemisphereWest,
  MagnifyingGlass,
  Wrench,
} from "@phosphor-icons/react/ssr";

import { NewsletterSignup } from "@/components/newsletter/newsletter-signup";

export const metadata: Metadata = {
  title: "Tuna Times | Civil Major Quiz",
  description:
    "A newsletter for civil engineers who are still figuring things out. Opportunities around the world, career paths, books, tools and lessons along the way. First issue September 1, 2026.",
};

/**
 * Phosphor icons are imported from `/ssr` because this is a Server Component -
 * the root package entry relies on React Context, which doesn't exist in RSC
 * and would crash the render.
 */
const TOPICS = [
  { Icon: GlobeHemisphereWest, text: "Civil engineering opportunities around the world" },
  { Icon: Compass, text: "Career paths, specialisations & skills worth learning" },
  { Icon: BookOpenText, text: "Books, courses & resources I’m actually exploring" },
  { Icon: Wrench, text: "Software, technical skills & tools" },
  { Icon: MagnifyingGlass, text: "Interesting engineering projects and industry developments" },
  { Icon: Briefcase, text: "Jobs, fellowships & other opportunities" },
  { Icon: Brain, text: "My own learning struggles, experiments and lessons along the way" },
];

export default function NewsletterPage() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-8 px-4 py-16">
      <Image
        src="/newsletter.png"
        alt="Line drawing of a person reading a newspaper"
        width={416}
        height={493}
        priority
        className="w-44 self-center"
      />

      <header className="flex flex-col gap-4">
        <p className="font-mono text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          The School of Tuna presents
        </p>
        <h1 className="text-[40px] leading-[52px] font-normal text-foreground">Tuna Times</h1>
        <p className="text-lg text-muted-foreground">
          A newsletter for civil engineers who are still figuring things out.
        </p>
        <span className="self-start rounded-lg border border-moss bg-acid px-3 py-1 font-mono text-xs font-semibold uppercase tracking-wide text-moss shadow-hard-sm">
          Launching September 1st, 2026
        </span>
      </header>

      <p className="text-lg text-foreground">
        Every issue, I&apos;ll share what I&apos;m learning, what I&apos;m researching, and what I
        wish I knew earlier about building a career in civil engineering.
      </p>

      <NewsletterSignup />

      {/* Deliberately visible rather than behind a tooltip: this list is what
          sells the newsletter, and hover doesn't exist on touch devices. It is
          de-emphasized instead — small text, below the call to action. */}
      <section className="flex flex-col gap-3 border-t border-vellum pt-6">
        <h2 className="font-mono text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Expect things like
        </h2>
        <ul className="grid gap-2 sm:grid-cols-2">
          {TOPICS.map(({ Icon, text }) => (
            <li key={text} className="flex items-start gap-2">
              <Icon weight="bold" aria-hidden className="mt-0.5 size-4 shrink-0 text-green" />
              <span className="text-sm text-muted-foreground">{text}</span>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
