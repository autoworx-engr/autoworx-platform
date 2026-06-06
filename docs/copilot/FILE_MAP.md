# Copilot — File Map

Complete inventory of every file created or modified by this branch. Current as of Phase 3g.

---

## Tool Handlers (`src/lib/copilot/tools/handlers/`)

41 handler files. Each calls `registerTool()` as a side effect on module load.

### Read / Search (11)

| File                              | Tool name                       |
| --------------------------------- | ------------------------------- |
| `getClientByName.ts`              | get_client_by_name              |
| `getVehicleByClient.ts`           | get_vehicle_by_client           |
| `getEstimatesForClient.ts`        | get_estimates_for_client        |
| `getEstimateByNumber.ts`          | get_estimate_by_number          |
| `getAppointmentsForDateRange.ts`  | get_appointments_for_date_range |
| `getTasksForUser.ts`              | get_tasks_for_user              |
| `getLeadTagsTool.ts`              | get_lead_tags                   |
| `getConfirmationTemplatesTool.ts` | get_confirmation_templates      |
| `getInventoryItemByName.ts`       | get_inventory_item_by_name      |
| `getVendorByName.ts`              | get_vendor_by_name              |
| `getTeamMembers.ts`               | get_team_members                |

### Write (17)

| File                            | Tool name                 |
| ------------------------------- | ------------------------- |
| `createLeadTool.ts`             | create_lead               |
| `createAppointmentTool.ts`      | create_appointment        |
| `updateAppointmentTool.ts`      | update_appointment        |
| `createTaskTool.ts`             | create_task               |
| `updateTaskTool.ts`             | update_task               |
| `createClientTool.ts`           | create_client             |
| `createVehicleForClientTool.ts` | create_vehicle_for_client |
| `createEstimateTool.ts`         | create_estimate           |
| `addMaterialsToEstimateTool.ts` | add_materials_to_estimate |
| `addLeadTagTool.ts`             | add_lead_tag              |
| `removeLeadTagTool.ts`          | remove_lead_tag           |
| `createTagTool.ts`              | create_tag                |
| `createInventoryProductTool.ts` | create_inventory_product  |
| `replenishInventoryTool.ts`     | replenish_inventory       |
| `createVendorTool.ts`           | create_vendor             |
| `createWorkOrderTool.ts`        | create_work_order         |
| `assignTechnicianTool.ts`       | assign_technician         |

### Analytics / Reporting (13)

| File                       | Tool name               |
| -------------------------- | ----------------------- |
| `getRevenueSummary.ts`     | get_revenue_summary     |
| `getPaymentsSummary.ts`    | get_payments_summary    |
| `getInventorySummary.ts`   | get_inventory_summary   |
| `getTeamSummary.ts`        | get_team_summary        |
| `getLeadSummary.ts`        | get_lead_summary        |
| `getWorkOrderSummary.ts`   | get_work_order_summary  |
| `getTaskSummary.ts`        | get_task_summary        |
| `getAppointmentSummary.ts` | get_appointment_summary |
| `getClientStats.ts`        | get_client_stats        |
| `getProfitAnalysis.ts`     | get_profit_analysis     |
| `getMaterialUsage.ts`      | get_material_usage      |
| `getServicePerformance.ts` | get_service_performance |
| `getClockReport.ts`        | get_clock_report        |

---

## Tool Infrastructure (`src/lib/copilot/`)

| File                        | Purpose                                                                                       |
| --------------------------- | --------------------------------------------------------------------------------------------- |
| `tools/index.ts`            | Barrel — imports all 41 handlers as side effects; exports registry helpers                    |
| `tools/registry.ts`         | `ToolDefinition` type, in-memory registry Map, `toolsForAnthropic()`, `getTool()`             |
| `tools/dispatcher.ts`       | `executeTool()` — permission check → Zod validate → execute → audit log                       |
| `systemPrompt.ts`           | `buildSystemPrompt(ctx)` — constructs full system prompt with user context, memory, all rules |
| `internalApiClient.ts`      | `callInternalApi()` — mints Bearer JWT, makes server-side HTTP calls to API routes            |
| `canUserDo.ts`              | `CopilotAction` union type, `PERMISSION_MAP`, `canUserDo()` helper                            |
| `estimateMath.ts`           | `round2()` and money math helpers shared by estimate tools                                    |
| `audit.ts`                  | `writeAuditLog()` — never throws; always logs tool call + result to AuditLog                  |
| `generateSessionSummary.ts` | Haiku-based session summarizer — called on session close                                      |
| `rateLimit.ts`              | In-memory fixed-window rate limiter                                                           |
| `normalizeActionResult.ts`  | Normalizes legacy `{success, message}` server action results                                  |

---

## Copilot API Routes (`src/app/api/copilot/`)

| Path                           | Purpose                                                                    |
| ------------------------------ | -------------------------------------------------------------------------- |
| `chat/route.ts`                | POST — main chat endpoint; SSE streaming; calls Anthropic SDK + dispatcher |
| `sessions/route.ts`            | GET — list last 20 sessions for current user                               |
| `sessions/[id]/route.ts`       | GET — session detail + messages                                            |
| `sessions/[id]/close/route.ts` | POST — closes session and triggers Haiku summarization                     |

---

## Bearer-safe API Routes (added/modified by this branch)

### New routes

