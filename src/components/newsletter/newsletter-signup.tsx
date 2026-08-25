"use client";

import { useState, type FormEvent } from "react";

import { Alert, AlertDescription } from "@/components/theme-custom/alert";
import { Button } from "@/components/theme-custom/button";
import { Field, FieldLabel, FieldError } from "@/components/theme-custom/field";
import { Input } from "@/components/theme-custom/input";
import { isValidEmail } from "@/lib/email";
import { subscribeToNewsletter } from "@/lib/newsletter/actions";

type SubscribeState = "idle" | "sending" | "subscribed" | "error";

function NewsletterSignup() {
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState<string | null>(null);
  const [state, setState] = useState<SubscribeState>("idle");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!isValidEmail(email.trim())) {
      setEmailError("Enter a valid email address.");
      return;
    }

    setEmailError(null);
    setState("sending");

    const result = await subscribeToNewsletter(email);
    setState(result.saved ? "subscribed" : "error");
  }

  // The same message whether the address was new or already subscribed -
  // saying "you're already on the list" would let anyone test whether a
  // given address is a subscriber.
  if (state === "subscribed") {
    return (
      <Alert variant="success">
        <AlertDescription>You&apos;re on the list.</AlertDescription>
      </Alert>
    );
  }

  return (
    // noValidate: type="email" still gets the right mobile keyboard, but the
    // browser's own constraint validation would otherwise block submit and
    // show its native tooltip instead of our inline message.
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
      <Field>
        <FieldLabel htmlFor="newsletter-email">Email</FieldLabel>
        <div className="flex flex-wrap gap-3">
          <Input
            id="newsletter-email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            value={email}
            onChange={(event) => {
              setEmail(event.target.value);
              setEmailError(null);
              setState("idle");
            }}
            className="max-w-xs"
          />
          <Button type="submit" variant="primary" size="lg" disabled={state === "sending"}>
            {state === "sending" ? "Joining…" : "Join the Tuna Times"}
          </Button>
        </div>
        {emailError && <FieldError>{emailError}</FieldError>}
        {state === "error" && (
          <FieldError>Couldn&apos;t subscribe right now. Try again.</FieldError>
        )}
      </Field>
    </form>
  );
}

export { NewsletterSignup };
