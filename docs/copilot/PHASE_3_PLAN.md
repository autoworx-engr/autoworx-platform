# Phase 3 Plan — Write Tools via API Wrappers

**Decision locked (Tanvir + AbuBokorprog, May 13 2026):**

- Path 1: thin REST API wrappers
- All write operations wrapped (not just mobile-first)
- Auth: JWT Bearer for all routes — copilot mints a JWT via `generateAccessToken`, calls internal routes with `Authorization: Bearer <token>`, routes verify via `jwtVerifyToken`
- Route convention: `src/app/api/[resource]/company/[companyId]/route.ts` matching AbuBokorprog's pattern
- Response envelope: `{ success: boolean, message: string, data?: any }`
- Swagger JSDoc required on every route
- Server actions called with `forceCompanyId` + `forceUserId` parameters

**Template route:** `src/app/api/appointment/company/[companyId]/route.ts` (AbuBokorprog)

---

## BLOCKER — Schema fix required before Phase 3 implementation

Tanvir's merge commit (`3f8ccca0`) introduced an inconsistency in `prisma/schema.prisma`:
`EmergencyBookingRequest` is referenced as a relation on Company, User, and ShopBooking
models but the model definition itself is missing from the merged schema.

**Effect:** `yarn prisma generate` fails → Prisma client is stale → `yarn tsc --noEmit` fails
on all copilot code.

**Fix:** Add the `EmergencyBookingRequest` model definition from `origin/development` (it
exists there at schema line 3466). The model definition must be inserted into our schema
before the AuditLog model.

**Who fixes it:** Taiseer, before Phase 3 implementation begins. One option is a targeted
pull of just the schema from development: `git checkout origin/development -- prisma/schema.prisma`
then re-add our copilot models on top. Confirm this approach with Tanvir before touching the
schema.

---

## Auth infrastructure (how the copilot calls write routes)

**`generateAccessToken`** — `src/lib/tokenGenerator.ts:10`

```ts
export function generateAccessToken(user: TPayload) {
  return jwt.sign(
    {
      id,
      firstName,
      lastName,
      email,
      companyId,
      role,
      isSuperAdmin,
      employeeType,
      phone,
    },
    process.env.ACCESS_SECRET,
    { expiresIn: "1h" },
  ) as string;
}
```

Input: `Partial<User>` — needs at minimum `{ id, companyId, role, employeeType }`.
Output: signed JWT string. Uses `ACCESS_SECRET` env var.

**`jwtVerifyToken`** — `src/lib/jwtVerify.ts:3`

```ts
export async function jwtVerifyToken(token: string) {
  const secret = new TextEncoder().encode(process.env.ACCESS_SECRET || "");
  const verifyToken = await jwtVerify(token, secret); // uses "jose" library
  return verifyToken; // .payload.companyId, .payload.id etc.
}
```

The copilot chat route (`/api/copilot/chat/route.ts`) already has `session.user.companyId`
and `session.user.id` from NextAuth. For each write tool call, the dispatcher will:

1. Call `generateAccessToken({ id: ctx.userId, companyId: ctx.companyId, ... })` once
2. Pass the token as `Authorization: Bearer <token>` on all internal fetch calls
3. The internal route calls `jwtVerifyToken(token)` and cross-checks `payload.companyId`
   against the URL `[companyId]` param — same pattern as `dc603455` (services route)

---

## Route pattern (from AbuBokorprog's appointment route)

```ts
import { NextRequest, NextResponse } from "next/server";
import { jwtVerifyToken } from "@/lib/jwtVerify";

export async function POST(
  req: NextRequest,
  props: { params: Promise<{ companyId: string }> },
) {
  try {
    const { companyId: companyIdStr } = await props.params;
    const companyId = Number(companyIdStr);

    // JWT Bearer auth — extract and verify token
    const authHeader = req.headers.get("authorization") ?? "";
    const token = authHeader.startsWith("Bearer ")
      ? authHeader.slice(7)
      : authHeader;
    const verified = await jwtVerifyToken(token);
    if (!verified?.payload) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 },
      );
    }
    if (Number(verified.payload.companyId) !== companyId) {
      return NextResponse.json(
        { success: false, message: "Forbidden" },
        { status: 403 },
      );
    }

    const body = await req.json();
    // validate required fields...

    const result = await someServerAction({
      ...body,
      forceCompanyId: companyId,
      forceUserId: Number(verified.payload.id),
    });

    if (result?.type === "error") {
      return NextResponse.json(
        {
          success: false,
          message: result.message,
          field: (result as any).field ?? null,
        },
        { status: 400 },
      );
    }

    return NextResponse.json({
      success: true,
      message: "Created successfully",
      data: (result as any)?.data ?? null,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error?.message || "Internal server error" },
      { status: 500 },
    );
  }
}
```