| Path                                                             | Method | Purpose                     |
| ---------------------------------------------------------------- | ------ | --------------------------- |
| `src/app/api/lead/company/[companyId]/route.ts`                  | POST   | Create lead                 |
| `src/app/api/lead/company/[companyId]/[id]/route.ts`             | PATCH  | Update lead column          |
| `src/app/api/pipeline/sales/leads/route.ts`                      | POST   | Create lead (pipeline path) |
| `src/app/api/pipeline/sales/leads/[id]/column/route.ts`          | PATCH  | Move lead column            |
| `src/app/api/appointment/company/[companyId]/route.ts`           | POST   | Create appointment          |
| `src/app/api/appointment/company/[companyId]/[id]/route.ts`      | PATCH  | Update appointment          |
| `src/app/api/task/company/[companyId]/route.ts`                  | POST   | Create task (DB-direct)     |
| `src/app/api/task/company/[companyId]/[id]/route.ts`             | PATCH  | Update task                 |
| `src/app/api/client/company/[companyId]/route.ts`                | POST   | Create client               |
| `src/app/api/vehicle/client/[clientId]/route.ts`                 | POST   | Create vehicle for client   |
| `src/app/api/invoice/company/[companyId]/route.ts`               | POST   | Create invoice (mobile)     |
| `src/app/api/inventory/[companyId]/products/route.ts`            | POST   | Create InventoryProduct     |
| `src/app/api/inventory/[companyId]/replenish/route.ts`           | POST   | Replenish stock             |
| `src/app/api/vendor/[companyId]/route.ts`                        | POST   | Create vendor               |
| `src/app/api/work-order/[companyId]/[invoiceId]/route.ts`        | PATCH  | Convert to work order       |
| `src/app/api/work-order/[companyId]/[invoiceId]/assign/route.ts` | POST   | Assign technician           |

### Modified existing routes

| Path                                        | Change                                                                         |
| ------------------------------------------- | ------------------------------------------------------------------------------ |
| `src/app/api/estimate/[companyId]/route.ts` | POST added; added numeric ID generation via `customAlphabet("1234567890", 10)` |

---

## UI Components (`src/components/copilot/`)

All new files — no existing components modified.

| File                           | Purpose                                                                |
| ------------------------------ | ---------------------------------------------------------------------- |
| `CopilotIcon.tsx`              | Header icon, `hasCopilot` gate                                         |
| `CopilotPanel.tsx`             | Sheet slide-over + SSE consumer orchestrator                           |
| `CopilotChatHeader.tsx`        | Panel header (session title + controls)                                |
| `CopilotMessageList.tsx`       | Scrollable message list                                                |
| `CopilotMessageCard.tsx`       | Single message bubble — assistant messages rendered via react-markdown |
| `CopilotChatInput.tsx`         | Textarea + send button                                                 |
| `CopilotConversationList.tsx`  | History session list                                                   |
| `CopilotThinkingIndicator.tsx` | Streaming dots indicator                                               |
| `CopilotToolPills.tsx`         | Animated tool-call status pills (shown while tool runs)                |

---

## Other Modified Platform Files

| File                                         | Change                                                               |
| -------------------------------------------- | -------------------------------------------------------------------- |
| `src/components/TopNavbarIcons.tsx`          | Added `<CopilotIcon />` between Bug Report and Notifications icons   |
| `src/authOptions.ts`                         | Added `hasCopilot` to DB select, JWT token, and session              |
| `src/actions/lead/createLeadFromForm.ts`     | Calls `createLead` directly instead of HTTP self-proxy               |
| `src/actions/appointment/addAppointment.ts`  | Replaced inline draft-estimate logic with `createDraftEstimate` call |
| `src/actions/appointment/editAppointment.ts` | Same refactor; fixes missing `columnId` on estimate creation         |
| `src/app/api/lead-generate/route.ts`         | Refactored 283 → 136 lines; behavioral equivalence tested            |

---

## State / Store

| File                         | Purpose                                                   |
| ---------------------------- | --------------------------------------------------------- |
| `src/stores/copilotStore.ts` | Zustand: `isOpen`, `sessionId`, `messages`, `isStreaming` |
| `src/lib/mobileAuth.ts`      | `getCompanyIdFromBearer()`, shared with mobile API routes |

---

## DB Migration

| File                                                             | Purpose                                                                               |
| ---------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| `prisma/migrations/20260510000000_add_copilot_and_audit_log.sql` | Adds `User.hasCopilot`, `CopilotSession`, `CopilotMessage`, `AuditLog` tables + enums |
| `prisma/migrations/20260515000000_add_messenger_columns.sql`     | **Authored by this branch** — bridges schema/DB divergence from prior PR              |

---

## Documentation (`docs/copilot/`)

| File                           | Status                                            |
| ------------------------------ | ------------------------------------------------- |
| `REVIEWER_GUIDE.md`            | Current through Phase 3g                          |
| `TOOL_REGISTRY.md`             | Current through Phase 3g (41 tools)               |
| `FILE_MAP.md`                  | This file — current through Phase 3g              |
| `CHANGELOG.md`                 | Current through Phase 3g                          |
| `MERGE_NOTES.md`               | Current through Phase 3g                          |
| `ARCHITECTURE.md`              | Current through Phase 2 (infrastructure design)   |
| `BUILD_PHASES.md`              | Phase plan (historical)                           |
| `BUILD_STATUS_FOR_DEV_TEAM.md` | Status snapshot — see CHANGELOG for current state |
| `PHASE_3_PLAN.md`              | Phase 3 design plan (historical)                  |
| `PRISMA_SCHEMA.md`             | Schema reference (may be stale)                   |
| `RECON_REPORT.md`              | Pre-build recon (historical)                      |
