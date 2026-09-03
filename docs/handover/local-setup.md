# Local setup

Clone to a working resume pipeline. Each step names what you should observe, so you
can tell where it broke.

Service accounts and dashboard URLs: [`services.md`](services.md).

---

## 1. Prerequisites

```bash
node --version   # must be 20.11.0 — `nvm use` reads .nvmrc
```

You'll want the Supabase CLI (already a devDependency) and, for Stripe work, the
Stripe CLI.

## 2. Install

```bash
git clone <repo-url>
cd empowered
npm install
npm run prepare   # Husky hooks — lint-staged runs ESLint + Prettier on commit
```

**Expect:** no errors. `npm run type-check` passes on a clean checkout.

## 3. Environment

```bash
cp .env.local.example .env.local
```

Fill in what you were given. Minimum to boot:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
```

Minimum for the resume pipeline to actually do anything: add `SUPABASE_SECRET_KEY` and
`ANTHROPIC_API_KEY`.

Everything else can stay unset — see [the inertness table](services.md#the-posture-optional-and-inert).

**Expect:** `npm run dev` boots. A Zod error at startup naming a variable means that
variable is missing or malformed — `env.ts` is the authority.

## 4. Link Supabase (optional, needed for migrations and type generation)

```bash
npx supabase link --project-ref wpurdayfjsyiedabmipt
npx supabase db push          # apply any unapplied migrations
npm run supabase:types        # regenerate database.types.ts
```

**Expect:** `git diff src/types/database.types.ts` is empty on a clean checkout. If it
isn't, someone changed the schema without regenerating.

## 5. Run — two terminals

```bash
# Terminal 1
npm run inngest:dev    # GUI at http://localhost:8288

# Terminal 2
npm run dev            # http://localhost:3000
```

`npm run dev` sets `INNGEST_DEV=1`, which points the Inngest client at the local dev
server rather than Inngest Cloud — which is why local dev needs no Inngest keys.

**Expect:** the Inngest GUI lists four functions: `parse-resume`, `parse-linkedin`,
`match-jd`, `sweep-inactive`. If it lists none, Terminal 2 isn't running or
`/api/inngest` is erroring.

---

## 6. Smoke test: the resume pipeline

This is the core loop. If it works, the stack is wired correctly.

1. Sign up / sign in at `http://localhost:3000`.
2. You'll hit the **mandatory intake gate** — resume upload is required before
   dashboard access. This is intentional and stays (CLAUDE.md rule 3).
3. Upload a known-good PDF resume.

**Expect, in order:**

- [ ] A toast: upload in progress
- [ ] Inngest GUI shows a `parse-resume` run, each step going green
- [ ] The `resumes` row moves `uploading` → `processing` → `complete`
- [ ] `parsed_json` populated, `resume_score` set
- [ ] A Sonner toast with an action button routing to the result
- [ ] `/resume` renders the parsed work experience

### Deduplication

Re-upload the **same** PDF.

- [ ] Toast says "Resume already on file"
- [ ] **No new Inngest run** — dedup is on file hash, so no Claude call fires

Upload a **different** PDF.

- [ ] The first row flips `is_current = false` and gets `superseded_at` stamped
- [ ] The second row is `is_current = true`

### LinkedIn

With `profiles.linkedin_url` set, `/linkedin` offers profile scoring. Upload a
LinkedIn "Save to PDF" export.

- [ ] Inngest GUI shows a `parse-linkedin` run
- [ ] `linkedin_profiles.status` goes `idle` → `processing` → `complete`
- [ ] `parsed_json` populated; `summary` and `profile_score` denormalized
- [ ] **Critical:** `linkedin_url`, `headline`, and `raw_json` — the OAuth fields —
      are **untouched**. Diff before and after
- [ ] Re-upload the same PDF → "LinkedIn export already on file", no new run

---

## 7. Smoke test: the money path ⚠️

**This has never completed end to end.** `payments` and `enrollments` were both 0 rows
at last audit. Running this is the single highest-value verification available.

```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
# copy the whsec_… into STRIPE_WEBHOOK_SECRET, restart the dev server
```

Buy any à la carte product with `4242 4242 4242 4242`.

- [ ] Checkout redirects to `/checkout/success`
- [ ] A `payments` row exists with `status = 'succeeded'`
- [ ] An `enrollments` row exists for the product
- [ ] A bundle purchase also created rows for every product in `bundle_contents`
- [ ] A `stripe_webhook_events` row has `processed_at` set (not just `processing_error`)

Missing rows with a healthy Stripe dashboard means the webhook never verified —
check `STRIPE_WEBHOOK_SECRET` first.

---

## 8. The self-checks

No test framework. Nine `assert`-based files, run individually:

```bash
npx tsx src/lib/purchase-gate.check.ts
npx tsx src/lib/jd-quota.check.ts
npx tsx src/lib/calendly.check.ts
npx tsx src/lib/dashboard/prescribe.check.ts
npx tsx src/lib/assessment/big-wins.check.ts
npx tsx src/lib/assessment/career-positioning.check.ts
npx tsx src/lib/assessment/role-clarity.check.ts
npx tsx src/data/target-roles.check.ts
npx tsx src/lib/cal.check.ts        # dormant twin
```

Silent exit = pass. **CI does not run these.**

## 9. LLM evals

```bash
npm run eval:scorers   # offline replay — free, no API key
```

**Expect:** both scorer suites pass their gates. Run before and after any prompt or
rubric change. `--record` and `--live` cost money.

## 10. Before you commit

```bash
npm run type-check
npm run check        # ESLint + Prettier — this is what CI runs
npm run fix          # auto-fix both
```

Husky + lint-staged run ESLint and Prettier on staged files automatically.

---

## Troubleshooting

| Symptom                                        | Cause                                                                 |
| ---------------------------------------------- | --------------------------------------------------------------------- |
| Resume stuck at `processing` forever            | Inngest dev server not running (Terminal 1)                           |
| Inngest GUI lists no functions                  | Next.js not running, or `/api/inngest` is erroring                     |
| `getAnthropic()` throws                         | `ANTHROPIC_API_KEY` unset                                              |
| Worker can't write results back                 | `SUPABASE_SECRET_KEY` unset — the worker has no user session           |
| Write "succeeds" but no row appears             | **RLS.** A blocked write returns success-shaped empty data, not an error |
| Checkout 503s                                   | `STRIPE_SECRET_KEY` unset                                              |
| Payment succeeds in Stripe, nothing in the DB   | `STRIPE_WEBHOOK_SECRET` unset or wrong → route 503s                    |
| Booking made, no `coaching_sessions` row        | `CALENDLY_WEBHOOK_SECRET` unset → route 503s                           |
| Zod error at boot naming a variable             | That variable is missing or malformed. `env.ts` is the authority       |
| Type errors after pulling                       | Schema changed — run `npm run supabase:types`                          |
| A retry button on a JD submission               | `inngest.send()` failed — check `INNGEST_EVENT_KEY` in production      |
