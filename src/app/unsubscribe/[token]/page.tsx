import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { UnsubscribeButton } from "@/components/newsletter/unsubscribe-button";
import { newsletterTokenExists } from "@/lib/supabase/newsletter";

export const metadata: Metadata = {
  title: "Unsubscribe | Civil Major Quiz",
};

interface UnsubscribePageProps {
  params: Promise<{ token: string }>;
}

/**
 * Validating the token here only decides which state to render - it never
 * unsubscribes. The write is behind the button, so a link prefetch can't
 * remove someone who never opened the email.
 */
export default async function UnsubscribePage({ params }: UnsubscribePageProps) {
  const { token } = await params;

  if (!(await newsletterTokenExists(token))) {
    notFound();
  }

  return (
    <main className="mx-auto flex w-full max-w-xl flex-col gap-6 px-4 py-24">
      <h1 className="text-3xl font-normal text-foreground">Unsubscribe</h1>
      <p className="text-lg text-muted-foreground">
        Press the button below and you&apos;ll stop receiving the newsletter.
      </p>
      <UnsubscribeButton token={token} />
    </main>
  );
}
