# AI Copilot — Build Changelog

Chronological log of all changes during the AI Copilot feature build.
Most recent at the top. Each phase appends a section.

---

## Fix — create_estimate post-confirm regression

**Date:** 2026-06-01

The copilot re-asked "What materials would you like to add?" after the user had already answered "no" and confirmed the restate — even though the restate showed "Materials: None". Three compounding gaps: (1) the global write workflow's step 5 only prohibited re-running lookup tools, not re-asking the user; (2) the materials gather instruction was a standing imperative with no closure ("answer is final") clause; (3) the toggle section described "Tax: N/A" on labor-only estimates instead of omitting the tax line entirely. Fixed all three in the system prompt — no tool code changed.

---

## Phase 3c.4 — Shop-supplies and tax toggles on create_estimate

**Date:** 2026-05-21

Completes the original create_estimate spec. Both shop supplies and tax can now be toggled per estimate.

- Optional booleans `applyShopSupplies` and `applyTax` added to the `create_estimate` tool input schema. Omitted or `true` applies the company rate; explicit `false` stores the rate as 0 for that estimate (no dollar effect), matching UI toggle behavior.
- System prompt: copilot does NOT ask about toggles during the gather phase. At restate, it shows the totals breakdown with shop-supplies and tax dollar amounts, and asks the user to confirm or adjust. Tax line only appears when the estimate has at least one material. Pre-stated preferences honored silently — shown as "off" in restate, not re-asked.
- Company tax and shop-supplies rates injected into the user-context line so the model can show accurate dollar previews without an extra tool call.
- Math layer unchanged — rate-0 already worked (verified in 3c.3 Test 4). Toggles just route the effective rate (company rate or 0) into the existing computation.

No DB migrations.

---

## Fix — add_materials_to_estimate confirmation loop

**Date:** 2026-05-21

The copilot got stuck in a loop with add_materials_to_estimate — restating and asking for confirmation indefinitely without ever calling the tool. Root cause: the per-tool section had its own "restate and confirm" step on top of the global write workflow's confirm step (two parallel rules), AND nothing stopped the model from re-running get_estimates_for_client on every "yes" turn. Fixed by (1) adding add_materials_to_estimate to the global write workflow's explicit tool list, (2) stripping per-tool confirmation language so only the global workflow governs confirms, and (3) adding a general rule to the global workflow: after the user confirms, call the tool immediately — do not re-run lookup tools.

---

## Phase 3c.3 — Materials on estimates + add-to-existing + line-item reads

**Date:** 2026-05-20
**Branch:** taiseer/ai-copilot

Three connected additions:

**1. Materials nested under services in `create_estimate`**
The existing `create_estimate` tool now accepts an optional `materials` array on each service. Materials are free-text (name, quantity, sellPrice) — `productId` is optional and only needed if resolving from inventory via `get_inventory_item_by_name`. Tax math is now live: `taxAdd = materialSubtotal × (taxRate / 100)` where `materialSubtotal = Σ(sell × qty)` across all services. `material.discount` is a dollar amount that flows into the invoice-level `discount` field (not subtracted from the per-material tax base). All money math stays in `execute()` — the route stores caller totals as before.

Shared math helper extracted to `src/lib/copilot/estimateMath.ts` (`round2`, `MaterialInput`).

**2. New `add_materials_to_estimate` tool**
Adds materials to an existing draft estimate. Uses direct DB write (PATCH route only updates header fields, not items): creates a new `InvoiceItem` (serviceDesc "Materials") + `Material` rows in a single transaction, then updates Invoice totals (`subtotal`, `discount`, `tax`, `serviceFee`, `grandTotal`, `due`) recomputed from all existing items plus the new ones. Only works on `type = "Estimate"` — refuses Invoices with a clear error. New action `estimate.add_materials` added to `CopilotAction` enum and `PERMISSION_MAP` (gated on `estimatesInvoices`, same as `estimate.create`).

Key multi-tenant note: `InvoiceItem` has no `companyId` field (scoped via `invoiceId → Invoice.companyId`); `Material` rows include explicit `companyId: ctx.companyId`.

**3. `get_estimate_by_number` now returns line items**
Extended `include` to return `invoiceItems` with nested `labor` and `materials`. The copilot can now answer "what's on this estimate?" directly from the tool result instead of deflecting to the link. System prompt updated to reflect this.

No DB migrations. No new API routes.

---

## Fix — no markdown tables; Phase 3c.4 toggle spec recorded

**Date:** 2026-05-20
**Branch:** taiseer/ai-copilot

- System prompt: added `FORMATTING` section instructing the copilot not to use markdown tables (unreadable in the narrow ~380px chat panel). Lists of items must be presented as a simple vertical list, one item per line, with markdown links. Section is inserted after `TONE` in `buildSystemPrompt`.
- PHASE_3_PLAN.md: recorded Phase 3c.4 shop-supplies/tax toggle behavior — ask about shop supplies always if unstated; ask about tax only when the estimate includes at least one material line item (tax applies to materials only, so on a labor-only estimate the dollar effect is zero).

No DB migrations. No route or tool code changes.

---

## Fix — estimate route generates numeric IDs for non-UI callers

**Date:** 2026-05-19
**Branch:** taiseer/ai-copilot

POST `/api/estimate/[companyId]/` omitted the Invoice `id` from the `invoice.create` call, so Prisma's `@default(cuid())` fallback fired. The estimate-create UI avoids this by generating a 10-digit numeric ID client-side (`Header.tsx`, `nanoid customAlphabet("1234567890", 10)`) and passing it explicitly — so UI-created estimates had numeric IDs, but server-to-server callers (the copilot, and future mobile) got cuid IDs.

The route now generates a 10-digit numeric ID with the same `customAlphabet("1234567890", 10)` the UI uses, so all callers produce IDs consistent with the existing platform format.

**Scope:** shared platform route (`src/app/api/estimate/[companyId]/route.ts`). No DB migrations. No change to copilot tool.

---

## Fix — create_estimate ID validation

**Date:** 2026-05-18
**Branch:** taiseer/ai-copilot

`create_estimate` failed with an FK violation (`Invoice_customer_id_fkey`) when the model passed a hallucinated `clientId` that did not exist in the DB (the AI passed `57`; the real client ID was `1`, max ID was `23`). The FK constraint correctly rejected the write, but the failure surface was opaque and unrecoverable.

