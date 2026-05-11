# AI Copilot — Build Changelog

Chronological log of all changes during the AI Copilot feature build.
Most recent at the top. Each phase appends a section.

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
