# docs/

Two kinds of docs live here:

- **Reference docs** — high-level direction, schema, journeys, operations. These stay in `docs/` and are updated in place.
- **Plan docs** (`ec-*-plan.md`, `todo.md`) — feature or workflow implementation plans with sprints/slices/checkboxes. These move to `docs/done/` when shipped.

## When is a plan "done"?

A plan moves to `docs/done/` when **both** are true:

1. The doc has a top-level `Status: ✅ Shipped <YYYY-MM-DD>` header.
2. All sprints/slices/checkboxes in the doc are complete (or explicitly descoped with a note).

See `docs/done/ec-candidate-pipeline-plan.md` and `docs/done/ec-job-board-plan.md` for the canonical shape.

## Current files

**Reference (keep in place):**

- `context.md` — product/business context
- `db_schema.md` — database schema + enums
- `design.md` — design system notes
- `ec-admin-operations.md` — admin ops + Loops email events
- `ec-candidate-journey.md` — candidate journey + tier access
- `ec-feature-list.md` — feature list + build status
- `ec-ui-plan.md` — UI conventions
- `notify-setup.md` — Realtime notification setup

**Plans (move to `done/` when shipped):**

- `ec-dev-plan.md`
- `ec-events-growth-plan.md`
- `todo.md`

**Shipped (`done/`):**

- `done/ec-job-board-plan.md`
- `done/ec-candidate-pipeline-plan.md`
- `done/ec-admin-super-plan.md`
- `done/ec-admin-recruiters-plan.md`