Fix: `execute()` now validates, before any write, that:

1. `clientId` exists for `ctx.companyId` — scoped to the current company, multi-tenant safe.
2. `vehicleId` (if provided) exists, belongs to `clientId`, and belongs to `ctx.companyId`.

Both checks return a clear, model-readable error directing the AI to re-call the lookup tool and use the fresh id — making the failure recoverable without human intervention.

System prompt reinforced in two places:

- **General rule** (§ Finding data before acting): Any ID passed to a write tool must come from a lookup tool's result in the current conversation — never from memory, never fabricated.
- **Estimate-specific rule** (§ Creating an estimate): `clientId` and `vehicleId` must come from the actual return value of `get_client_by_name` / `get_vehicle_by_client` in the same conversation.

No DB migrations. No new API routes.

---

## Phase 3c.2 — create_estimate (services + labor)

**Date:** 2026-05-18
**Branch:** taiseer/ai-copilot

New `create_estimate` copilot tool. Creates a draft estimate for a client with one or more services and labor line items. Services + labor only — materials in 3c.3, supply/tax toggles in 3c.4.

Key design decisions:

- **Totals computed server-side in `execute()`**: The POST /api/estimate/[companyId]/ route stores caller-supplied totals (confirmed in pre-build recon). The tool's execute() computes subtotal = Σ(laborHours × laborRate), fetches Company.tax and Company.serviceFee rates from the DB (never from AI input), computes suppliesFeeAdd = subtotal × (serviceFeeRate/100), grandTotal = subtotal + suppliesFeeAdd. AI supplies NO dollar amounts.
- **taxAdd = 0** for Phase 3c.2: tax applies to materials only; no materials in this phase.
- **tax/serviceFee stored as RATES**: Invoice.tax and Invoice.serviceFee are percentage rates (e.g. 8.5 = 8.5%), not dollar amounts — matching the app's own BillSummary behavior.
- **serviceDesc free-text**: Route accepts serviceDesc string and creates Labor inline — no pre-existing Service record required. AI passes the user's plain-language service name directly.
- **columnId omitted**: Route auto-resolves the "Pending" column for estimates.
- **Duplicate soft guard** in system prompt: before creating, check get_estimates_for_client and ask if an estimate already exists for the same client+vehicle.
- **Estimates only**: System prompt explicitly blocks invoice creation requests and redirects to estimate workflow.
- Permission: `estimate.create` (already in CopilotAction enum, gated on estimatesInvoices).

No DB migrations. No new API routes.

---

## Fix — copilot hyperlink rendering

**Date:** 2026-05-18
**Branch:** taiseer/ai-copilot

Copilot estimate links displayed as plain text. Fixed in two parts: (1) CopilotMessageCard now renders assistant messages through react-markdown, so links (and other markdown — bold, lists) render properly; user messages stay plain text. Links open in a new tab with rel="noopener noreferrer". (2) The system prompt now instructs the model to format links as markdown link syntax rather than bare URLs.

---

## Phase 3c.1 — Complete estimate read tools (links + vehicleId + prompt guidance)

**Date:** 2026-05-18
**Branch:** taiseer/ai-copilot

`get_estimates_for_client` was committed during 3b but had three gaps: no `publicLink`/`editLink`, no `vehicleId` per record, and no system prompt guidance distinguishing it from `get_estimate_by_number`. All three closed:

- Vehicle select extended to include `id` → each item now returns `vehicleId`
- `publicLink` and `editLink` added per item (same pattern as `getEstimateByNumber.ts`)
- System prompt: "Finding data before acting" updated to two bullets (list vs single lookup); new "### Reading estimates and invoices" section added explaining when to use each tool and that every estimate must include its `publicLink` in responses; new GOOD chain example added to the Chaining tools section

No DB changes. No new API routes.

---

## Phase 3b complete (3b.1–3b.10) — branch synced with development

**Date:** 2026-05-18
**Branch:** taiseer/ai-copilot

Phase 3b is fully complete. The branch was synced with `origin/development` (merge commit `8fc90e0e`), incorporating 84 commits from the team including PR #836 (estimate route JWT Bearer auth) and the Meta/Messenger feature. The sync introduced two conflict-resolution artifacts that were fixed locally (AuditLog model brace, orphaned opening-message block in lead-generate).

Sub-phases shipped in 3b:

- **3b.1** — Lead creation route + `create_lead` tool
- **3b.2** — Appointment creation route + `create_appointment` tool
- **3b.3** — Lead update removed; tag management tools (`get_lead_tags`, `add_lead_tag`, `remove_lead_tag`, `create_tag`)
- **3b.4** — Tool execution discipline (system prompt rules against overclaiming)
- **3b.5** — Appointment update tool (`update_appointment`)
- **3b.6** — Task tools (`create_task`, `update_task`)
- **3b.7** — Appointment confirmation template support
- **3b.8** — Client + vehicle creation tools (`create_client`, `create_vehicle_for_client`)
- **3b.9** — Client phone country-code normalization
- **3b.10** — Client disambiguation by phone last-4 + vehicle

Fixes shipped alongside 3b:

- Dynamic current date in system prompt (was missing entirely — model guessed 2025)
- `get_estimates_for_client` read tool (Phase 3c.1, built during 3b)

Infra: `internalApiClient.ts` (JWT mint + internal fetch wrapper), 8 new API routes under `src/app/api/*/company/[companyId]/`. Local DB sync: 5 unapplied migrations applied; 1 new migration file created (messenger columns).

---

## Phase 3b.10 — Client disambiguation

The copilot looked up clients by name only, so it couldn't distinguish multiple people with the same name. `get_client_by_name` now returns all matches (up to 10) with disambiguating detail: `matchCount`, phone last-4 digits, vehicles, and email per match. The system prompt guides the copilot to: use the single match when `matchCount` is 1; list the candidates by phone last-4 and vehicle and ask the user which when `matchCount > 1` (never guess, never act on an ambiguous name); and offer to create a new client when `matchCount` is 0. The user can disambiguate by picking from the list or by giving a phone/email — full phone numbers are never surfaced, only the last 4 digits. No DB changes.

---

## Fix — copilot current-date awareness

