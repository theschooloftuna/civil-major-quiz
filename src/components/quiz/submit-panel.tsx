"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/theme-custom/button";
import { Field, FieldLabel, FieldError } from "@/components/theme-custom/field";
import { Input } from "@/components/theme-custom/input";
import { Alert, AlertDescription } from "@/components/theme-custom/alert";
import { isValidEmail } from "@/lib/email";
import type { QuizVariant } from "@/lib/quiz-variant";
import type { MajorScore } from "@/lib/scoring";
import { saveQuizResult, subscribeToUpdates } from "@/lib/supabase/actions";

interface SubmitPanelProps {
  resultId: string;
  variant: QuizVariant;
  answers: Record<string, string | number>;
  scores: MajorScore[];
  topMajors: MajorScore[];
  onRetake: () => void;
}

const MAX_SAVE_ATTEMPTS = 3;
const RETRY_DELAY_MS = 1500;

type SaveState = "pending" | "saved" | "failed";
type SubscribeState = "idle" | "sending" | "subscribed" | "error";

function SubmitPanel({ resultId, variant, answers, scores, topMajors, onRetake }: SubmitPanelProps) {
  const [saveState, setSaveState] = useState<SaveState>("pending");
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState<string | null>(null);
  const [subscribeState, setSubscribeState] = useState<SubscribeState>("idle");

  useEffect(() => {
    let cancelled = false;

    async function attemptSave() {
      for (let attempt = 0; attempt < MAX_SAVE_ATTEMPTS; attempt++) {
        if (cancelled) return;
        const result = await saveQuizResult({ id: resultId, variant, answers, scores, topMajors });
        if (result.saved) {
          if (!cancelled) setSaveState("saved");
          return;
        }
        if (attempt < MAX_SAVE_ATTEMPTS - 1) {
          await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
        }
      }
      if (!cancelled) setSaveState("failed");
    }

    void attemptSave();
    return () => {
      cancelled = true;
    };
    // Fires once for the result this panel was created with.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resultId]);

  async function handleCopyLink() {
    if (saveState !== "saved") return;
    const shareUrl = `${window.location.origin}/result/${resultId}`;
    await navigator.clipboard.writeText(shareUrl);
    toast.success("Link copied to clipboard!");
  }

  async function handleSubscribe() {
    if (!isValidEmail(email)) {
      setEmailError("Enter a valid email address.");
      return;
    }
    setEmailError(null);
    setSubscribeState("sending");
    const result = await subscribeToUpdates(resultId, email);
    setSubscribeState(result.saved ? "subscribed" : "error");
  }

  return (
    <div className="flex w-full flex-col gap-12 border-t border-moss pt-6">
      <div className="flex flex-wrap gap-4">
        <Button type="button" size="lg" onClick={onRetake}>
          Retake quiz
        </Button>
        <Button
          type="button"
          size="lg"
          variant="secondary"
          disabled={saveState !== "saved"}
          onClick={handleCopyLink}
        >
          {saveState === "failed"
            ? "Link isn't ready"
            : saveState === "pending"
              ? "Preparing link…"
              : "Copy link"}
        </Button>
      </div>

      {subscribeState === "subscribed" ? (
        <Alert variant="success" className="max-w-2xl">
          <AlertDescription>You&apos;re subscribed for updates.</AlertDescription>
        </Alert>
      ) : (
        <div className="flex flex-col gap-4">
          <Alert variant="notice">
            <AlertDescription>
              If you are interested about my 60 days civil engineering basics rebuilding, book
              and software recommendations and research papers subscribe with your email.
            </AlertDescription>
          </Alert>
          <Field>
            {/*<FieldLabel htmlFor="subscribe-email">Email</FieldLabel>*/}
            <div className="flex flex-wrap gap-3">
              <Input
                id="subscribe-email"
                type="email"
                aria-label="Email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setEmailError(null);
                }}
                className="max-w-xs"
              />
              <Button
                type="button"
                size="default"
                disabled={subscribeState === "sending"}
                onClick={handleSubscribe}
              >
                {subscribeState === "sending" ? "Subscribing…" : "Subscribe"}
              </Button>
            </div>
            {emailError && <FieldError>{emailError}</FieldError>}
            {subscribeState === "error" && <FieldError>Couldn&apos;t subscribe right now. Try again.</FieldError>}
          </Field>
        </div>
      )}
    </div>
  );
}

export { SubmitPanel };
