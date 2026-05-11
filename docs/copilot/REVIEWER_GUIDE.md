# AI Copilot — Reviewer Guide

For the AutoWorx dev team. Read top-to-bottom before reviewing the PR.

---

## TL;DR

[Filled in at end of build]

---

## What this feature does

[Filled in at end of build]

---

## Scope boundaries — NOT in this PR

- Mobile integration
- Billing/seat licensing (gated only on User.hasCopilot for now)
- Cross-conversation embedding-based RAG
- Voice input
- Audit log viewer UI
- Cost tracking dashboard

---

## Risk assessment

### Files modified that touch existing functionality

| File                                     | Risk                                                          | Mitigation                                               |
| ---------------------------------------- | ------------------------------------------------------------- | -------------------------------------------------------- |
| `src/app/api/lead-generate/route.ts`     | HIGH — used by every customer's external website contact form | Behavioral equivalence verified via curl regression test |
| `src/actions/lead/createLeadFromForm.ts` | MEDIUM — thunderbolt form in header                           | Manually tested via UI                                   |
| `prisma/schema.prisma`                   | LOW — additive only                                           | Non-destructive migration                                |

### Files added (isolated, low review burden)

[Filled in as we go]

---

## Latent bugs fixed (pre-existing, incidental to refactor)

1. Infobip CRM-mode parameter bug
2. CRM-mode automation token sent as wrong format (silent 401s)
3. **`editAppointment.ts` missing `columnId` on draft estimate creation (Phase 0.5):**
   When a user edited an appointment to add or change a draft estimate, the server action
   created the `Invoice` row without a `columnId`. Since every shop pipeline column view
   filters by `columnId`, these estimates were invisible in the UI — users could not find
   or access them from the pipeline. Fixed by delegating to `createDraftEstimate`, which
   performs a proper `title: "Pending", type: "shop"` column lookup before creating the
   invoice. Pre-existing orphan Invoice rows (from before this fix) will remain in the DB
   with `columnId = null`; a one-time backfill migration could fix them but is out of scope.

See CHANGELOG.md for full details.

---

## Pre-existing issues flagged (separate team decisions needed)

These were discovered during Phase 0.5 consolidation and deliberately NOT changed. The
team should decide the correct behavior before they're touched.

### 1. Automation trigger asymmetry between pipeline and client-panel draft estimate creation

`createLeadDraftEstimate` (Path 1 — pipeline card button) does **NOT** call
`updateInvoiceAutomationTrigger` after creating a draft estimate. `createDraftEstimate`
(Path 2 — client panel, appointments) **DOES** call it.

If automation rules are set up to fire on estimate creation, they will trigger for
client-panel and appointment flows but NOT for pipeline card clicks. One path is likely
wrong. Team to confirm which behavior is canonical and align the other.

### 2. Non-transactional appointment + invoice creation in `addAppointment.ts`

`addAppointment` creates the `Appointment` record, commits to the DB, then calls
`createDraftEstimate` as a separate operation. If `createDraftEstimate` fails (e.g.,
Pending column not found), the appointment is persisted with a `draftEstimate` field
pointing to an invoice that was never created. This is a dangling reference.

The fix would require either: (a) wrapping both operations in a transaction, or (b)
adding a reconciliation check when reading appointments. This is a larger refactor and
intentionally out of scope for this PR.

---

## How to test locally

[Filled in at end]

---

## Open questions deferred to team

[Filled in at end]

---

## Cost optimization (active in current build)

- **Prompt caching on system prompt block** — `cache_control: { type: "ephemeral" }` applied to the system prompt content block. Anthropic charges 90% less for cached input tokens. The cache window is 5 minutes; the system prompt is stable across turns, so multi-turn conversations benefit fully. First message in a session writes the cache; all subsequent messages read it.
- **max_tokens capped at 1024** for chat responses — limits worst-case output cost. Normal conversational replies are well under this cap. Users asking for very long outputs get a clean truncation.
- **Haiku 4.5 for session summarization** — `claude-haiku-4-5-20251001` is used in `generateSessionSummary.ts` (200 max tokens). Approximately 1/3 the cost of Sonnet for these short, structured tasks.
- **Cache token visibility** — `cachedTokens` is persisted on every `CopilotMessage` assistant row. Query Prisma Studio → CopilotMessage → `cachedTokens` to confirm cache is hitting. Dev console also logs: `[copilot] tokens — in:X out:Y cached:Z cacheWrite:W`.

Future optimizations not yet active:

- Haiku 4.5 routing for simple read-only tool calls (Phase 2)
- Conversation context trimming for sessions > 20 messages (Phase 6)
- Per-seat usage caps and billing integration (Phase 5)
