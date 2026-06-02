# AI Copilot — Merge Notes

For coordinating the merge into development and production deployment.

---

## Branch

`taiseer/ai-copilot` (branched from development)

---

## Pre-merge checklist

- [ ] Rebase against latest `development` and resolve conflicts
- [ ] `yarn build` passes clean
- [ ] Run migrations: `yarn prisma migrate deploy`
- [ ] Set `ANTHROPIC_API_KEY` in target environment (Railway → Variables)
- [ ] Verify `ai_personalities.human_handoff_message` column exists in target DB
- [ ] Architecture decision confirmed for Phase 3 write tools (see REVIEWER_GUIDE.md)
- [ ] Flip `User.hasCopilot = true` for designated pilot users

---

## Migrations included

### Fix — create_client return shape: No DB migrations. **createClientTool return shape changed** — no longer passes through the raw API body. Now returns flat `{ clientId, firstName, lastName, wasCreated, message }` at `data.*`, consistent with every other write tool. The create_client INPUT contract is unchanged.

### Phase 3c.5: No DB migrations. Modified: `getInventoryItemByName.ts` (word-by-word AND search, `price` → `costPrice`, `description` added), `systemPrompt.ts` (inventory-aware materials flow for both create_estimate and add_materials_to_estimate).

### Phase 3c.4: No DB migrations. Modified: `createEstimateTool.ts` (new `applyShopSupplies`/`applyTax` booleans, effective-rate math), `systemPrompt.ts` (toggle guidance + company rates in user context, SystemPromptContext type), `chat/route.ts` (company `tax`/`serviceFee` added to dbUser select and passed to buildSystemPrompt).

### Phase 3c.3: No DB migrations. New files: `estimateMath.ts`, `addMaterialsToEstimateTool.ts`. Modified: `createEstimateTool.ts`, `getEstimateByNumber.ts`, `canUserDo.ts` (new `estimate.add_materials` action), `systemPrompt.ts`, `tools/index.ts`.

### Fix — estimate route numeric ID generation: No DB migrations. **NEEDS DEV TEAM AWARENESS** — edits shared platform route `src/app/api/estimate/[companyId]/route.ts`. Adds `customAlphabet("1234567890", 10)` ID generation before `invoice.create`, mirroring the estimate-create UI. All existing mobile/UI behavior is unchanged.

### Fix — create_estimate ID validation: No DB migrations.

### Phase 3c.2: No DB migrations.

### Hyperlink rendering fix: Adds react-markdown dependency. No DB migrations.

### Phase 3c.1: No DB migrations.

### Phase 3b.10: No DB migrations.

### Phase 3b.9: No DB migrations.

### Phase 3b.8: No DB migrations.

### Phase 3b.7: No DB migrations.

### Phase 3b.6: No DB migrations.

### Phase 3b.5: No DB migrations.

### Phase 3b.4: No DB migrations.

### Phase 3b.3: No DB migrations.

### Phase 0a

**File:** `prisma/migrations/20260510000000_add_copilot_and_audit_log.sql`

**Changes:** Additive only, all columns have defaults, safe to run on live DB.

- `User.hasCopilot Boolean DEFAULT false`
- `CopilotSession` table
- `CopilotMessage` table (with `toolName`, `toolCallId` fields for Phase 2 use)
- `AuditLog` table
- `CopilotMessageRole` enum (`user`, `assistant`, `tool_call`)
- `AuditActor` enum (`copilot`, `user`, `system`)

### Phase 0.5, 1, 1.1, 1.2, 2

No new migrations. All changes are pure TypeScript.

### Phase 2.1

No DB migrations. Bug fix to createLeadRecord behavior only.

### Phase 3a

No DB migrations. New API route + lib files only. No schema changes.

### Phase 3b

No DB migrations. New server actions, API routes, and copilot tool handlers only. No schema changes.

---

## Packages added

| Package             | Version   | Added in | Purpose              |
| ------------------- | --------- | -------- | -------------------- |
| `@anthropic-ai/sdk` | `^0.95.1` | Phase 0b | Anthropic API client |

Run `yarn install` on first deploy to pick up the new package.

---

## Environment variables required

| Variable            | Purpose                               | Where to get value                                              |
| ------------------- | ------------------------------------- | --------------------------------------------------------------- |
| `ANTHROPIC_API_KEY` | Powers all LLM calls (Sonnet + Haiku) | AWX shared key — see Taiseer or create at console.anthropic.com |

The key is already stubbed in `.env.example`. Railway environment must have it set before the copilot UI is accessible to any user.

---

## Rollback plan

1. Revert the PR
2. Run reverse migration:
   ```sql
   DROP TABLE "AuditLog";
   DROP TABLE "CopilotMessage";
   DROP TABLE "CopilotSession";
   ALTER TABLE "User" DROP COLUMN "hasCopilot";
   DROP TYPE "CopilotMessageRole";
   DROP TYPE "AuditActor";
   ```
3. Remove `ANTHROPIC_API_KEY` from Railway environment
4. No existing data is touched — all changes are additive. Rollback is clean.

---

## Coordination flags

1. **`ai_personalities.human_handoff_message`** — column is in `schema.prisma` but was absent from local dev DB during build. Confirm it exists in production before merge.
2. **`User.hasCopilot` seat management** — currently must be flipped manually. Phase 5 adds billing/licensing. Agree on the manual process before enabling any external pilots.
3. **AWX shared Anthropic API key** — rotate the dev key used during testing if it was exposed. Production should use a separate key.

---

## Deferred work

- Phase 3b write tools: shipped (create/update lead, appointment, task — 6 copilot tools total)
- Phase 3 remaining: create_draft_estimate copilot tool
- Phase 5: Billing/seat licensing
- Phase 6: Hardening, audit log viewer UI, cost dashboard
- Mobile integration