**Date:** 2026-05-18
**Branch:** taiseer/ai-copilot
**Commit:** (see git log)

### Bug

The copilot referred to 2025 when the current year is 2026. When asked about dates or scheduling, the model guessed the year from its training data rather than knowing the actual current date.

### Root cause (Type B)

The system prompt included no current-date context at all. `buildSystemPrompt()` in `systemPrompt.ts` assembled the prompt from static sections (identity, scope, tool guide) plus a dynamic user-context line (user name, role, company, timezone) — but never included today's date. The inline comment "Today's date is injected at session start" was aspirational documentation of planned behavior that was never implemented.

### Fix

In `buildSystemPrompt()`, compute the current date dynamically at call time using `new Date().toLocaleDateString("en-US", { weekday, year, month, day, timeZone: tz })` and append it to the `userContext` line. Because `buildSystemPrompt` is called inside the chat request handler (not at module load time), the date is always the actual current date when the session starts. The company's timezone is respected so the date shown matches what the user sees locally.

---

## Phase 3b.9 — Client phone country-code normalization

**Date:** 2026-05-17
**Branch:** taiseer/ai-copilot
**Commit:** (see git log)

### Bug

Copilot-created clients stored bare 10-digit phone numbers (e.g., `"5552225553"`), while UI-created clients store them with the country code (e.g., `"+15552225553"`). The `mobile` column is used for phone search/matching, so inconsistent formats are a data-quality problem.

### Fix

1. `POST /api/client/company/[companyId]` now normalizes the `mobile` number before calling `addCustomer`: a US (or country-unspecified) number without a `"+"` prefix gets `"+1"` prepended. Numbers already starting with `"+"` are left untouched; non-US numbers without a `"+"` are stored as-given rather than mangled. This matches how the web UI's phone widget stores numbers.
2. `create_client` tool description updated to instruct the AI to include a country code when known.

### Not changed

- `normalizePhoneForStorage` is unchanged — it already preserves `"+"` prefixes, so the new route helper (`ensureCountryCode`) composes cleanly with it.
- Historical copilot-created client rows with bare numbers are **not** backfilled — out of scope. New clients get the correct format going forward.

### Verification

- `yarn tsc` clean
- `yarn build` clean
- (Pending: create a client via copilot, confirm the stored mobile has `+1`)

---

## Phase 3b.8 — Client and vehicle creation

**Date:** 2026-05-17
**Branch:** taiseer/ai-copilot
**Commit:** (see git log)

### What's new

The copilot can now create standalone clients and add vehicles to clients.

### Added

- `POST /api/client/company/[companyId]` — wraps the existing `addCustomer` action; Bearer JWT auth, requires at least one contact method (phone or email). Returns 409 if email or mobile already exists.
- `POST /api/vehicle/client/[clientId]` — wraps the existing `addVehicle` action; verifies the client belongs to the caller's company (404 otherwise). Idempotent — returns existing vehicle if same year+make+model already registered.
- `create_client` tool (permission: `client.create`) — creates a standard client. Requires a `get_client_by_name` duplicate check first; after creation, prompts to add a vehicle.
- `create_vehicle_for_client` tool (permission: `vehicle.create`) — adds a vehicle to an existing client; serves both the new-client flow and adding vehicles to existing clients.
- `CopilotAction` enum: added `client.create` and `vehicle.create` (both gated on `salesPipeline` permission, same as `lead.create`).

### Fleet — deliberately out of scope

Fleet clients require a companion `Fleet` record (`fleetName` + `contactName`) created atomically with the client. The copilot does **not** create fleet clients and never sets `isFleet` — doing so without the companion record would corrupt data. `create_client` has no `isFleet` field. Fleet requests are redirected to the main app's Fleet page.

### Not changed

- `addCustomer` and `addVehicle` server actions reused as-is (both already support `forceCompanyId`).

### Verification

- `yarn tsc` clean
- `yarn build` clean
- (Pending: smoke test client + vehicle creation in the copilot UI)

---

## Phase 3b.7 — Appointment confirmation message support

**Date:** 2026-05-18
**Branch:** taiseer/ai-copilot
**Commit:** [see git log]

### What's new

The copilot can now offer to send a client confirmation message when creating an appointment, and let the user choose which template.

### Added

- `get_confirmation_templates` read tool — lists the company's `EmailTemplate` rows of type `Confirmation` (id + name/subject), scoped by `companyId`. Returns an empty-list message if none exist.

### Modified

- `create_appointment` tool — now accepts optional `confirmationEmailTemplateId` (number) and `confirmationEmailTemplateStatus` (boolean), spread into the body passed to `addAppointment` (which already supported them).
- System prompt — after gathering appointment details, the copilot asks whether to send a confirmation; if yes, calls `get_confirmation_templates`, lists templates by name, asks the user to pick one; never sets `confirmationEmailTemplateStatus: true` without a template id; handles the no-templates-exist case gracefully. Reminders not mentioned (already automatic).

### Not changed

- No route, schema, or server action changes — `addAppointment` and the appointment route already accepted these fields.
- Reminder behavior untouched — copilot-created appointments already get 24h/2h reminders via the NestJS scheduler.

### Verification

- `yarn tsc` clean
- `yarn build` clean
- (Pending re-test: create appointment, opt into confirmation, pick template)

---

## Phase 3b.6 — Lead creation: batch field gathering + required contact info

**Date:** 2026-05-18
**Branch:** taiseer/ai-copilot
**Commit:** [see git log]

### Changes

1. **Required contact method.** create_lead now requires at least one of phone or email. Enforced via a Zod refinement on `CreateLeadBodySchema` in the API route — applies to BOTH the copilot and the mobile app. A lead with neither is rejected with HTTP 400 and the message: "At least one contact method is required — provide a phone number or an email address."

2. **Batched field gathering.** The system prompt now instructs the copilot to ask for all required lead fields (name, vehicle, services, source, contact info) in a single message rather than one at a time. One-question-at-a-time is reserved for genuine ambiguity.

### Files modified

- `src/app/api/lead/company/[companyId]/route.ts` (Zod refinement: phone OR email required)
- `src/lib/copilot/systemPrompt.ts` (batched gathering section + reconciled one-at-a-time rule)

### Verification

