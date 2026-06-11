# PII-Minimized Resume & LinkedIn Parsing

> Status: **deferred** — planned 2026-06-11, not yet scheduled.

## Context

Today the **raw PDF** (containing name, email, phone, address, links) is sent to Anthropic for parsing — Claude Haiku is the OCR/parser for both resumes and LinkedIn exports. The concern: candidate PII reaching Anthropic's servers. (Note: Anthropic commercial API terms mean no training on inputs and ~30-day retention, so this is about privacy posture, not active leakage — but for a talent platform handling candidate data, the posture matters.)

The downstream flow is already PII-light: the parse schema extracts no name/email/phone fields, and the scorer payload strips `raw_text`. The gap is the **parse step itself**.

**Decision:** extract PDF text locally, deterministically redact contact PII, and send only redacted **text** (not the PDF) to Claude — for **both** the resume and LinkedIn pipelines. When local extraction fails (scanned/image PDF), fail with clear user guidance rather than falling back to sending the PDF. Side benefits: cheaper parses (no PDF-vision tokens) and ~half the output tokens (Claude no longer echoes `raw_text`).

A "review/edit parsed fields in the UI" flow was discussed as the ideal failure path but deferred — it's a full sprint of its own (noted in Out of Scope).

## Implementation

### 1. New: local PDF text extraction — `src/lib/pdf/extract-text.ts`

- Add dependency **`unpdf`** (serverless-friendly pdf.js wrapper, no native deps — works on Vercel/Inngest).
- `extractPdfText(buffer: Buffer): Promise<string>` using unpdf's `extractText` with `mergePages: true`.
- Export a quality guard: `isExtractionUsable(text)` — false when extracted text < ~300 chars (scanned/image PDF heuristic).

### 2. New: deterministic PII redaction — `src/lib/pdf/redact.ts`

`redactPii(text: string, known: { fullName?: string | null; email?: string | null; phone?: string | null }): string`

- Known values from `profiles` (authenticated user — this is what makes masking reliable):
  - `full_name` exact match (case-insensitive, word-boundary) → `[NAME]`; also each name token ≥ 3 chars → `[NAME]`.
  - `email` exact match → `[EMAIL]`; `phone` (normalized digits) → `[PHONE]`.
