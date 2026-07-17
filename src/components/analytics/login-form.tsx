"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/theme-custom/button";
import { Field, FieldLabel, FieldError } from "@/components/theme-custom/field";
import { Input } from "@/components/theme-custom/input";
import { loginToAnalytics } from "@/lib/analytics/actions";

type LoginState = "idle" | "sending" | "error";

function LoginForm() {
  const router = useRouter();
  const [passcode, setPasscode] = useState("");
  const [state, setState] = useState<LoginState>("idle");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState("sending");
    const result = await loginToAnalytics(passcode);
    if (result.success) {
      router.refresh();
    } else {
      setState("error");
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mx-auto flex w-full max-w-sm flex-col gap-6 px-4 py-24"
    >
      <h1 className="text-3xl font-normal text-foreground">Analytics</h1>
      <Field>
        <FieldLabel htmlFor="analytics-passcode">Passcode</FieldLabel>
        <Input
          id="analytics-passcode"
          type="password"
          autoFocus
          autoComplete="off"
          value={passcode}
          onChange={(event) => {
            setPasscode(event.target.value);
            setState("idle");
          }}
        />
        {state === "error" && <FieldError>Incorrect passcode.</FieldError>}
      </Field>
      <Button type="submit" size="lg" disabled={state === "sending" || passcode.length === 0}>
        {state === "sending" ? "Checking…" : "Enter"}
      </Button>
    </form>
  );
}

export { LoginForm };
