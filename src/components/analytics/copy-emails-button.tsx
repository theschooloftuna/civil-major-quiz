"use client";

import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/theme-custom/button";

interface CopyEmailsButtonProps {
  emails: string[];
}

/**
 * Copies the live list to the clipboard, newline-separated, ready to paste
 * into a sending tool. Addresses are only ever written to the clipboard -
 * never logged, never sent anywhere.
 */
function CopyEmailsButton({ emails }: CopyEmailsButtonProps) {
  const [copying, setCopying] = useState(false);

  async function handleCopy() {
    setCopying(true);
    try {
      await navigator.clipboard.writeText(emails.join("\n"));
      toast.success(`Copied ${emails.length} email${emails.length === 1 ? "" : "s"}.`);
    } catch {
      // Clipboard access can be denied outright (permissions, insecure
      // context). Say so rather than appearing to have worked.
      toast.error("Couldn't copy to the clipboard.");
    } finally {
      setCopying(false);
    }
  }

  return (
    <Button
      type="button"
      size="sm"
      variant="secondary"
      onClick={handleCopy}
      disabled={copying || emails.length === 0}
    >
      {emails.length === 0
        ? "No emails to copy"
        : `Copy ${emails.length} subscribed email${emails.length === 1 ? "" : "s"}`}
    </Button>
  );
}

export { CopyEmailsButton };
