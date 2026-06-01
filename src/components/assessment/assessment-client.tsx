"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { submitBlueprint } from "@/app/actions/assessment";
import { BlueprintLoading } from "@/components/assessment/blueprint-loading";
import { BlueprintResults } from "@/components/assessment/blueprint-results";
import { BlueprintRunner } from "@/components/assessment/blueprint-runner";
import { BlueprintWelcome } from "@/components/assessment/blueprint-welcome";
import { QUESTIONS } from "@/lib/assessment/questions";
import type { Answers, BlueprintResult } from "@/lib/assessment/types";

type Step = "welcome" | "runner" | "loading" | "results";

interface AssessmentClientProps {
  initialResult: BlueprintResult | null;
}

export function AssessmentClient({ initialResult }: AssessmentClientProps) {
  const router = useRouter();
  const [step, setStep] = useState<Step>(initialResult ? "results" : "welcome");
  const [answers, setAnswers] = useState<Answers>({});
  const [currentQ, setCurrentQ] = useState(0);
  const [result, setResult] = useState<BlueprintResult | null>(initialResult);
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

  const submit = () => {
    setStep("loading");
    startTransition(async () => {
      const res = await submitBlueprint(answers);
      if (!res.ok) {
        toast.error(res.error);
        setStep("runner");
        return;
      }
      setResult(res.result);
      setStep("results");
      router.refresh();
    });
  };

  if (step === "welcome") return <BlueprintWelcome onStart={start} />;
  if (step === "runner")
    return (
      <BlueprintRunner
        currentQ={currentQ}
        answers={answers}
        onSelect={select}
        onBack={back}
        onNext={next}
        pending={pending}
      />
    );
  if (step === "loading") return <BlueprintLoading />;
  if (step === "results" && result)
    return <BlueprintResults result={result} onRetake={start} />;
  // Fallback: results step without a result (shouldn't happen)
  return <BlueprintWelcome onStart={start} />;
}
