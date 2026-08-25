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
import { Alert, AlertDescription } from "@/components/theme-custom/alert";

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
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-10 px-4 py-16">
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

      <div className="flex flex-col-reverse items-center gap-6 sm:flex-row sm:items-start">
        <p className="text-lg text-foreground">
          Every issue, I&apos;ll share what I&apos;m learning, what I&apos;m researching, and what
          I wish I knew earlier about building a career in civil engineering.
        </p>
        <Image
          src="/newsletter.png"
          alt="Line drawing of a person reading a newspaper"
          width={416}
          height={493}
          priority
          className="w-40 shrink-0 sm:w-44"
        />
      </div>

      <section className="flex flex-col gap-4">
        <h2 className="font-mono text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Expect things like
        </h2>
        <ul className="flex flex-col gap-3">
          {TOPICS.map(({ Icon, text }) => (
            <li key={text} className="flex items-start gap-3">
              <Icon weight="bold" aria-hidden className="mt-1 size-5 shrink-0 text-green" />
              <span className="text-lg text-foreground">{text}</span>
            </li>
          ))}
        </ul>
      </section>

      <Alert variant="notice">
        <AlertDescription>
          No &ldquo;become a successful engineer in 5 steps&rdquo; nonsense. Just useful things
          I&apos;m discovering as I figure it out too.
        </AlertDescription>
      </Alert>

      <section className="flex flex-col gap-4">
        <p className="text-lg text-foreground">
          Join the list — first issue arrives September 1.
        </p>
        <NewsletterSignup />
      </section>
    </main>
  );
}
