# AI Copilot — Merge Notes

For coordinating the merge into development and production deployment.

---

## Branch

`taiseer/ai-copilot` (branched from development)

---

## Pre-merge checklist

- [ ] Rebase against latest development and resolve conflicts
- [ ] Verify yarn build passes (excluding pre-existing react-easy-crop error)
- [ ] Run migrations: `yarn prisma migrate deploy`
- [ ] Set ANTHROPIC_API_KEY in target environment
- [ ] Verify ai_personalities.human_handoff_message exists in target DB
- [ ] Flip User.hasCopilot=true for designated test users

---

## Migrations included

### Phase 0a

`add_copilot_and_audit_log` — additive only, all defaults safe

[Future phases will add entries here]

---

## Environment variables required

| Variable            | Purpose                      | Where to get value                   |
| ------------------- | ---------------------------- | ------------------------------------ |
| `ANTHROPIC_API_KEY` | Powers the copilot LLM calls | AWX shared key (rotate periodically) |

---

## Rollback plan

1. Revert PR
2. Reverse migration: drop new tables + User.hasCopilot column
3. No data loss — all changes additive

---

## Deferred work

- Phase 5: Billing/seat licensing
- Phase 6: Hardening, audit log UI, cost dashboard
- Mobile