- `yarn tsc` clean
- `yarn build` clean
- (Pending re-test: create lead — copilot asks all fields at once; lead with no contact info rejected)

---

## Phase 3b.5 — Fix duplicate lead creation

**Date:** 2026-05-18
**Branch:** taiseer/ai-copilot
**Commit:** [see git log]

### Bug

The copilot created duplicate leads when asked to schedule an appointment for a client it had just created. Confirmed via AuditLog: 3 identical lead.create calls for "Scher Chow" (Leads 29/30/31), byte-identical payloads. The appointment code path contains zero lead-creation logic — verified. Root cause was AI tool-selection reasoning: the model called create_lead to "obtain" client info for the appointment instead of calling get_client_by_name. The model even narrated this: "Creating the lead now, and I'll look up Scher's client info right after."

### Fix (three layers)

1. **create_appointment tool description** — now explicitly instructs the AI to obtain clientId via get_client_by_name and never to call create_lead for an appointment.
2. **create_lead tool description** — now explicitly states it is only for brand-new leads, never a lookup, never called repeatedly.
3. **System prompt** — replaced the soft "never create to obtain an ID" rule with a hard rule plus a worked example of the exact Scher Chow anti-pattern.
4. **Idempotency guard (code-level safety net)** — POST /api/lead/company/[companyId] now rejects a near-identical lead (same name + vehicle, same company) created within the last 2 minutes, returning HTTP 409 with an explanatory message. Protects against AI retry loops even if the prompt fix is imperfect.

### Files modified

- `src/lib/copilot/tools/handlers/createAppointmentTool.ts` (description)
- `src/lib/copilot/tools/handlers/createLeadTool.ts` (description)
- `src/lib/copilot/systemPrompt.ts` (hardened rule + worked example)
- `src/app/api/lead/company/[companyId]/route.ts` (idempotency guard)

### Cleanup

- Removed duplicate test leads: IDs 8, 23, 27, 30, 31

### Verification

- `yarn tsc` clean
- `yarn build` clean
- (Pending re-test: create lead → schedule appointment → confirm only ONE lead exists)

---

## Phase 3b.4 — Tool execution discipline

**Date:** 2026-05-16
**Branch:** taiseer/ai-copilot
**Commit:** [see git log]

### Bug fixed

During Phase 3b smoke testing, the copilot sometimes reported write operations as completed without actually calling the corresponding tool:

1. **Test 4e**: said "task created" but never called `create_task` — zero Task rows existed in DB, zero `task.create` audit entries
2. **Test 4j**: said "tag added to lead" but only called `create_tag`, never `add_lead_tag` — tag definition was created but no LeadTags row linked it to Jane's lead

### Root cause

The model was treating the user's request as fulfilled before invoking all required tools. This is a known failure mode for tool-using LLM agents: the model composes a success response based on its intent rather than on what it actually executed.

### Fix

Added three explicit rules to the system prompt under a new "Tool execution discipline" section, inserted after the "Workflow for write operations" section:

1. **Never claim a write succeeded without calling a write tool.** Past-tense success language ("Done", "Created", "Scheduled", etc.) requires the corresponding tool to have been called and returned success in the same turn.

2. **Multi-step requests require ALL tool calls in the chain.** Explicit step-by-step chains for tag application (create_tag alone does NOT apply the tag — add_lead_tag must follow), appointment moves, and task updates.

3. **Final message must match tool returns.** Never fabricate success. Always reflect actual tool results.

### Cleanup

- Removed orphaned "test 10" tag from Tag table (Company 1, Tag ID 3 — created during broken 4j test, never attached to a lead, zero LeadTags references)
- Company 1 tag table restored to 2 pre-existing tags (Test tag, Test2)

### Verification

- ✓ yarn tsc --noEmit clean
- ✓ yarn build clean
- (Pending: re-run 4e and 4j after dev server restart)

### Limitations

Prompt-based mitigation reduces but cannot eliminate AI overclaiming entirely. If real-world usage shows the issue recurring, consider structural enforcement (post-turn audit verification, tool-chain coupling) in a future iteration. Flagged for Phase 5+ review.

---

## Phase 3b.3 — Lead update removed, tag management added, client search fixed

**Date:** 2026-05-16
**Branch:** taiseer/ai-copilot
**Commit:** [see git log]

### Product decisions (owner: Taiseer)

- Copilot does NOT update lead details. Lead field edits are deliberate operations done in the main app UI. The copilot declines with a message directing the user to the lead's page.
- Lead tag management IS allowed (add/remove/create tags). Tags are operational organization, not lead-content edits.
- Tag creation by copilot requires user confirmation (existing restate-and-confirm pattern) and a duplicate-name guard.
- When a client has multiple leads, AI asks which lead by vehicle before acting.

### Removed

- `update_lead` tool — deleted entirely. Copilot now declines lead-field edit requests with a friendly redirect to the main app.

### Added (4 new tools)

| File                   | Tool              | Type                                                                           |
| ---------------------- | ----------------- | ------------------------------------------------------------------------------ |
| `getLeadTagsTool.ts`   | `get_lead_tags`   | read — list all company tags                                                   |
| `addLeadTagTool.ts`    | `add_lead_tag`    | reversible-write — add existing tag to lead                                    |
| `removeLeadTagTool.ts` | `remove_lead_tag` | reversible-write — remove tag from lead                                        |
| `createTagTool.ts`     | `create_tag`      | reversible-write — create new tag (duplicate detection, confirmation required) |

All write tools: ownership verified via `companyId` before any mutation. `LeadTags` queries scope indirectly (leadId + tagId both verified against companyId first).

### Fixed

- **`get_client_by_name` full-name search bug** — previous `OR-of-contains` couldn't match "Jane Phase3bTest" because no single column held the full string. New logic: split searchTerm on whitespace, require each part to match at least one column (AND of ORs). Single-word searches unaffected.
- **`get_client_by_name` now returns leads inline** — each client result includes its associated Lead (id, vehicleInfo, services, source, createdAt). AI no longer needs a separate tool call to get a leadId from a client.

### System prompt changes

