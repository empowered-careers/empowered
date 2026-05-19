"use client";

import { Calendar, Play } from "lucide-react";

import { cn } from "@/lib/utils";

// MOCK DATA — replace in S7 with content / courses / enrollments queries
type Plan = "Free" | "Plan 2" | "Plan 3";

interface ContentItem {
  id: string;
  tag: string;
  title: string;
  meta: string;
  plan: Plan;
  /** 0–100 if a course in progress */
  progress?: number;
  type?: "video" | "article" | "event";
  thumbText?: string;
}

const CONTINUE: ContentItem[] = [
  {
    id: "north-star-m3",
    tag: "Course · Module 3 of 5",
    title: "North Star — Defining your next 5 years",
    meta: "Lauren Laughlin",
    plan: "Plan 2",
    progress: 65,
    type: "video",
  },
  {
    id: "dialogues-m2",
    tag: "Course · Module 2 of 6",
    title: "Distinguished Dialogues — Interview mastery",
    meta: "Lauren Laughlin",
    plan: "Plan 2",
    progress: 30,
    type: "video",
  },
  {
    id: "session-4",
    tag: "1:1 Coaching · Thu 14:00 ET",
    title: "Career Navigator — Session 4 with Lauren",
    meta: "50 min · Cal.com",
    plan: "Plan 3",
    type: "event",
  },
];

const RECOMMENDED: ContentItem[] = [
  {
    id: "negotiating",
    tag: "Article · 6 min read",
    title: "What recruiters actually have room to move on",
    meta: "Lauren · May 2026",
    plan: "Free",
    type: "article",
    thumbText: "Negotiating at the staff+ level",
  },
  {
    id: "vp-signals",
    tag: "Report · 12 min",
    title: "What VPs of Eng look for in 2026",
    meta: "EC Research",
    plan: "Plan 2",
    type: "article",
    thumbText: "VP signals — 2026",
  },
  {
    id: "founder-led",
    tag: "Webinar · Jun 6 · Live",
    title: "Founder-led companies: what to ask before you sign",
    meta: "Lauren + 3 founders",
    plan: "Plan 2",
    type: "video",
  },
];

const BROWSE: ContentItem[] = [
  {
    id: "brand-magnification",
    tag: "Course · 8 modules",
    title: "Rewrite how the market sees you",
    meta: "Lauren Laughlin",
    plan: "Plan 2",
    type: "article",
    thumbText: "Brand Magnification",
  },
  {
    id: "mindset",
    tag: "Course · 5 modules",
    title: "The saboteurs you don't know are running the show",
    meta: "Lauren Laughlin",
    plan: "Plan 3",
    type: "article",
    thumbText: "Mindset Mastery",
  },
  {
    id: "pricing",
    tag: "Article · 9 min",
    title: 'From "we should raise prices" to a real model',
    meta: "Guest · May Habib",
    plan: "Free",
    type: "article",
    thumbText: "Pricing as a PM",
  },
];

const PLAN_CLASS: Record<Plan, string> = {
  Free: "bg-chart-2/15 text-chart-2",
  "Plan 2": "bg-accent/15 text-accent",
  "Plan 3": "bg-chart-4/15 text-chart-4",
};

function ContentCard({ item }: { item: ContentItem }) {
  return (
    <div className="cursor-pointer overflow-hidden border border-border bg-card transition-colors hover:border-foreground/40">
      <div className="relative flex h-[130px] items-center justify-center bg-muted">
        {item.thumbText ? (
          <div className="px-5 text-center font-display font-medium text-[22px] text-muted-foreground">
            {item.thumbText}
          </div>
        ) : item.type === "event" ? (
          <Calendar className="size-5 text-accent" />
        ) : (
          <div className="flex size-11 items-center justify-center bg-background/60 text-accent backdrop-blur-sm">
            <Play className="size-4" fill="currentColor" />
          </div>
        )}
        {item.progress !== undefined && (
          <div className="absolute right-3 bottom-3 left-3">
            <div className="h-[3px] bg-foreground/15">
              <div
                className="h-full bg-accent"
                style={{ width: `${item.progress}%` }}
              />
            </div>
          </div>
        )}
      </div>
      <div className="px-4 pt-3.5 pb-4">
        <div className="mb-1.5 text-[10px] text-muted-foreground uppercase tracking-[0.08em]">
          {item.tag}
        </div>
        <div className="mb-2 font-medium text-[14px] leading-snug text-foreground">
          {item.title}
        </div>
        <div className="flex items-center justify-between text-[11.5px] text-muted-foreground">
          <span>{item.meta}</span>
          <span
            className={cn(
              "px-1.5 py-0.5 font-semibold text-[10px] uppercase tracking-[0.06em]",
              PLAN_CLASS[item.plan]
            )}
          >
            {item.plan}
          </span>
        </div>
      </div>
    </div>
  );
}

function Rail({
  title,
  link,
  items,
}: {
  title: string;
  link: string;
  items: ContentItem[];
}) {
  return (
    <div className="mb-9">
      <div className="mb-3 flex items-baseline justify-between">
        <h2 className="font-display font-medium text-xl">{title}</h2>
        <button
          className="cursor-pointer text-[12px] text-muted-foreground transition-colors hover:text-accent"
          type="button"
        >
          {link}
        </button>
      </div>
      <div className="grid gap-3.5 md:grid-cols-2 lg:grid-cols-3">
        {items.map((it) => (
          <ContentCard item={it} key={it.id} />
        ))}
      </div>
    </div>
  );
}

export function ContentClient() {
  return (
    <div>
      <div className="mb-6 flex items-end justify-between">
        <div>
          <h1 className="font-display font-medium text-3xl tracking-tight">
            Content &amp; Courses
          </h1>
          <p className="mt-1 text-muted-foreground text-sm">
            Lauren&apos;s IP, partner content, and live events.
          </p>
        </div>
      </div>

      <Rail items={CONTINUE} link="See all →" title="Continue learning" />
      <Rail
        items={RECOMMENDED}
        link="Based on your assessments"
        title="Recommended for you"
      />
      <Rail items={BROWSE} link="All 47 →" title="Browse the catalog" />
    </div>
  );
}
