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

See CHANGELOG.md for full details.

---

## How to test locally

[Filled in at end]

---

## Open questions deferred to team

[Filled in at end]
