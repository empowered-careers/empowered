# Handover

Everything a new owner needs to run, understand, and continue Empowered Careers.

Written for someone with no prior context. If something here is wrong or missing, fix
it in place — this folder is meant to be maintained, not archived.

There is an HTML version of the same material in [`html/`](html/) — open
[`html/index.html`](html/index.html) in a browser. The markdown here is the source of
truth for anything textual.

---

## Reading order

### Day 1 — get it running

1. [`../../README.md`](../../README.md) — what this is, the stack, quickstart
2. **[`local-setup.md`](local-setup.md)** — clone to a working resume pipeline, with
   the observable outcome at each step
3. [`services.md`](services.md) — the accounts you need invites to

### Day 2 — understand it

4. [`architecture.md`](architecture.md) — the four conventions, request flow, the
   async job pattern
5. [`data-model.md`](data-model.md) — 28 tables, 22 enums, RLS
6. **[`dormant-surfaces.md`](dormant-surfaces.md)** — why half the codebase serves a
   product that's no longer sold

### Week 1 — know what's left

7. **[`open-items.md`](open-items.md)** — unfinished work, triaged into engineering /
   ops / business decisions
8. [`../ec-pivot-brief.md`](../ec-pivot-brief.md) and
   [`../ec-pivot-plan.md`](../ec-pivot-plan.md) — current direction
9. [`../../CLAUDE.md`](../../CLAUDE.md) and [`../../CONTRIBUTING.md`](../../CONTRIBUTING.md)

---

## Files here

| File                                         | What it answers                                                          |
| -------------------------------------------- | ------------------------------------------------------------------------ |
| [`local-setup.md`](local-setup.md)           | How do I run it, and how do I know it worked?                            |
| [`services.md`](services.md)                 | What external services, what do they do, what breaks when they're unset? |
| [`architecture.md`](architecture.md)         | How is the code organized and what conventions must I follow?            |
| [`data-model.md`](data-model.md)             | What's in the database and how is it protected?                          |
| [`dormant-surfaces.md`](dormant-surfaces.md) | Why is this code here if nobody uses it?                                 |
| [`open-items.md`](open-items.md)             | What isn't finished, and whose problem is it?                            |

---

## The five things to know before touching anything

1. **Revenue is à la carte only.** No subscriptions. Entitlement is a row in
   `enrollments`, never `profiles.plan`. Never add a plan-based gate.

2. **Dormant ≠ deleted.** The job board, matching, employer portal, and subscription
   code are kept deliberately. Don't build on them; don't delete them.

3. **RLS is the authorization model** — and a policy-blocked write returns
   success-shaped empty data, not an error. If a write "succeeds" but no row appears,
   suspect RLS first.

4. **The money path has never completed end to end.** `payments` and `enrollments`
   were both 0 rows at last audit. Verify it before trusting anything downstream.

5. **There are no automated tests.** Ten `assert`-based `.check.ts` files exist and
   CI runs none of them. Verification is type-check, lint, evals, and manual smoke
   tests.

---

## Where everything else lives

The wider `docs/` folder is product history: specs, shipped plans, deferred plans, and
point-in-time reviews. [`../README.md`](../README.md) indexes it and marks what's
superseded.

**Read the pivot banner at the top of an older doc before trusting it.** Several
predate the coaching pivot and are accurate about code while wrong about product.

| Need                                 | Go to                                                                                                                                    |
| ------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Current product direction            | [`../ec-pivot-brief.md`](../ec-pivot-brief.md)                                                                                           |
| Implementation state, build order    | [`../ec-pivot-plan.md`](../ec-pivot-plan.md)                                                                                             |
| Column-level schema                  | [`../db_schema.md`](../db_schema.md)                                                                                                     |
| Design tokens and conventions        | [`../design.md`](../design.md)                                                                                                           |
| Stripe catalog / coaches / Cal setup | [`../ec-catalog-setup.md`](../ec-catalog-setup.md)                                                                                       |
| Admin ops + Loops event payloads     | [`../ec-admin-operations.md`](../ec-admin-operations.md)                                                                                 |
| Assessment content specs             | [`../big_wins_q&a.md`](../big_wins_q&a.md), [`../role-clarity-spec.md`](../role-clarity-spec.md), `../career-positioning-assessment.pdf` |
| Raw ops checklist                    | [`../todo.md`](../todo.md)                                                                                                               |
| Shipped plans (historical)           | [`../done/`](../done/)                                                                                                                   |
| Speced but not built                 | [`../deferred/`](../deferred/)                                                                                                           |
| Superseded, narrative only           | [`../deprecated/`](../deprecated/)                                                                                                       |

---

## Who to ask

- **GT (Thrilok)** — architecture, schema, Inngest, Stripe, anything cross-cutting.
  Also the source for vendor invites and credentials.
- **Lauren** — product decisions, coaching content, admin operations, and every
  pricing question in [`open-items.md`](open-items.md#3-business-decisions).
