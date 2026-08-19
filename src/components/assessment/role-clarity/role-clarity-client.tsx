"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { submitRoleClarity } from "@/app/actions/role-clarity";
import { RoleClarityResults } from "@/components/assessment/role-clarity/role-clarity-results";
import { RoleClarityRunner } from "@/components/assessment/role-clarity/role-clarity-runner";
import { RoleClarityWelcome } from "@/components/assessment/role-clarity/role-clarity-welcome";
import {
  QUESTIONS,
  type RoleClarityAnswers,
  type RoleClarityResult,
} from "@/lib/assessment/role-clarity";
import type { Prescription } from "@/lib/dashboard/prescribe";

type Step = "welcome" | "runner" | "results";

interface RoleClarityClientProps {
  initialResult: RoleClarityResult | null;
  initialCompletedAt: string | null;
  prescription: Prescription | null;
}

export function RoleClarityClient({
  initialResult,
  initialCompletedAt,
  prescription,
}: RoleClarityClientProps) {
  const router = useRouter();
  const [step, setStep] = useState<Step>(initialResult ? "results" : "welcome");
  const [answers, setAnswers] = useState<RoleClarityAnswers>({});
  const [currentQ, setCurrentQ] = useState(0);
  const [result, setResult] = useState<RoleClarityResult | null>(initialResult);
  const [completedAt, setCompletedAt] = useState<string | null>(
    initialCompletedAt
  );
  const [pending, startTransition] = useTransition();

  const start = () => {
    setAnswers({});
    setCurrentQ(0);
    setStep("runner");
  };

  const select = (qIndex: number, optIndex: number) => {
    setAnswers((prev) => ({ ...prev, [qIndex]: optIndex }));
  };

  const back = () => {
    if (currentQ > 0) setCurrentQ((q) => q - 1);
  };

  const next = () => {
    if (answers[currentQ] === undefined) return;
    if (currentQ < QUESTIONS.length - 1) {
      setCurrentQ((q) => q + 1);
    } else {
      submit();
    }
  };

  // Scoring is arithmetic, so there's no wait worth a loading screen — the
  // result comes back with the same request that writes it.
  const submit = () => {
    startTransition(async () => {
      const res = await submitRoleClarity(answers);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      setResult(res.result);
      setCompletedAt(new Date().toISOString());
      setStep("results");
      router.refresh();
    });
  };

  if (step === "runner")
    return (
      <RoleClarityRunner
        currentQ={currentQ}
        answers={answers}
        onSelect={select}
        onBack={back}
        onNext={next}
        pending={pending}
      />
    );
  if (step === "results" && result)
    return (
      <RoleClarityResults
        result={result}
        completedAt={completedAt}
        prescription={prescription}
        onRetake={start}
      />
    );
  return <RoleClarityWelcome onStart={start} />;
}
