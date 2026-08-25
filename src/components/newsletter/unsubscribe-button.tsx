"use client";

import { useState } from "react";

import { Alert, AlertDescription } from "@/components/theme-custom/alert";
import { Button } from "@/components/theme-custom/button";
import { FieldError } from "@/components/theme-custom/field";
import { unsubscribeByToken } from "@/lib/newsletter/actions";

type UnsubscribeState = "idle" | "sending" | "done" | "error";

interface UnsubscribeButtonProps {
  token: string;
}

/**
 * Deliberately requires a click. Unsubscribing on page load would let an
 * email client that prefetches links unsubscribe someone who never opened
 * the message.
 */
function UnsubscribeButton({ token }: UnsubscribeButtonProps) {
  const [state, setState] = useState<UnsubscribeState>("idle");

  async function handleClick() {
    setState("sending");
    const result = await unsubscribeByToken(token);
    setState(result.unsubscribed ? "done" : "error");
  }

  if (state === "done") {
    return (
      <Alert variant="success">
        <AlertDescription>
          You&apos;re unsubscribed. You won&apos;t get any more emails.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <Button
        type="button"
        size="lg"
        disabled={state === "sending"}
        onClick={handleClick}
        className="self-start"
      >
        {state === "sending" ? "Unsubscribing…" : "Unsubscribe"}
      </Button>
      {state === "error" && (
        <FieldError>Couldn&apos;t unsubscribe right now. Try again.</FieldError>
      )}
    </div>
  );
}

export { UnsubscribeButton };