Note: AbuBokorprog's original appointment route (`4c422ee7`) does NOT include JWT auth —
it trusts the URL companyId directly. The newer services route (`dc603455`) adds JWT
Bearer auth. Phase 3 routes follow the services route pattern (with JWT auth).

The existing appointment and task routes that were built without JWT auth should be left
as-is for Phase 3 — the copilot calls them with a minted JWT even if they don't verify it.
Adding auth to existing routes is a Phase 6 hardening task.

---

## Phase 3a — Copilot internal API client (foundation)

**New file: `src/lib/copilot/internalApiClient.ts`**

A thin wrapper that:

1. Accepts session context (`{ companyId, userId, ... }`)
2. Mints a JWT via `generateAccessToken`
3. Exposes a `callInternal(method, path, body?)` helper that attaches the Bearer token
4. Used by all Phase 3 copilot tool handlers

This replaces the current pattern where Phase 2 tool handlers call `db.*` directly.
Phase 3 write tools call `callInternal(...)` instead.

**Modified: `src/lib/copilot/tools/dispatcher.ts`**

Extend `ToolContext` to include `internalClient` (instance of the above helper), so all
write tool handlers have it available without re-minting the JWT on each call.

---

## Phase 3b — Lead creation route + tool

### New API route

**`src/app/api/lead/company/[companyId]/route.ts`** — POST only

`/api/lead/` directory does not currently exist — create the full path.

Calls `createLeadRecord` (pure function, no session needed) directly — no server action
wrapper required since Phase 0a already extracted it. Auth: JWT Bearer.

```ts
import { createLeadRecord } from "@/lib/leads/createLeadRecord";

// POST: create lead
const result = await createLeadRecord(parsed, companyId, {
  isCRM: false,
  doTriggerAutomation: true,
  sendOpeningSms: body.sendOpeningSms ?? true,
});
```

### New copilot tool

**`src/lib/copilot/tools/handlers/createLead.ts`**

Calls `POST /api/lead/company/[companyId]/` via `internalApiClient`.

Tool input schema: `clientName`, `clientEmail?`, `clientPhone?`, `vehicleInfo`, `services`, `source`.

---

## Phase 3c — Appointment write tools

### Existing routes (already built by AbuBokorprog)

- **POST** `/api/appointment/company/[companyId]/` — calls `addAppointment` with
  `forceCompanyId` + `forceUserId`. ✅ No auth check in existing route, but copilot
  passes Bearer token regardless.

- **PATCH** `/api/appointment/company/[companyId]/[id]/` — **does NOT call
  `editAppointment`**. Verified: it uses `db.appointment.update()` directly after
  confirming `{ id, companyId }` ownership. Multi-tenant isolation is correct. No server
  action refactor needed. ✅ Ready as-is.

### New copilot tools

**`src/lib/copilot/tools/handlers/createAppointment.ts`**

Calls `POST /api/appointment/company/[companyId]/` via `internalApiClient`.

Tool input: `title`, `assignedUsers[]`, `date?`, `startTime?`, `endTime?`, `clientId?`,
`vehicleId?`, `notes?`.

**`src/lib/copilot/tools/handlers/updateAppointment.ts`**

Calls `PATCH /api/appointment/company/[companyId]/[id]/` via `internalApiClient`.

Tool input: `appointmentId`, plus any fields to update.

### Phase 3c work item: Attach estimate/invoice to appointment