- Lead-update decline message and boundary added
- Tag workflow guidance (fuzzy match → close-match confirm → create-new with confirm)
- Multi-lead disambiguation rule: when ambiguous, ask by vehicle
- Updated "Finding data before acting" section: `get_client_by_name` now covers lead IDs, added `get_lead_tags`
- Updated write workflow tool list: removed `update_lead`, added tag tools
- "BAD: calling create_lead just to obtain a leadId — NEVER create to get an ID" rule added

### Test data cleanup

- Deleted 3 duplicate Jane Phase3bTest leads (IDs 19, 20, 21) from prior failed/repeated smoke tests
- Deleted Jane Phase3bTest Client (ID 9) and 3 Vehicle rows (IDs 9, 10, 11)
- Cross-company isolation test data (Lead 18 in Company 3) preserved

### Verification

- ✓ yarn tsc --noEmit clean
- ✓ yarn build clean
- ✓ Multi-tenant lint: all new DB queries scope by companyId (directly or via verified parent record)

---

## Phase 3b.2 — UX hardening: restate-and-confirm before reversible writes

**Date:** 2026-05-15
**Branch:** taiseer/task-calendar
**Commit:** [see git log]

### Problem

Smoke test 4a revealed that the copilot was calling `create_lead` directly when the user's intent seemed clear, without restating what it was about to do or waiting for explicit confirmation. For non-technical shop managers, this means a misheard name or wrong phone number hits the database with no chance to catch it.

### Fix

Replaced the weak 4-line "Write tool guidance" section in `src/lib/copilot/systemPrompt.ts` with a strict 9-step "Workflow for write operations" block enforced for all 6 reversible-write tools: `create_lead`, `update_lead`, `create_appointment`, `update_appointment`, `create_task`, `update_task`.

The new workflow:

1. Gather all required information — ask ONE question at a time if anything is missing
2. For updates, look up the record ID first if not already known
3. **Restate** what is about to happen as a structured summary (`I'm about to create a lead: — Name: ... — Phone: ...`)
4. **Wait** for explicit confirmation ("yes" / "no" / "change [field]") — do NOT call the tool until confirmed
   5–6. Handle "no" and "change" responses with re-confirm before proceeding
5. Only AFTER confirmation, call the tool
6. After success, briefly confirm with the key identifying detail only (no re-summary)
7. On failure, explain in plain language — never retry silently

### Files changed

- `src/lib/copilot/systemPrompt.ts` — replaced 4-line write guidance with 9-step enforced workflow

### Verification

- ✓ yarn tsc --noEmit clean
- ✓ yarn build clean
- Manual smoke test 4a re-run required: send "Add a new lead — Jane Smith, 555-9999" and verify copilot asks for confirmation before calling `create_lead`

---

## Phase 3b.1 — Defensive hardening

**Date:** 2026-05-15
**Branch:** taiseer/ai-copilot
**Commit:** [see git log]

### Fixes

1. **`updateAppointment.ts`**: added `companyId` to the `db.appointment.update` WHERE clause for consistency with `updateLead` and `updateTask`. The `findFirst` ownership check above already prevents cross-tenant updates in practice, but query-level scoping is defense in depth and matches the established pattern.

2. **POST `/api/appointment/company/[companyId]/route.ts`**: added `writeAuditLog` calls on success, validation error, and exception paths. All other Phase 3b write routes audited from the start; this brought the appointment POST route to parity.

### Verification

- ✓ yarn tsc --noEmit clean
- ✓ yarn build clean
- ✓ Grep across all three update actions confirms `companyId` in every update WHERE

---

## Phase 3b — Write tools: leads, appointments, tasks + 6 copilot tools

**Date:** 2026-05-15
**Branch:** taiseer/task-calendar
**Commit:** [see git log]

### Files created

| File                                                      | Purpose                                                                                                                              |
| --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `src/actions/appointment/updateAppointment.ts`            | Server action for partial appointment updates. Force params pattern; handles assignedUsers diff + best-effort reminder rescheduling. |
| `src/actions/task/updateTask.ts`                          | Server action for partial task updates. Force params pattern; handles assignedUsers diff via TaskUser delete+create.                 |
| `src/app/api/lead/company/[companyId]/[id]/route.ts`      | PUT route to update a lead. Bearer JWT auth + companyId cross-check + audit log.                                                     |
| `src/app/api/task/company/[companyId]/[id]/route.ts`      | PUT route to update a task. Bearer JWT auth + companyId cross-check + audit log.                                                     |
| `src/lib/copilot/tools/handlers/createLeadTool.ts`        | Copilot tool: create_lead — calls POST /api/lead/company/{companyId}                                                                 |
| `src/lib/copilot/tools/handlers/updateLeadTool.ts`        | Copilot tool: update_lead — calls PUT /api/lead/company/{companyId}/{id}                                                             |
| `src/lib/copilot/tools/handlers/createAppointmentTool.ts` | Copilot tool: create_appointment — calls POST /api/appointment/company/{companyId}                                                   |
| `src/lib/copilot/tools/handlers/updateAppointmentTool.ts` | Copilot tool: update_appointment — calls PATCH /api/appointment/company/{companyId}/{id}                                             |
| `src/lib/copilot/tools/handlers/createTaskTool.ts`        | Copilot tool: create_task — calls POST /api/task/company/{companyId}                                                                 |
| `src/lib/copilot/tools/handlers/updateTaskTool.ts`        | Copilot tool: update_task — calls PUT /api/task/company/{companyId}/{id}                                                             |

### Files modified

| File                                                        | Change                                                                                                             |
| ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `src/app/api/lead/company/[companyId]/route.ts`             | Added `multipleServices` field to POST schema                                                                      |
| `src/app/api/appointment/company/[companyId]/[id]/route.ts` | Refactored PATCH to call `updateAppointment` action + Bearer JWT auth + audit log; DELETE restores ownership check |
| `src/app/api/appointment/company/[companyId]/route.ts`      | Added Bearer JWT auth gate to POST handler                                                                         |
| `src/app/api/task/company/[companyId]/route.ts`             | Added POST handler (DB-direct, JWT auth, audit log)                                                                |
| `src/lib/copilot/canUserDo.ts`                              | Added `lead.update` to CopilotAction union + PERMISSION_MAP                                                        |
| `src/lib/copilot/tools/index.ts`                            | Added 6 new tool handler imports                                                                                   |
| `src/lib/copilot/systemPrompt.ts`                           | Added write tool guidance section to TOOL_GUIDE                                                                    |

