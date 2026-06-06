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
- [x] Architecture decision confirmed for Phase 3 write tools — **Decided: Bearer-safe API routes, same pattern as mobile API. Implemented across all 17 routes.**
- [ ] Confirm `prisma/migrations/20260515000000_add_messenger_columns.sql` is the intended fix for schema/DB divergence from PR #830
- [ ] Flip `User.hasCopilot = true` for designated pilot users

---

## Migrations included

### Fix — create_client return shape: No DB migrations. **createClientTool return shape changed** — no longer passes through the raw API body. Now returns flat `{ clientId, firstName, lastName, wasCreated, message }` at `data.*`, consistent with every other write tool. The create_client INPUT contract is unchanged.

### Phase 3g: No DB migrations. New tools: `getProfitAnalysis.ts` (groupBy client/service/material), `getMaterialUsage.ts` (groupBy material/vendor), `getServicePerformance.ts` (InvoiceItem → delivered invoice join), `getClockReport.ts` (ClockInOut.companyId direct scope, ClockBreak deduction). All registered in `tools/index.ts`.

### Phase 3f: No DB migrations. Extended: `getRevenueSummary.ts` (profit, client/vehicle filter), `getPaymentsSummary.ts` (card filter, method/card-type breakdown), `getTeamSummary.ts` (hours, redos). New: `getWorkOrderSummary.ts`, `getTaskSummary.ts`, `getAppointmentSummary.ts`, `getClientStats.ts`. All registered in `tools/index.ts`.

### Phase 3e: No DB migrations. Fixed `getRevenueSummary.ts` (deliveredAt + column filter) and `getPaymentsSummary.ts` (Payment.date + outstanding). New tools: `getInventorySummary.ts`, `getTeamSummary.ts`, `getLeadSummary.ts`. All registered in `tools/index.ts`. System prompt: "Reporting and analytics" section added.

### Phase 3d: No DB migrations. Two new API routes under `/api/work-order/[companyId]/[invoiceId]/` (PATCH and POST .../assign/). New copilot tools: `getTeamMembers.ts`, `createWorkOrderTool.ts`, `assignTechnicianTool.ts`. New CopilotAction values: `team.read`, `workorder.create`, `workorder.assign`. Service catalog records may be auto-created from `InvoiceItem.serviceDesc` during technician assignment — this is expected behavior.

### Phase 3c.6 fixes — vendor + WAC: No DB migrations. New route: `POST /api/vendor/[companyId]/`. New copilot tools: `getVendorByName.ts`, `createVendorTool.ts`. `vendor.create` added to `CopilotAction` + `PERMISSION_MAP`. Replenish route: weighted average cost replaces overwrite. System prompt: inventory section expanded with vendor guidance + WAC note.

### Phase 3c.6: No DB migrations. Two new API routes under `/api/inventory/[companyId]/` (products POST, replenish POST). New copilot tools: `createInventoryProductTool.ts`, `replenishInventoryTool.ts`. Both registered in `tools/index.ts`. System prompt: "Managing inventory" section added.

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

| Package             | Version   | Added in      | Purpose                                        |
| ------------------- | --------- | ------------- | ---------------------------------------------- |
| `@anthropic-ai/sdk` | `^0.95.1` | Phase 0b      | Anthropic API client — all LLM calls           |
| `react-markdown`    | `^10.1.0` | Hyperlink fix | Renders copilot assistant messages as markdown |

`nanoid` (`^5.0.6`) was already in `package.json`; the estimate route now uses it for numeric Invoice IDs.

Run `yarn install` on first deploy to pick up new packages.

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

## Bearer-safe API routes added by this branch

| Route                                             | Method   | Purpose                                       |
| ------------------------------------------------- | -------- | --------------------------------------------- |
| `/api/lead/company/[companyId]/`                  | POST     | Create lead                                   |
| `/api/lead/company/[companyId]/[id]/`             | PATCH    | Update lead column                            |
| `/api/pipeline/sales/leads/`                      | POST     | Create lead (pipeline path)                   |
| `/api/pipeline/sales/leads/[id]/column/`          | PATCH    | Move lead column                              |
| `/api/appointment/company/[companyId]/`           | POST     | Create appointment                            |
| `/api/appointment/company/[companyId]/[id]/`      | PATCH    | Update appointment                            |
| `/api/task/company/[companyId]/`                  | POST     | Create task                                   |
| `/api/task/company/[companyId]/[id]/`             | PATCH    | Update task                                   |
| `/api/client/company/[companyId]/`                | POST     | Create client                                 |
| `/api/vehicle/client/[clientId]/`                 | POST     | Create vehicle                                |
| `/api/invoice/company/[companyId]/`               | POST     | Create invoice (mobile)                       |
| `/api/estimate/[companyId]/`                      | POST+GET | Create/list estimates — **modified existing** |
| `/api/inventory/[companyId]/products/`            | POST     | Create InventoryProduct                       |
| `/api/inventory/[companyId]/replenish/`           | POST     | Replenish stock                               |
| `/api/vendor/[companyId]/`                        | POST     | Create vendor                                 |
| `/api/work-order/[companyId]/[invoiceId]/`        | PATCH    | Convert invoice to work order                 |
| `/api/work-order/[companyId]/[invoiceId]/assign/` | POST     | Assign technician to service                  |

---

## Deferred / out of scope

- Estimate→invoice conversion via copilot — `convertInvoice` uses `getServerSession`, not Bearer-safe
- Full per-service Technician assignment with pre-populated Service catalog — Phase 3d uses auto-create from `InvoiceItem.serviceDesc`
- Gift card reporting — data queryable but no dedicated copilot tool built
- Coupon analytics — data queryable but no dedicated copilot tool built
- Task completion status — `Task` model has no `completed` boolean; `get_task_summary` uses `date < today` as overdue proxy
- Phase 5: Billing/seat licensing (`User.hasCopilot` must be flipped manually for now)
- Phase 6: Audit log viewer UI, cost tracking dashboard, context trimming for long sessions
- Mobile integration