- Pattern-based (catches values not in the profile):
  - email regex → `[EMAIL]`
  - intl-tolerant phone regex (7+ digits with separators) → `[PHONE]`
  - URL regex (http(s)://, www., linkedin.com/in/…, github.com/…) → `[LINK]`
- **Do not** mask company names, titles, schools, dates, or bullet content — the scorer's rubric (tenure, role_progression) depends on them, and they aren't direct contact PII.

### 3. Parser functions take text instead of PDF

**`src/lib/llm/parse-resume.ts`** — `parseResume(resumeText: string)`:

- Replace the `document` content block with a text block containing the redacted text.
- Validate against a new `LlmParsedResumeSchema = ParsedResumeSchema.omit({ raw_text: true })` (in `src/lib/llm/schemas.ts`); caller injects `raw_text` locally (see §4). Claude no longer echoes the full resume back — halves output tokens.

**`src/lib/llm/parse-linkedin.ts`** — `parseLinkedIn(profileText: string)`: same text-block swap. `ParsedLinkedIn` has no `raw_text`, so its schema is unchanged.

**`src/lib/llm/prompts.ts`** — bump both parser prompts to v1.1.0:

- "You extract structured information from resume **text** (extracted from a PDF)…"
- Remove `raw_text` from the resume parser's JSON schema and rules.
- Note: "Contact details are masked as `[NAME]`, `[EMAIL]`, `[PHONE]`, `[LINK]` — ignore these tokens; never invent contact info."
- Resume parser: text may have imperfect reading order from extraction (multi-column layouts); reconstruct sections from headers/dates.

**`env.ts`** — bump `RESUME_PROMPT_VERSION` and `LINKEDIN_PROMPT_VERSION` defaults to `"1.1.0"` (provenance tracking already stores these per row).

### 4. Inngest pipeline changes

**`src/inngest/functions/parse-resume.ts`** (after the existing `check-dedup`/`download-pdf` steps):

- `fetch-row`: also need the profile's PII for masking — add a step (or widen `fetch-row`) to select `full_name, email, phone` from `profiles` for `resume.profile_id` (service client).
- New step `extract-and-redact`: decode the base64 buffer → `extractPdfText` → if `!isExtractionUsable`, throw `NonRetriableError` with a user-facing message: `"We couldn't read text from this PDF — it may be a scanned image. Please upload a text-based PDF (exported from Word, Google Docs, or a resume builder)."` The existing `onFailure` handler already writes this to `resumes.parse_error` and sets `status: 'failed'`, which the existing Realtime notification flow surfaces. Return `{ rawText, redactedText }`.
- `parse-claude` step: `parseResume(redactedText)`, then `parsed = { ...llmResult, raw_text: rawText }` — DB shape (`parsed_text`, `parsed_json`) is unchanged, and we store the **unredacted** local text in our own RLS-protected DB (full fidelity for the user's own data).
- `score-claude` and everything downstream: unchanged (scorer already receives parsed JSON minus `raw_text`).

**`src/inngest/functions/parse-linkedin.ts`** — same pattern: fetch profile PII, `extract-and-redact` step (LinkedIn "Save to PDF" exports are always text-based, so the guard should virtually never trip; failure message: "We couldn't read this file — please re-export your profile via LinkedIn's 'Save to PDF'."), `parseLinkedIn(redactedText)`. The OAuth `headline` passed to `scoreLinkedIn` stays as-is (professional tagline, sent by design). `sync_error`/`status: 'failed'` handling already exists in `onFailure`.

### 5. Docs

- No DB schema change. Add a short note to `CLAUDE.md`'s background-jobs section (or `docs/context.md`): _"LLM calls never receive raw uploaded files or unmasked contact PII — local extraction + redaction (`src/lib/pdf/`) runs first; downstream LLM features must consume `parsed_json`, not `parsed_text`."_ This codifies the rule for the upcoming Deep Dive matching feature.

## Files touched

| File                                      | Change                                                                     |
| ----------------------------------------- | -------------------------------------------------------------------------- |
| `package.json`                            | add `unpdf`                                                                |
| `src/lib/pdf/extract-text.ts`             | **new** — local extraction + usability guard                               |
| `src/lib/pdf/redact.ts`                   | **new** — deterministic PII masking                                        |
| `src/lib/llm/parse-resume.ts`             | text input, omit `raw_text` from LLM schema                                |
| `src/lib/llm/parse-linkedin.ts`           | text input                                                                 |
| `src/lib/llm/schemas.ts`                  | add `LlmParsedResumeSchema` (omit `raw_text`)                              |
| `src/lib/llm/prompts.ts`                  | both parser prompts → v1.1.0 (text input, mask tokens, no `raw_text` echo) |
| `src/inngest/functions/parse-resume.ts`   | fetch PII, extract-and-redact step, inject local `raw_text`                |
| `src/inngest/functions/parse-linkedin.ts` | same pattern                                                               |
| `env.ts`                                  | prompt version defaults → 1.1.0                                            |
| `CLAUDE.md` (or `docs/context.md`)        | one-paragraph PII rule for future LLM features                             |

## Known trade-offs (accepted)

- **Scanned/image PDFs now fail** with guidance instead of parsing — guaranteed no unredacted upload leaves the server. (Future: parsed-fields review/edit UI as the recovery path.)
- **Multi-column/designed resumes**: pdf.js text extraction can scramble reading order vs. Claude's PDF vision. Structured fields (companies/titles/dates/bullets) generally survive since the parser LLM reassembles by section; `parsed_text` cosmetic quality may dip for heavily designed resumes.
- Redaction is best-effort on free text (e.g., a name appearing inside a bullet in a third-party quote) — but profile-sourced exact-match masking covers the dominant case (header contact block).

## Out of scope (explicitly deferred further)

- Editable parsed-resume review UI (the "fix extraction yourself" flow) — separate sprint.
- Anthropic zero-data-retention agreement / DPA — business/legal track, not code.
- Redacting `parsed_text`/`parsed_json` at rest in our own DB (RLS already scopes it to the owner + admins).

## Verification (when implemented)

No automated tests in repo — verify via:

1. `npm run type-check` and `npm run lint`.
2. Unit-style manual check of `redactPii` with a sample resume text (name/email/phone/URL variants) via a scratch `tsx` invocation — confirm masks and confirm companies/titles untouched.
3. End-to-end: `npm run dev` + Inngest dev server; upload a real text-based resume PDF → confirm row reaches `status: 'complete'`, `parsed_text` is the full unredacted local text, `parsed_json` fields populated, score present; check Inngest run logs to confirm the Claude request contains `[EMAIL]`/`[PHONE]`/`[NAME]` masks and no document block.
4. Upload an image-only PDF (print-to-PDF of a screenshot) → confirm `status: 'failed'` with the friendly `parse_error` message and the failure toast.
5. Repeat #3 with a LinkedIn "Save to PDF" export.