### Architecture decisions in this phase

- All write tools go through internal API routes via `callInternalApi` (Path 1 pattern established in 3a)
- Task POST route is DB-direct (no `createTask` action) — consistent with appointment/estimate pattern; skips Google Calendar + notifications by design for copilot use
- `updateAppointment`/`updateTask` use `as any` cast for Prisma data object: Prisma's union type for nullable FK fields rejects `null` in the spread pattern; Zod has already validated the shape
- write tool guidance added to system prompt to control confirmation behavior

---

## Phase 3a — Foundation: JWT helper + internal API client + reference route

**Date:** 2026-05-15
**Branch:** taiseer/ai-copilot
**Commit:** [see git log]

### Files created

| File                                            | Purpose                                                                                                                                                                                |
| ----------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/lib/mobileAuth.ts`                         | Ported from secure-estimate-routes branch. Exposes `getCompanyIdFromBearer(request): Promise<number \| null>`. Used by all new Phase 3 routes for unified Bearer JWT auth.             |
| `src/lib/copilot/internalApiClient.ts`          | Server-side helper for copilot to call its own internal API routes. Mints a 1-hour JWT via `generateAccessToken`, sends Bearer-authed fetch, returns structured result (never throws). |
| `src/app/api/lead/company/[companyId]/route.ts` | First Phase 3 write route. POST creates a lead. Auth: Bearer JWT + URL companyId cross-check. Template for all other Phase 3 routes.                                                   |

### Files modified

None.

### Architecture decisions in this phase

- Bearer JWT for all internal API routes (overrides Tanvir's original X-Internal-Token spec; cleared with Tanvir 2026-05-14)
- Copilot mints JWT for the acting user via `generateAccessToken(user)` — loads real DB User so JWT payload is accurate
- URL companyId is cross-checked against JWT companyId — 403 on mismatch (multi-tenant isolation)
- `getCompanyIdFromBearer` returns `null` on failure (never throws) — simpler route handlers
- Route response envelope: `{ success: boolean, message: string, data?: any, field?: string }` matching AbuBokorprog's convention
- `sendOpeningSms` is caller-configurable (defaults to `true`); dev testing passes `false` to bypass the `ai_personalities.human_handoff_message` column drift (pre-existing issue)

### Key finding: proxy.ts middleware behavior

All `/api/*` routes not in `PUBLIC_API_ROUTES` go through `proxy.ts` middleware which verifies the Bearer JWT before the request reaches the route handler. On invalid token, middleware returns HTTP 200 with `{status: 401, message: "Invalid or expired access token."}` in the body — this is a pre-existing convention. Valid tokens pass through; route-level `getCompanyIdFromBearer` provides the second layer (companyId cross-check).

### Verification

- ✓ yarn tsc --noEmit clean
- ✓ yarn build clean
- ✓ Test 5a (happy path): POST with valid JWT + correct companyId → HTTP 201, `{leadId, clientId, vehicleId}`, DB rows created, audit log written
- ✓ Test 5b (bad JWT): proxy.ts intercepts invalid token → middleware rejects (HTTP 200 with embedded status 401)
- ✓ Test 5c (wrong company in URL): valid JWT, URL companyId 9999 ≠ JWT companyId 1 → HTTP 403 Forbidden (multi-tenant isolation enforced)
- ✓ Test 5d (invalid body): missing required fields → HTTP 400 with field name in response
- ✓ Test 5e (internalApiClient end-to-end): script mints JWT, calls route via fetch → `{ok: true, status: 201, data: {leadId: 9, ...}}`

### Audit log row from test 5a

action: `lead.create`, actor: `api`, success: `true`, latencyMs: populated, PII redacted (clientPhone, clientEmail → `[REDACTED]`)

### Notes

- `src/lib/mobileAuth.ts` will conflict trivially with the same file on `taiseer/secure-estimate-routes` when both PRs merge — files are identical, resolves with theirs or ours.
- `/api/task/*` routes still lack JWT auth (pre-existing). Flagged in REVIEWER_GUIDE for separate security pass.

---

## Phase 2.1 — Bug fixes from team coordination

**Date:** 2026-05-12
**Branch:** taiseer/ai-copilot
**Commit:** 78500b9a

### Bugs fixed

1. **Missing systemCall: true on Twilio/Infobip send calls** inside createLeadRecord. AbuBokorprog (parallel refactor of the same route on origin/development) confirmed this flag is required when no session user is present (webhook flow), otherwise the SMS helper throws an auth error. Our Phase 0a refactor silently broke AI opening SMS delivery from webhook-created leads.
2. **Dropped isCRM zapierToken branch** for automation triggers. AbuBokorprog confirmed CRM mode IS in production use by external websites. Our Phase 0a refactor uniformly used companyWithUser, silently breaking automation triggers for CRM-mode leads.

### Files modified

| File                                 | Change                                                                                                                          |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------- |
| `src/lib/leads/createLeadRecord.ts`  | Added systemCall: true to Twilio/Infobip calls; added zapierToken option to CreateLeadOptions; conditional token logic restored |
| `src/app/api/lead-generate/route.ts` | Passes zapierToken through to createLeadRecord                                                                                  |

### Discovery context

These bugs slipped past Phase 0a smoke testing because:

- The local dev DB had a separate schema drift (ai_personalities.human_handoff_message) causing the SMS path to fail for a different reason, masking the missing systemCall bug
- CRM mode is not enabled on any company in the dev DB, so the automation-token branch was never exercised

Caught by coordination with @AbuBokorprog who did a parallel refactor of /api/lead-generate on origin/development and tested both paths.

### Verification

- ✓ yarn tsc --noEmit — 0 errors
- ✓ yarn build — clean (63s)
- Manual: in-platform thunderbolt lead creation still works (non-CRM path, uses companyWithUser via the default branch)
- Note: full CRM-path verification requires a company with isCRMEnabled=true in the DB; not testable locally

---

## Phase 2 — Read-only tools + dispatcher

**Date:** 2026-05-11
**Branch:** taiseer/ai-copilot

### What was built

8 read-only tools that allow the copilot to query live AutoWorx data: revenue summary, payments summary, client search, vehicle lookup, inventory search, estimate lookup, appointments, and tasks. A central tool registry, a permission-checking dispatcher, and SSE events for tool call visibility in the UI.

### Files created

| File                                                            | Purpose                                                                 |
| --------------------------------------------------------------- | ----------------------------------------------------------------------- |
| `src/lib/copilot/tools/registry.ts`                             | ToolDefinition type, registerTool, getTool, allTools, toolsForAnthropic |
| `src/lib/copilot/tools/dispatcher.ts`                           | executeTool — permission → Zod validate → execute → audit               |
| `src/lib/copilot/tools/index.ts`                                | Barrel: imports all handlers (side-effect registration) + re-exports    |
| `src/lib/copilot/tools/handlers/getRevenueSummary.ts`           | Invoice grandTotal + Material cost aggregation                          |
| `src/lib/copilot/tools/handlers/getPaymentsSummary.ts`          | Payment.amount grouped by type                                          |
| `src/lib/copilot/tools/handlers/getClientByName.ts`             | ILIKE search on firstName/lastName/email, top 5                         |
| `src/lib/copilot/tools/handlers/getVehicleByClient.ts`          | Vehicle.findMany scoped to clientId + companyId                         |
| `src/lib/copilot/tools/handlers/getInventoryItemByName.ts`      | InventoryProduct ILIKE search, optional type filter                     |
| `src/lib/copilot/tools/handlers/getEstimateByNumber.ts`         | Invoice.findFirst by id+companyId, returns links                        |
| `src/lib/copilot/tools/handlers/getAppointmentsForDateRange.ts` | Appointment.findMany with date range + optional userId                  |
| `src/lib/copilot/tools/handlers/getTasksForUser.ts`             | Task.findMany; non-admin forced to own userId                           |
| `src/components/copilot/CopilotToolPills.tsx`                   | Animated pill indicators for active tool calls                          |

### Files modified

| File                                            | Change                                                                                                                                               |
| ----------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/app/api/copilot/chat/route.ts`             | Multi-turn tool-use loop (max 5); SSE tool_call_start/tool_result events; persist tool_call CopilotMessage rows; select employeeType for ToolContext |
| `src/lib/copilot/systemPrompt.ts`               | Added TOOL_GUIDE section + prompt injection warning in SECURITY                                                                                      |
| `src/stores/copilotStore.ts`                    | Added activeToolCalls state + addToolCall/resolveToolCall actions                                                                                    |
| `src/components/copilot/CopilotPanel.tsx`       | Handle tool_call_start/tool_result SSE events; pass activeToolCalls to MessageList                                                                   |
| `src/components/copilot/CopilotMessageList.tsx` | Accept and render CopilotToolPills when tool calls are active                                                                                        |

### Key design decisions

- **Side-effect registration pattern**: each handler file calls `registerTool()` at module load time; `tools/index.ts` imports them all so one `import` from the route wires everything up.
- **No new server actions**: all handlers query `db.*` directly within the copilot tool boundary (companyId always from session context).
- **ToolResultBlockParam.is_error**: set correctly on Anthropic's tool_result so the model knows when a tool failed and can tell the user gracefully.
- **Non-admin task enforcement**: `getTasksForUser` ignores AI-provided `assignedUserId` for non-Admin users — always uses session `userId`. Prevents data leakage.
- **Priority enum note**: Prisma's Priority enum has Low/Medium/High (no Urgent). TOOL_REGISTRY.md spec listed Urgent; not added to avoid schema change. Handler returns the actual enum values.
- **Task "completed" heuristic**: Task model has no boolean completed field. Handler uses `date < now` as a proxy. This is approximate; flagged for team awareness.

### Verification

- ✓ `yarn tsc --noEmit` — 0 errors
- ✓ `yarn build` — clean (110s)

---

## Phase 1.2 — Cost tuning

**Date:** 2026-05-11
**Branch:** taiseer/ai-copilot

### Changes

1. **Prompt caching already active (Option B confirmed).** The system prompt was already passed as a content block array with `cache_control: { type: "ephemeral" }` since Phase 1. The system prompt is fully deterministic per user/session context (no timestamps, no per-call randomness) — cache hits fire correctly within the 5-minute TTL window. No format change needed.

2. **Cache token capture wired up.** `finalMessage.usage.cache_read_input_tokens` is now read and persisted as `cachedTokens` on every `CopilotMessage` assistant row. `cache_creation_input_tokens` is logged to console in non-production environments for debugging. The `cachedTokens` field existed in the Prisma schema since Phase 0a but was never populated.

3. **max_tokens already 1024.** Already set correctly in Phase 1 — no change needed. The spec referenced 4096 but the implementation already used 1024.

### Cost impact

- System prompt ≈ 500–700 tokens. At `$3/M` uncached vs `$0.30/M` cached (90% off), that's ~`$0.0002` saved per turn after the first. For a heavy user (20 exchanges/day), caching saves ~`$0.004/day`.
- `max_tokens: 1024` caps worst-case output at `1024 × $15/M = $0.015` per response vs `4096 × $15/M = $0.06`.
- Verified: message 1 `cachedTokens = 0` (cache write), message 2 `cachedTokens > 0` (cache hit). Actual numbers visible in Prisma Studio → CopilotMessage → cachedTokens column, and in server console: `[copilot] tokens — in:X out:Y cached:Z cacheWrite:W`.

### Files modified

| File                                | Change                                                                                                                          |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `src/app/api/copilot/chat/route.ts` | Extract `cache_read_input_tokens` → `cachedTokens`; log `cache_creation_input_tokens`; persist `cachedTokens` on CopilotMessage |

### Verification

- ✓ `yarn tsc --noEmit` — 0 errors
- ✓ `yarn build` — clean (68s)
- ✓ Cache test — message 1 cachedTokens = 0 (write), message 2 cachedTokens > 0 (read)
- ✓ max_tokens = 1024 confirmed in chat route

---

## Phase 1.1 — Bug fixes from smoke testing

**Date:** 2026-05-11
**Branch:** taiseer/ai-copilot

### Bugs fixed

1. **Token streaming was buffering full response.** Root cause: React 18 automatic batching merges all `appendToken()` calls inside the `while` SSE-read loop into a single re-render, so the full assistant response appeared at once rather than token-by-token. Fix: wrapped each `appendToken` call with `flushSync(() => appendToken(event.text))` in `CopilotPanel.tsx`. Tokens now stream character-by-character as expected.

2. **Session summarization never fired on Sheet close.** Root cause: In Next.js 16, dynamic route `params` are Promises and must be awaited. Both `sessions/[id]/route.ts` and `sessions/[id]/close/route.ts` accessed `params` synchronously (`{ params }: { params: { id: string } }`), so `id` was a Promise object, not a string. Every `db.findFirst` silently failed to match any session (returning null), the close endpoint returned 404 on every call, and `generateSessionSummary` never ran. Fix: updated both routes to use `props: { params: Promise<{ id: string }> }` and `await props.params`. Also removed the `messageCount > 0` guard in the close endpoint (replaced by the existing `messages.length === 0` check inside `generateSessionSummary`). Sessions now receive 2-3 sentence summaries on panel close.

3. **AuditLog latencyMs was null.** Root cause: `startTime` was never captured at the top of the `POST /api/copilot/chat` handler, and `writeAuditLog` was called without a `latencyMs` argument. Fix: added `const startTime = Date.now()` at handler entry and `latencyMs: Date.now() - startTime` to the `writeAuditLog` call inside the stream's `start` callback. AuditLog rows now record end-to-end latency for every chat message.

### Files modified

| File                                               | Change                                                                                 |
| -------------------------------------------------- | -------------------------------------------------------------------------------------- |
| `src/components/copilot/CopilotPanel.tsx`          | Import `flushSync`; wrap `appendToken` call with `flushSync`                           |
| `src/app/api/copilot/sessions/[id]/route.ts`       | Async params (`await props.params`); remove sync destructuring                         |
| `src/app/api/copilot/sessions/[id]/close/route.ts` | Async params; remove `messageCount > 0` guard                                          |
| `src/app/api/copilot/chat/route.ts`                | Add `const startTime = Date.now()` at handler entry; add `latencyMs` to audit log call |

### Verification

- ✓ `yarn tsc --noEmit` — 0 errors
- ✓ `yarn build` — clean (130s)
- ✓ Streaming test — tokens appear progressively
- ✓ Summary test — summary populated after Sheet close
- ✓ Memory test — new chat references prior session
- ✓ Latency test — AuditLog rows show valid latencyMs

---

## Phase 1 — Chat UI, SSE Streaming, Session Persistence, Cross-Conversation Memory

**Date:** 2026-05-11
**Branch:** taiseer/ai-copilot

### Files created

| File                                                  | Purpose                                                                                 |
| ----------------------------------------------------- | --------------------------------------------------------------------------------------- |
| `src/lib/copilot/rateLimit.ts`                        | In-memory fixed-window rate limiter (60/hr soft warn, 120/hr hard 429)                  |
| `src/lib/copilot/systemPrompt.ts`                     | `buildSystemPrompt()` — identity, tone, scope, security, user context, memory injection |
| `src/lib/copilot/generateSessionSummary.ts`           | `generateSessionSummary(sessionId)` — Haiku 4.5, 200 tokens, never throws               |
| `src/app/api/copilot/chat/route.ts`                   | POST SSE streaming chat endpoint                                                        |
| `src/app/api/copilot/sessions/route.ts`               | GET last 20 sessions list                                                               |
| `src/app/api/copilot/sessions/[id]/route.ts`          | GET single session + messages                                                           |
| `src/app/api/copilot/sessions/[id]/close/route.ts`    | POST — triggers session summary generation                                              |
| `src/stores/copilotStore.ts`                          | Zustand store: isOpen, sessionId, messages, isStreaming                                 |
| `src/components/copilot/CopilotIcon.tsx`              | Header icon, gated on `hasCopilot`, Bot icon                                            |
| `src/components/copilot/CopilotPanel.tsx`             | Sheet slide-over orchestrator + SSE streaming consumer                                  |
| `src/components/copilot/CopilotChatHeader.tsx`        | Title, new chat, history toggle, close                                                  |
| `src/components/copilot/CopilotMessageList.tsx`       | Scrollable message list, auto-scroll                                                    |
| `src/components/copilot/CopilotMessageCard.tsx`       | User (right, #006D77) / assistant (left, white) bubbles                                 |
| `src/components/copilot/CopilotChatInput.tsx`         | Textarea, send button, Cmd/Ctrl+Enter to send                                           |
| `src/components/copilot/CopilotConversationList.tsx`  | Past sessions dropdown, fetches /api/copilot/sessions                                   |
| `src/components/copilot/CopilotThinkingIndicator.tsx` | Three-dot bounce animation while streaming                                              |

### Files modified

| File                                | Change                                                             |
| ----------------------------------- | ------------------------------------------------------------------ |
| `src/authOptions.ts`                | Added `hasCopilot` to JWT refresh DB select, token, and session    |
| `src/components/TopNavbarIcons.tsx` | Added `<CopilotIcon />` between BugReport and NotificationsPopover |

### Key design decisions

- `hasCopilot` added to the NextAuth JWT refresh path (not login path) — populates on every token rotation. Session type declaration extended in `authOptions.ts`.
- Rate limiter is in-memory Map — safe for Railway single-replica. Redis upgrade needed for multi-replica.
- SSE event types: `text_delta`, `done` (carries `sessionId` + optional `warning`), `error`.
- Cross-conversation memory: prior session summaries (last 5, summary IS NOT NULL) injected into system prompt. Summary generated synchronously on panel close (POST /close). Lazy fallback: if session >30min old and summary is null when next message arrives, summary is generated before streaming.
- Prompt caching: system prompt has `cache_control: { type: "ephemeral" }` — saves tokens on repeated turns within a session.
- `CopilotPanel` renders both `<Sheet>` and the streaming consumer — `CopilotIcon` triggers `setOpen(true)` via Zustand (controlled), not `SheetTrigger`.

### Tests performed

- ✓ `yarn tsc --noEmit` — 0 errors
- ✓ `yarn build` — clean (94s)

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
- `react-easy-crop` is in `package.json` (line 128) and `ImageCropModal.tsx` imports it — this is a pre-existing dep, not related to our changes (earlier note incorrectly said it was missing)
- dev company "THC Local" zapierToken was exposed during testing — rotate when convenient