When the copilot creates an appointment, the user should be able to attach an
existing estimate or invoice to it (the web app supports this; the attached
amount feeds the calendar's "Est. Revenue" total).

Why deferred from Phase 3b: attaching requires an estimate-lookup tool to let
the user pick among a client's estimates/invoices (shown by ID + vehicle).
Phase 3c builds estimate-lookup tools regardless, so attachment rides on that.

Scope when built:

- Reuse the Phase 3c estimate-lookup tool to list a client's estimates/invoices
  (by id + vehicle name).
- Add an optional estimate/invoice id field to the create_appointment tool
  (additive — same pattern as the Phase 3b.7 confirmation fields). The
  appointment route spreads ...body, and addAppointment already accepts a
  draftEstimate param — verify whether that is the same attachment mechanism
  or a different one during Phase 3c recon.
- System prompt: after appointment details, offer to attach an estimate/invoice;
  if yes, look up the client's estimates and let the user pick by id + vehicle.
- This is a financial-adjacent operation (affects calendar Est. Revenue) — the
  attachment must appear in the restate-and-confirm summary so the user sees
  exactly which estimate is being linked before confirming.

Acceptance criteria:

- Copilot can attach an existing estimate/invoice to a new appointment.
- The correct estimate/invoice id is stored on the appointment.
- Wrong-company estimates cannot be attached (multi-tenant check).
- The attachment is shown in the confirmation summary before the write.

---

## Phase 3d — Task write tools

### Existing routes

- **POST** `/api/task/route.ts` — creates task, takes `companyId` from request body.
  No JWT auth currently. Does NOT use `forceCompanyId`/`forceUserId` — reads from body.
  Copilot can call this by sending `companyId` from session in the body.

- **PATCH** `/api/task/[id]/route.ts` — updates task. Same — no force params, reads
  from session or body.

### Audit results

**Verified:** `/api/task/route.ts` POST reads `userId` and `companyId` directly from the
request body — no `getServerSession` call anywhere in the handler. No server action is
called; `db.task.create()` is called directly. ✅ **Pass-through OK.**

**Verified:** `/api/task/[id]/route.ts` PATCH uses `db.$transaction` directly — does NOT
call `editTask` server action. ✅ **Ready as-is.**

**Security note:** Neither task route has JWT Bearer auth. Any caller can submit any
`companyId` in the body. This is a pre-existing security gap flagged for a future pass
(see REVIEWER_GUIDE.md). For Phase 3, the copilot sends its session-derived `companyId`
in the body — correct behavior, but the route provides no verification layer.

### New copilot tools

**`src/lib/copilot/tools/handlers/createTask.ts`**

Calls `POST /api/task/` via `internalApiClient`. Sends `companyId`, `userId` in body.

Tool input: `title`, `description?`, `priority`, `assignedUsers[]`, `date?`.

**`src/lib/copilot/tools/handlers/updateTask.ts`**

Calls `PATCH /api/task/[id]/` via `internalApiClient`.

Tool input: `taskId`, plus any fields to update.

---

## Phase 3e — Draft estimate write tool

### Existing route

**POST** `/api/estimate/[companyId]/route.ts` — JWT Bearer authenticated via
`getCompanyIdFromBearer` with a URL/JWT companyId cross-check at the handler level.
Auth came from PR #836 (`taiseer/secure-estimate-routes`) and is present on this branch
via the `origin/development` merge (commit `8fc90e0e`, 2026-05-18).
Creating a draft estimate via the copilot can call this route directly — it is
copilot-compatible.

**Estimate route auth — RESOLVED.** The estimate/invoice routes
(`/api/estimate/[companyId]/*` and invoice equivalents) are JWT-Bearer authenticated via
`getCompanyIdFromBearer`, with a `companyId` cross-check at the handler level. Came from
PR #836 (`taiseer/secure-estimate-routes`), incorporated when `origin/development` was
merged in (merge commit `8fc90e0e`, 2026-05-18). Phase 3c.2's estimate-creation tool can
call `POST /api/estimate/[companyId]/` — the route is copilot-compatible.

### Audit result

**Verified:** `/api/estimate/[companyId]/route.ts` POST does NOT call `createDraftEstimate`.
It performs the full draft invoice creation via `db.$transaction` directly, with `companyId`
sourced from `getCompanyIdFromBearer` (URL/JWT cross-checked). No server action refactor
needed. ✅ **Ready as-is.**

### New copilot tool

**`src/lib/copilot/tools/handlers/createDraftEstimate.ts`**

Calls `POST /api/estimate/[companyId]/` via `internalApiClient`.

Tool input: `clientId`, `vehicleId?`, `requestedServices?[]`.

---

## Phase 3c.4 — Shop supplies & tax toggles

### Behavior spec (recorded 2026-05-20)

When creating an estimate, the copilot handles the two total-modifying
toggles as follows:

- **Shop supplies:** if the user has not stated whether to include shop
  supplies, the copilot ASKS. Shop supplies apply to the full subtotal
  (labor + materials), so the question is always relevant. Default
  rate is `Company.serviceFee`; "no shop supplies" ⇒ `serviceFee` rate 0.

- **Tax:** the copilot asks about tax ONLY when the estimate has at least
  one material line item. Tax applies to materials only — on a labor-only
  estimate it has zero dollar effect, so asking would be pointless. If the
  estimate has materials, the copilot asks whether to apply tax;
  "no tax" ⇒ `tax` rate 0. Default rate is `Company.tax`.

This phase depends on Phase 3c.3 (materials) being complete, since the
tax question is conditional on materials existing.

---

## Phase 3f — Inventory write routes + tools

### No existing routes or directory

`/api/inventory/` does not exist. `src/actions/inventory/` exists with:
`create.ts`, `edit.ts`, `delete.ts`, `query.ts`, `replenish.ts`, `useProduct.ts` etc.

**Verified:** `src/actions/inventory/create.ts` (`createProduct`) uses `getUser()` and
`getCompanyId()` — session-based helpers. `src/actions/inventory/edit.ts` (`editProduct`)
uses `getCompanyId()`. Neither accepts force params. 🔧 **Do not call these from routes.**

**Decision:** New inventory routes will call `db.inventoryProduct` directly (same pattern
as all other routes — appointment PATCH, task POST, estimate POST all do DB directly).
This avoids any server action refactor and matches the established codebase pattern.

### New API routes

**`src/app/api/inventory/company/[companyId]/route.ts`** — GET (list), POST (create item)

Calls `db.inventoryProduct.create()` and `db.inventoryProduct.findMany()` directly.
Auth: JWT Bearer with companyId cross-check.

**`src/app/api/inventory/company/[companyId]/[id]/route.ts`** — PATCH (update item)

Calls `db.inventoryProduct.update()` directly with `{ id, companyId }` ownership check.

### New copilot tools

**`src/lib/copilot/tools/handlers/createInventoryItem.ts`**

Calls `POST /api/inventory/company/[companyId]/` via `internalApiClient`.

**`src/lib/copilot/tools/handlers/updateInventoryItem.ts`**

Calls `PATCH /api/inventory/company/[companyId]/[id]/` via `internalApiClient`.

---

## Phase 3g — System prompt + UX updates

**Modified: `src/lib/copilot/systemPrompt.ts`**

Add to TOOL_GUIDE: one-question-at-a-time pattern for write operations. The AI asks for
confirmation before executing any write tool (prompt-level for reversible writes).

**Modified: `src/stores/copilotStore.ts`**

No change needed — existing `activeToolCalls` covers write tools.

---

## Phase 3h — Smoke testing

Test every write tool end-to-end via copilot chat:

- Create lead → verify in DB
- Create appointment → verify in calendar
- Update appointment → verify change
- Create task → verify in task list
- Update task → verify change
- Create draft estimate → verify in pipeline Pending column
- Create inventory item → verify in inventory
- Update inventory item → verify change

---

## Server action audit results

| Action                | File                                      | Session-dependent?                                | Classification                                                           |
| --------------------- | ----------------------------------------- | ------------------------------------------------- | ------------------------------------------------------------------------ |
| `addAppointment`      | `actions/appointment/addAppointment.ts`   | Optional (accepts `forceCompanyId`/`forceUserId`) | ✅ Ready as-is                                                           |
| `editAppointment`     | `actions/appointment/editAppointment.ts`  | Yes — `session.user.companyId`                    | ✅ Not called — PATCH route does DB directly                             |
| `createDraftEstimate` | `actions/estimate/invoice/createDraft.ts` | Yes — `session.user.companyId`                    | ✅ Not called — estimate POST does DB directly                           |
| `createTask`          | `actions/task/createTask.ts`              | Yes — `session.user.companyId`, `session.user.id` | ✅ Not called — task POST reads companyId/userId from body               |
| `editTask`            | `actions/task/editTask.ts`                | No session usage found                            | ✅ Not called — task PATCH does DB directly                              |
| `createProduct`       | `actions/inventory/create.ts`             | Yes — `getUser()`, `getCompanyId()`               | 🔧 Do not call — inventory routes will use DB directly                   |
| `editProduct`         | `actions/inventory/edit.ts`               | Yes — `getCompanyId()`                            | 🔧 Do not call — inventory routes will use DB directly                   |
| `createLead`          | `actions/lead/createLead.ts`              | Yes — `getEssentials()` for session               | ✅ Not used — Phase 3b calls `createLeadRecord` (pure function) directly |

**Key insight:** Every existing API route (appointment, task, estimate) does DB operations
directly in the route handler — NOT through server actions (with the one exception of
appointment POST calling `addAppointment` which already supports force params). The
server action refactor concern from the original plan does not apply. New inventory routes
follow this same DB-direct pattern.

---

## Open items (remaining, post-audit)

1. **Schema fix** — ✅ **RESOLVED.** `EmergencyBookingRequest` model + `EmergencyRequestStatus`
   enum added from `origin/development`. `prisma generate`, `yarn tsc --noEmit`, and
   `yarn build` all pass.

2. **Appointment PATCH inner action** — ✅ **RESOLVED.** Calls `db.appointment.update()`
   directly with `{ id, companyId }` ownership check. No `editAppointment` refactor needed.

3. **Inventory action signatures** — ✅ **RESOLVED.** Both use session helpers. Decision:
   new inventory routes query `db.inventoryProduct` directly — no action refactor.

4. **Task route companyId handling** — ✅ **RESOLVED.** Task POST reads `companyId` +
   `userId` from request body — no session, no server action. Copilot sends session-derived
   values in body. Pass-through works.

5. **`internalApiClient` base URL** — ⏳ **Open.** Need to verify what env var holds the
   base URL in Railway. Likely `process.env.NEXTAUTH_URL`. Confirm during Phase 3a
   implementation.

6. **Task route JWT auth gap** — ⏳ **Open (not in scope).** `/api/task/route.ts` POST
   and `/api/task/[id]/` PATCH accept `companyId` from request body with no verification.
   Flagged in REVIEWER_GUIDE.md for a future security pass. Not blocking Phase 3.

7. **`update_appointment` and `update_task` reversibility** — ⏳ **Open.** Decide whether
   these need "confirm before execute" in Phase 3 or proceed without confirmation (Phase 4
   is for external-effect tools like send_estimate). Recommendation: internal mutations
   (create/update DB only) proceed without confirmation in Phase 3.

---

## Files to be created (Phase 3)

| File                                                      | Purpose                             |
| --------------------------------------------------------- | ----------------------------------- |
| `src/lib/copilot/internalApiClient.ts`                    | JWT minting + internal fetch helper |
| `src/app/api/lead/company/[companyId]/route.ts`           | POST create-lead route              |
| `src/app/api/inventory/company/[companyId]/route.ts`      | GET + POST inventory routes         |
| `src/app/api/inventory/company/[companyId]/[id]/route.ts` | PATCH inventory update route        |
| `src/lib/copilot/tools/handlers/createLead.ts`            | Copilot create_lead tool            |
| `src/lib/copilot/tools/handlers/createAppointment.ts`     | Copilot create_appointment tool     |
| `src/lib/copilot/tools/handlers/updateAppointment.ts`     | Copilot update_appointment tool     |
| `src/lib/copilot/tools/handlers/createTask.ts`            | Copilot create_task tool            |
| `src/lib/copilot/tools/handlers/updateTask.ts`            | Copilot update_task tool            |
| `src/lib/copilot/tools/handlers/createDraftEstimate.ts`   | Copilot create_draft_estimate tool  |
| `src/lib/copilot/tools/handlers/createInventoryItem.ts`   | Copilot create_inventory_item tool  |
| `src/lib/copilot/tools/handlers/updateInventoryItem.ts`   | Copilot update_inventory_item tool  |

---

## Files to be modified (Phase 3)

| File                                         | Change                                                                        |
| -------------------------------------------- | ----------------------------------------------------------------------------- |
| `src/lib/copilot/tools/dispatcher.ts`        | Add `internalClient` to ToolContext; extend for write tool routing            |
| `src/lib/copilot/tools/index.ts`             | Import all new write tool handlers                                            |
| `src/lib/copilot/systemPrompt.ts`            | Add write-tool guidance to TOOL_GUIDE section                                 |
| `src/actions/appointment/editAppointment.ts` | Add `forceCompanyId`/`forceUserId` params (pending open item #2 confirmation) |
| `src/actions/inventory/create.ts`            | Add `forceCompanyId`/`forceUserId` params (pending open item #3 confirmation) |
| `src/actions/inventory/edit.ts`              | Add `forceCompanyId`/`forceUserId` params (pending open item #3 confirmation) |

---

## Routes audit summary — exists vs needs to be created

| Route                                        | Exists? | Methods          | Notes                                                     |
| -------------------------------------------- | ------- | ---------------- | --------------------------------------------------------- |
| `/api/appointment/company/[companyId]/`      | ✓       | GET POST         | No JWT auth (leave for Phase 6)                           |
| `/api/appointment/company/[companyId]/[id]/` | ✓       | PATCH DELETE     | Verify action called                                      |
| `/api/task/`                                 | ✓       | GET POST         | No JWT auth; takes companyId from body                    |
| `/api/task/[id]/`                            | ✓       | GET PATCH DELETE | No JWT auth                                               |
| `/api/task/company/[companyId]/`             | ✓       | GET              | List only, no write needed                                |
| `/api/estimate/[companyId]/`                 | ✓       | GET POST         | JWT Bearer auth ✓ (PR #836, on branch via 8fc90e0e merge) |
| `/api/lead/company/[companyId]/`             | ✗       | —                | **Must create**                                           |
| `/api/inventory/company/[companyId]/`        | ✗       | —                | **Must create**                                           |
| `/api/inventory/company/[companyId]/[id]/`   | ✗       | —                | **Must create**                                           |
| `/api/invoice/company/[companyId]/`          | ✓       | GET              | Read-only, no write needed for Phase 3                    |

---

## Conflict risks

- `/api/estimate/[companyId]/` — EXISTS with JWT Bearer auth (PR #836, merged to this
  branch via `8fc90e0e`); POST already implemented. Copilot can use this directly. Do not
  duplicate.
- `/api/appointment/company/[companyId]/` — EXISTS from AbuBokorprog; avoid adding a
  competing route. Copilot calls the existing one.
- `/api/task/` — EXISTS from mobile API work; check if copilot-specific task route is
  needed under `/task/company/[companyId]/` or if the existing `/task/` POST is sufficient.
- Server action changes (`editAppointment`, inventory `create`/`edit`) could affect
  the web dashboard if force params are introduced incorrectly — must be backwards-compatible
  (optional params, default to session lookup when not provided).

---

## Estimated effort

| Phase      | Work                                                             | Days        |
| ---------- | ---------------------------------------------------------------- | ----------- |
| Schema fix | Resolve EmergencyBookingRequest                                  | 0.5         |
| 3a         | `internalApiClient.ts` + dispatcher update                       | 0.5         |
| 3b         | Lead route + create_lead tool                                    | 0.5         |
| 3c         | Appointment tools (routes exist, may need editAppointment patch) | 1.0         |
| 3d         | Task tools (routes exist, companyId from body approach)          | 0.5         |
| 3e         | Draft estimate tool (route exists)                               | 0.5         |
| 3f         | Inventory routes (new) + tools + action patches                  | 1.5         |
| 3g         | System prompt updates                                            | 0.5         |
| 3h         | End-to-end smoke testing                                         | 1.0         |
| **Total**  |                                                                  | **~6 days** |

---

## Known limitations / out of scope

### Known limitation — estimate conversion route not copilot-compatible

`PATCH /api/estimate/[companyId]/[id]/convert/` calls `convertInvoice`, which calls
`getServerSession()` internally. In a server-to-server Bearer call (how the copilot
invokes routes) `getServerSession()` returns null, so the convert route will not work
for the copilot without refactoring.

Phase 3c does NOT include estimate-to-invoice conversion — conversion remains a
UI/approval-flow action. If a future phase wants the copilot to convert estimates,
`convertInvoice` must first be refactored to accept an explicit `companyId`/`userId`
instead of reading the session.
