"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";

import { editRoleBullets, saveRole } from "@/app/actions/big-wins";
import { BigWinsOverview } from "@/components/assessment/big-wins-overview";
import { BigWinsQuestion } from "@/components/assessment/big-wins-question";
import { BigWinsRecap } from "@/components/assessment/big-wins-recap";
import { Spinner } from "@/components/ui/spinner";
import {
  type BigWinsAnswers,
  type BigWinsCategoryKey,
  type BigWinsResult,
  type BigWinsRole,
  CATEGORIES,
  categoriesForTitle,
  mergeRoleBullets,
  vaguenessNudge,
} from "@/lib/assessment/big-wins";

type Step = "overview" | "question" | "polishing" | "recap";

interface BigWinsClientProps {
  roles: BigWinsRole[];
  initialAnswers: BigWinsAnswers;
  initialResult: BigWinsResult | null;
  /** Deep-link from /resume: jump straight into this role. */
  startRoleKey: string | null;
}

export function BigWinsClient({
  roles,
  initialAnswers,
  initialResult,
  startRoleKey,
}: BigWinsClientProps) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("overview");
  const [answers, setAnswers] = useState<BigWinsAnswers>(initialAnswers);
  const [result, setResult] = useState<BigWinsResult | null>(initialResult);
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [questions, setQuestions] = useState<BigWinsCategoryKey[]>([]);
  const [qIndex, setQIndex] = useState(0);
  /** Unbacked figures in the rewrite just generated. Recap-only — a
   *  confirmation prompt, not persisted state. */
  const [flagged, setFlagged] = useState<Record<number, string[]>>({});
  const [nudge, setNudge] = useState<string | null>(null);
  const [nudged, setNudged] = useState<Set<string>>(new Set());
  const [flipped, setFlipped] = useState<Set<string>>(new Set());
  const [pending, startTransition] = useTransition();

  const merged = mergeRoleBullets(roles, result);
  const active = activeKey ? roles.find((r) => r.key === activeKey) : undefined;
  const activeMerged = activeKey
    ? merged.find((r) => r.key === activeKey)
    : undefined;
  const category = questions[qIndex]
    ? CATEGORIES[questions[qIndex]]
    : undefined;
  const answerId = activeKey ? `${activeKey}:${questions[qIndex]}` : "";
  const answer = (activeKey && answers[activeKey]?.[questions[qIndex]]) || "";

  const startRole = (key: string) => {
    const role = roles.find((r) => r.key === key);
    if (!role) return;
    setActiveKey(key);
    setQuestions(categoriesForTitle(role.title).initial);
    setQIndex(0);
    setNudge(null);
    setStep("question");
  };

  // Honour ?role=<key> once, on mount.
  const deepLinked = useRef(false);
  useEffect(() => {
    if (deepLinked.current || !startRoleKey) return;
    deepLinked.current = true;
    startRole(startRoleKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startRoleKey]);

  const setAnswer = (value: string) => {
    if (!activeKey) return;
    const key = questions[qIndex];
    setAnswers((prev) => ({
      ...prev,
      [activeKey]: { ...prev[activeKey], [key]: value },
    }));
  };

  const advance = () => {
    setNudge(null);
    if (qIndex < questions.length - 1) {
      setQIndex((i) => i + 1);
    } else {
      polish();
    }
  };

  const next = () => {
    // One dig-deeper pass per question: an unquantified answer gets the Section 4
    // nudge, and a second Next moves on regardless.
    if (!nudged.has(answerId)) {
      const hint = vaguenessNudge(answer);
      if (hint) {
        setNudged((prev) => new Set(prev).add(answerId));
        setNudge(hint);
        return;
      }
    }
    advance();
  };

  const skip = () => {
    setNudged((prev) => new Set(prev).add(answerId));
    advance();
  };

  const back = () => {
    setNudge(null);
    if (qIndex > 0) setQIndex((i) => i - 1);
    else setStep("overview");
  };

  const polish = () => {
    if (!active) return;
    setStep("polishing");
    startTransition(async () => {
      const res = await saveRole({
        company: active.company,
        title: active.title,
        start: active.start,
        end: active.end,
        originalBullets: active.originalBullets,
        answers: answers[active.key] ?? {},
      });
      if (!res.ok) {
        toast.error(res.error);
        setStep("question");
        return;
      }
      setFlagged(res.flagged);
      setResult((prev) => ({
        roles: {
          ...(prev?.roles ?? {}),
          [res.key]: {
            bullets: res.bullets,
            polished_at: new Date().toISOString(),
          },
        },
      }));
      setStep("recap");
      router.refresh();
    });
  };

  const saveEdits = (bullets: string[]) => {
    if (!activeKey) return;
    startTransition(async () => {
      const res = await editRoleBullets(activeKey, bullets);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      // Their own words now — nothing left to trace back.
      setFlagged({});
      setResult((prev) => {
        const roles = { ...(prev?.roles ?? {}) };
        if (res.bullets.length === 0) delete roles[res.key];
        else
          roles[res.key] = {
            bullets: res.bullets,
            polished_at: new Date().toISOString(),
          };
        return { roles };
      });
      toast.success("Saved.");
      router.refresh();
    });
  };

  const moreQuestions = () => {
    if (!active) return;
    const { initial, more } = categoriesForTitle(active.title);
    if (questions.length > initial.length) return;
    setQuestions([...initial, ...more]);
    setQIndex(initial.length);
    setNudge(null);
    setStep("question");
  };

  const nextRole = roles.find(
    (r) => r.key !== activeKey && !result?.roles[r.key]
  );

  const finishRole = () => {
    setNudge(null);
    if (nextRole) startRole(nextRole.key);
    else {
      setActiveKey(null);
      setStep("overview");
    }
  };

  if (step === "polishing") {
    return (
      <div className="flex flex-col items-center gap-4 py-24 text-center">
        <Spinner className="h-6 w-6 text-accent" />
        <p className="font-display text-lg text-foreground">
          Writing up {active?.title}…
        </p>
        <p className="max-w-sm text-sm text-muted-foreground">
          Turning your answers into metric-forward bullets. This takes a few
          seconds.
        </p>
      </div>
    );
  }

  if (step === "question" && active && category) {
    return (
      <BigWinsQuestion
        category={category}
        role={active}
        position={qIndex + 1}
        total={questions.length}
        value={answer}
        onChange={setAnswer}
        nudge={nudge}
        showFlip={flipped.has(answerId)}
        onShowFlip={() => setFlipped((prev) => new Set(prev).add(answerId))}
        onBack={back}
        onSkip={skip}
        onNext={next}
        pending={pending}
        isLastQuestion={qIndex === questions.length - 1}
      />
    );
  }

  if (step === "recap" && active && activeMerged) {
    const { initial } = categoriesForTitle(active.title);
    return (
      <BigWinsRecap
        role={activeMerged}
        bullets={result?.roles[active.key]?.bullets ?? []}
        flagged={flagged}
        originalBullets={active.originalBullets}
        onSaveEdits={saveEdits}
        onMoreQuestions={moreQuestions}
        hasMoreQuestions={questions.length <= initial.length}
        onDone={finishRole}
        doneLabel={
          nextRole ? `Next role: ${nextRole.title}` : "Done — back to my roles"
        }
        pending={pending}
      />
    );
  }

  return (
    <BigWinsOverview roles={merged} onStartRole={startRole} pending={pending} />
  );
}
