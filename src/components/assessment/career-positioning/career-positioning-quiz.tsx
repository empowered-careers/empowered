"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { toast } from "sonner";

import {
  captureAssessmentLead,
  saveAssessmentResult,
} from "@/app/actions/career-assessment";
import {
  type CareerAssessmentResult,
  type CategoryKey,
  CATS,
  computeResults,
  QUESTIONS,
} from "@/lib/assessment/career-positioning";

import styles from "./career-positioning.module.css";

type Step =
  | { type: "intro" }
  | { type: "question"; qIndex: number }
  | { type: "lead" }
  | { type: "results" };

// intro → Q1 → Q2 → lead gate → Q3..Q18 → results
const STEPS: Step[] = (() => {
  const s: Step[] = [{ type: "intro" }];
  QUESTIONS.forEach((_, i) => {
    s.push({ type: "question", qIndex: i });
    if (i === 1) s.push({ type: "lead" });
  });
  s.push({ type: "results" });
  return s;
})();

const DIAL_ARC = Math.PI * 90; // radius 90

interface Props {
  source: string;
  sourceRef?: string;
  /** ponytail: point at the real 1:1 booking page when one exists. */
  bookingUrl?: string;
}

export function CareerPositioningQuiz({
  source,
  sourceRef,
  bookingUrl = "/events",
}: Props) {
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [emailInvalid, setEmailInvalid] = useState(false);
  const [leadId, setLeadId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const step = STEPS[current];
  const answeredCount = QUESTIONS.filter(
    (q) => answers[q.id] !== undefined
  ).length;

  const go = (i: number) => {
    setCurrent(Math.max(0, Math.min(STEPS.length - 1, i)));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const select = (id: number, val: number) =>
    setAnswers((a) => ({ ...a, [id]: val }));

  const submitLead = () => {
    const trimmed = email.trim();
    if (!trimmed || !trimmed.includes("@")) {
      setEmailInvalid(true);
      return;
    }
    startTransition(async () => {
      const res = await captureAssessmentLead({
        email: trimmed,
        firstName: name.trim() || undefined,
        source,
        sourceRef,
      });
      if (res.ok && res.data) {
        setLeadId(res.data.leadId);
      } else if (!res.ok) {
        // Don't trap the user out of their results if capture hiccups.
        toast.error(res.error);
      }
      go(current + 1);
    });
  };

  // ---- Dial values per step ----
  let dialFraction = 0;
  let dialNum = "0%";
  let dialLabel = "Get started";
  const result = useMemo<CareerAssessmentResult | null>(
    () => (step.type === "results" ? computeResults(answers) : null),
    [step.type, answers]
  );
  if (step.type === "question" || step.type === "lead") {
    dialFraction = answeredCount / QUESTIONS.length;
    dialNum = `${Math.round((100 * answeredCount) / QUESTIONS.length)}%`;
    dialLabel = "Progress";
  } else if (step.type === "results" && result) {
    dialFraction = result.overallPct / 100;
    dialNum = `${result.overallPct}%`;
    dialLabel = result.tier.name;
  }

  // Persist the result once we land on the results screen.
  const savedRef = useRef(false);
  useEffect(() => {
    if (step.type !== "results" || !result || savedRef.current) return;
    savedRef.current = true;
    if (!leadId) return;
    void saveAssessmentResult({ leadId, email: email.trim(), result });
  }, [step.type, result, leadId, email]);

  const eyebrow =
    step.type === "question"
      ? `Question ${step.qIndex + 1} of ${QUESTIONS.length}`
      : step.type === "lead"
        ? "Almost there"
        : step.type === "results"
          ? "Your results"
          : "";

  return (
    <div className={styles.root}>
      <div className={styles.shell}>
        <div className={styles.eyebrow}>{eyebrow}</div>

        <div className={styles.dialWrap}>
          <svg className={styles.dial} viewBox="0 0 220 132" aria-hidden="true">
            <path
              className={styles.dialTrack}
              d="M 20 112 A 90 90 0 0 1 200 112"
            />
            <path
              className={styles.dialFill}
              d="M 20 112 A 90 90 0 0 1 200 112"
              style={{
                strokeDasharray: DIAL_ARC,
                strokeDashoffset:
                  DIAL_ARC * (1 - Math.max(0, Math.min(1, dialFraction))),
              }}
            />
          </svg>
        </div>
        <div className={styles.dialCenter}>
          <span className={styles.dialNum}>{dialNum}</span>
          <span className={styles.dialLabel}>{dialLabel}</span>
        </div>

        <div key={current} className={`${styles.card} ${styles.fade}`}>
          {step.type === "intro" && (
            <>
              <p className={styles.cat}>Free Assessment · 4–6 minutes</p>
              <h1 className={styles.h}>
                How strong is your job search — really?
              </h1>
              <p className={styles.sub}>
                Answer 18 quick questions across brand, market positioning,
                mindset, networking, interview readiness, and negotiation.
                You&apos;ll get a personalized snapshot of where your search
                stands, and where to focus first.
              </p>
              <button
                className={`${styles.btn} ${styles.btnPrimary} ${styles.btnBlock} ${styles.startBtn}`}
                onClick={() => go(1)}
              >
                Start the assessment
              </button>
            </>
          )}

          {step.type === "question" &&
            (() => {
              const q = QUESTIONS[step.qIndex];
              const isLast = step.qIndex === QUESTIONS.length - 1;
              return (
                <>
                  <p className={styles.cat}>{CATS[q.cat].label}</p>
                  <p className={styles.question}>{q.text}</p>

                  {q.type === "scale" ? (
                    <>
                      <div
                        className={styles.scale}
                        role="group"
                        aria-label="Rate from 1 to 5"
                      >
                        {[1, 2, 3, 4, 5].map((v) => (
                          <button
                            key={v}
                            className={`${styles.scaleBtn} ${answers[q.id] === v ? styles.selected : ""}`}
                            onClick={() => select(q.id, v)}
                          >
                            {v}
                          </button>
                        ))}
                      </div>
                      <div className={styles.scaleLabels}>
                        <span>{q.low}</span>
                        <span>{q.high}</span>
                      </div>
                    </>
                  ) : (
                    <div className={styles.options} role="group">
                      {q.options.map((opt) => (
                        <button
                          key={opt.label}
                          className={`${styles.opt} ${answers[q.id] === opt.val ? styles.selected : ""}`}
                          onClick={() => select(q.id, opt.val)}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  )}

                  <div className={styles.nav}>
                    <button
                      className={`${styles.btn} ${styles.btnGhost}`}
                      onClick={() => go(current - 1)}
                    >
                      Back
                    </button>
                    <button
                      className={`${styles.btn} ${styles.btnPrimary}`}
                      disabled={answers[q.id] === undefined}
                      onClick={() => go(current + 1)}
                    >
                      {isLast ? "See my results" : "Next"}
                    </button>
                  </div>
                </>
              );
            })()}

          {step.type === "lead" && (
            <>
              <p className={styles.cat}>One quick step</p>
              <h1 className={styles.h}>Where should we send your results?</h1>
              <p className={styles.sub}>
                We&apos;ll email your full breakdown and save your spot to keep
                going.
              </p>
              <div className={styles.field}>
                <label htmlFor="cpaName">First name</label>
                <input
                  id="cpaName"
                  type="text"
                  autoComplete="given-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div className={styles.field}>
                <label htmlFor="cpaEmail">Email</label>
                <input
                  id="cpaEmail"
                  type="email"
                  autoComplete="email"
                  className={emailInvalid ? styles.invalid : ""}
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setEmailInvalid(false);
                  }}
                />
              </div>
              <div className={styles.nav}>
                <button
                  className={`${styles.btn} ${styles.btnGhost}`}
                  onClick={() => go(current - 1)}
                >
                  Back
                </button>
                <button
                  className={`${styles.btn} ${styles.btnPrimary}`}
                  disabled={pending}
                  onClick={submitLead}
                >
                  {pending ? "Saving…" : "Continue"}
                </button>
              </div>
            </>
          )}

          {step.type === "results" && result && (
            <>
              <p className={styles.cat}>
                {name ? `${name}’s` : "Your"} snapshot
              </p>
              <p className={styles.tier}>{result.tier.name}</p>
              <h1 className={styles.h}>{result.tier.headline}</h1>
              <span className={styles.chip}>
                Biggest opportunity: {CATS[result.lowestCategory].label}
              </span>
              <p className={styles.sub}>{result.tier.copy}</p>
              <a
                href={bookingUrl}
                className={`${styles.btn} ${styles.btnPrimary} ${styles.btnBlock}`}
              >
                {result.tier.cta}
              </a>
              <div className={styles.breakdown}>
                {(Object.keys(CATS) as CategoryKey[]).map((catKey) => (
                  <div key={catKey} className={styles.bdRow}>
                    <div className={styles.bdLabel}>{CATS[catKey].label}</div>
                    <div className={styles.bdTrack}>
                      <div
                        className={styles.bdFill}
                        style={{ width: `${result.categoryPct[catKey]}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
              <p className={styles.footnote}>
                A full breakdown was sent to {email || "your email"}.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
