import Link from "next/link";

import { buttonVariants } from "@/components/theme-custom/button";

export default function UnsubscribeNotFound() {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col items-center gap-4 px-4 py-24 text-center">
      <h1 className="text-3xl font-normal text-foreground">
        This unsubscribe link isn&apos;t valid
      </h1>
      <p className="text-lg text-muted-foreground">
        The link may have been truncated by your email client, or it may already have been
        replaced by a newer one. Try the link in the most recent email you received.
      </p>
      <Link href="/" className={buttonVariants({ size: "lg" })}>
        Go to the homepage
      </Link>
    </div>
  );
}
