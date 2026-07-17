"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  const [copied, setCopied] = useState(false);
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
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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
    <div className="flex w-full flex-col gap-4 border-t border-foreground pt-4">
      <div className="flex flex-wrap gap-3">
        <Button type="button" variant="outline" onClick={onRetake}>
          Retake quiz
        </Button>
        <Button type="button" variant="secondary" disabled={saveState !== "saved"} onClick={handleCopyLink}>
          {saveState === "failed"
            ? "Link isn't ready"
            : saveState === "pending"
              ? "Preparing link…"
              : copied
                ? "Copied!"
                : "Copy link"}
        </Button>
      </div>

      {subscribeState === "subscribed" ? (
        <p className="text-sm text-muted-foreground">You&apos;re subscribed for updates.</p>
      ) : (
        <div className="flex flex-col gap-2">
          <label
            htmlFor="subscribe-email"
            className="font-mono text-xs uppercase tracking-wide text-muted-foreground"
          >
            Get updates about civil-major-quiz
          </label>
          <div className="flex flex-wrap gap-2">
            <Input
              id="subscribe-email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setEmailError(null);
              }}
              className="max-w-xs"
            />
            <Button type="button" disabled={subscribeState === "sending"} onClick={handleSubscribe}>
              {subscribeState === "sending" ? "Subscribing…" : "Subscribe"}
            </Button>
          </div>
          {emailError && <p className="text-xs text-destructive">{emailError}</p>}
          {subscribeState === "error" && (
            <p className="text-xs text-destructive">Couldn&apos;t subscribe right now. Try again.</p>
          )}
        </div>
      )}
    </div>
  );
}

export { SubmitPanel };
