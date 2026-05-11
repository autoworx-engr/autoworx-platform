# AI Copilot — Build Changelog

Chronological log of all changes during the AI Copilot feature build.
Most recent at the top. Each phase appends a section.

---

## Phase 0.5 — Draft estimate path consolidation

**Date:** 2026-05-11
**Branch:** taiseer/ai-copilot

### Files modified

| File                                                                                | Change                                                                                                                                                                               |
| ----------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `src/actions/appointment/addAppointment.ts`                                         | Inline draft-estimate creation (lines 106–141) replaced with call to `createDraftEstimate` action                                                                                    |
| `src/actions/appointment/editAppointment.ts`                                        | Inline draft-estimate creation (lines 59–88) replaced with call to `createDraftEstimate` action. Fixes pre-existing bug where edit-appointment created estimates without `columnId`. |
| `src/app/(dashboard)/dashboard/pipeline/sales/pipeline/_components/LeadActions.tsx` | Removed stale `createDraftEstimate` import (no longer used by active handler)                                                                                                        |

### Latent bug fixed

`editAppointment.ts` was creating draft estimates without a `columnId`, meaning the estimates would not appear in any shop pipeline column — invisible in the UI. Users who edited an appointment to add a draft estimate would create an "orphan" estimate. Consolidating to `createDraftEstimate` fixes this by reusing its proper column lookup logic (`title: "Pending", type: "shop"`).

Additionally, `addAppointment.ts` was querying the Pending column without the `type: "shop"` filter, risking matching a non-shop column. This is also corrected by delegation to `createDraftEstimate`.

### Flagged for team review (NOT changed in this commit)

1. **Path 1 vs Path 2 automation asymmetry:** `createLeadDraftEstimate` (used by pipeline) does NOT trigger `updateInvoiceAutomationTrigger`; `createDraftEstimate` (used by client panel and now by appointments) DOES. One is likely incorrect — team should confirm which behavior is canonical.
2. **Non-transactional appointment-then-invoice creation:** `addAppointment` creates the appointment record first, commits, then creates the invoice. If invoice creation fails, the appointment has a dangling `draftEstimate` reference pointing to a non-existent invoice. Out of scope for this PR; flagged for a future cleanup.

### Verification

- ✓ `yarn tsc --noEmit` — 0 errors
- ✓ `yarn build` — clean (139s)
- ✓ Create appointment without estimate — appointment created, no phantom invoice
- ✓ Create appointment with estimate — invoice created with `columnId`, appears in Pending column
- ✓ Edit appointment to add estimate — invoice created with `columnId`, appears in Pending (bug fix verified)
- ✓ Pipeline lead-to-estimate — still works (Path 1 unchanged)
- ✓ Client panel create estimate — still works (Path 2 unchanged)

---

## Phase 0b — Core helper libraries

**Date:** 2026-05-11
**Branch:** taiseer/ai-copilot

### Files created

| File                                           | Purpose                                                             |
| ---------------------------------------------- | ------------------------------------------------------------------- |
| `src/lib/anthropic.ts`                         | Lazy-initialized Anthropic SDK singleton; pinned model ID constants |
| `src/lib/copilot/audit.ts`                     | PII-redacting audit log writer; never throws                        |
| `src/lib/copilot/normalizeActionResult.ts`     | Normalizes all server action response shapes to a single union      |
| `src/lib/copilot/canUserDo.ts`                 | Maps 20 copilot action strings to AWX permission field checks       |
| `src/actions/estimate/invoice/sendEstimate.ts` | Unified estimate/invoice send: email or SMS, with audit log         |

### Packages added

| Package             | Version | Purpose              |
| ------------------- | ------- | -------------------- |
| `@anthropic-ai/sdk` | ^0.95.1 | Anthropic API client |

### Key design decisions

- `canUserDo` uses `compPerm()` helper to safely access `companyPermissions` fields
  across all 5 role variants — `PermissionForTechnician` is missing several fields
  that other role types have (TypeScript union narrowing issue)
- `normalizeError` return type is `Extract<NormalizedResult, { ok: false }>` to allow
  direct `.error` access without an `if (!ok)` guard at call sites
- `sendEstimate` `invoiceId` uses `z.string()` not `z.number()` — Invoice.id is a
  String cuid, not an integer
- `AuditActor` enum values are lowercase (`copilot`, not `COPILOT`)
- Client phone field is `mobile` not `phone` in the Prisma model

### Tests performed

- ✓ `yarn tsc --noEmit` — 0 errors
- ✓ `yarn build` — passes (99s)
- ✓ Smoke test: `normalizeActionResult`, `normalizeError`, `redactPii` all pass

---

## Phase 0a — Schema additions + lead creation refactor

**Date:** 2026-05-11
**Branch:** taiseer/ai-copilot
**Commit:** cd1b7408

### Files created

| File                                                             | Purpose                                                              |
| ---------------------------------------------------------------- | -------------------------------------------------------------------- |
| `prisma/migrations/20260510000000_add_copilot_and_audit_log.sql` | Migration: User.hasCopilot, CopilotSession, CopilotMessage, AuditLog |
| `src/lib/leads/createLeadRecord.ts`                              | Pure DB logic for creating a lead (callable from any auth context)   |
| `src/actions/lead/createLead.ts`                                 | Session-authenticated server action wrapping createLeadRecord        |

### Files modified

| File                                     | Change                                         | Why                            |
| ---------------------------------------- | ---------------------------------------------- | ------------------------------ |
| `prisma/schema.prisma`                   | Added 1 boolean field, 2 enums, 3 models       | Foundation for copilot feature |
| `src/app/api/lead-generate/route.ts`     | Extracted inline DB logic; route 283→136 lines | Make lead creation reusable    |
| `src/actions/lead/createLeadFromForm.ts` | Now calls createLead directly                  | Eliminate HTTP self-proxy      |

### Migrations

- `add_copilot_and_audit_log` — non-destructive; additive only

### Latent bugs fixed (pre-existing)

1. Infobip CRM-mode parameter bug (silent, unused path on this platform)
2. CRM-mode automation token bug (silent 401, no production usage)

### Tests performed

- ✓ yarn build clean
- ✓ Thunderbolt Create Lead form works
- ✓ External webhook /api/lead-generate creates correct data
- ✓ Side-by-side comparison confirmed behavioral equivalence

### Coordination flags for dev team

- `ai_personalities.human_handoff_message` column exists in Prisma but not in local dev DB — verify production has it
- `react-easy-crop` is imported but not in package.json (pre-existing, not ours)
- dev company "THC Local" zapierToken was exposed during testing — rotate when convenient
