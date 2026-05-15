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
  `forceCompanyId` + `forceUserId`. ✓ No auth check in existing route, but copilot
  passes Bearer token regardless.

- **PATCH** `/api/appointment/company/[companyId]/[id]/` — calls... unknown action. Must
  verify during Phase 3c implementation (see open items).

### Server action gap

`editAppointment` (`src/actions/appointment/editAppointment.ts`) does NOT currently accept
`forceCompanyId` or `forceUserId`. The existing PATCH route at `[id]` must be inspected to
confirm what it calls — if it's `editAppointment`, the action needs the force params added
before the copilot update_appointment tool can work.

### New copilot tools

**`src/lib/copilot/tools/handlers/createAppointment.ts`**

Calls `POST /api/appointment/company/[companyId]/` via `internalApiClient`.

Tool input: `title`, `assignedUsers[]`, `date?`, `startTime?`, `endTime?`, `clientId?`,
`vehicleId?`, `notes?`.

**`src/lib/copilot/tools/handlers/updateAppointment.ts`**

Calls `PATCH /api/appointment/company/[companyId]/[id]/` via `internalApiClient`.

Tool input: `appointmentId`, plus any fields to update.

---

## Phase 3d — Task write tools

### Existing routes

- **POST** `/api/task/route.ts` — creates task, takes `companyId` from request body.
  No JWT auth currently. Does NOT use `forceCompanyId`/`forceUserId` — reads from body.
  Copilot can call this by sending `companyId` from session in the body.

- **PATCH** `/api/task/[id]/route.ts` — updates task. Same — no force params, reads
  from session or body.

### Server action gaps

`createTask` and `editTask` both use `session.user.companyId` and `session.user.id`
hardcoded from `getServerSession`. Neither accepts `forceCompanyId`/`forceUserId`.

**Options (choose before implementation):**

1. Add `forceCompanyId`/`forceUserId` to both actions (matches the pattern, most correct)
2. Use the existing `/api/task/` POST route as-is (sends companyId in body, no server action
   bypass needed — this route already accepts companyId from body, not session)

Recommendation: option 2 for Phase 3 (avoids modifying createTask/editTask), option 1 for
Phase 6 hardening.

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

**POST** `/api/estimate/[companyId]/route.ts` — from `taiseer/secure-estimate-routes`,
already has JWT Bearer auth matching the pattern exactly. Creating a draft estimate via the
copilot can call this route directly.

### Server action gap

`createDraftEstimate` (`src/actions/estimate/invoice/createDraft.ts`) uses
`getServerSession()` — but the existing `/api/estimate/[companyId]/` POST route likely
already handles this by calling it differently. Must verify during implementation.

### New copilot tool

**`src/lib/copilot/tools/handlers/createDraftEstimate.ts`**

Calls `POST /api/estimate/[companyId]/` via `internalApiClient`.

Tool input: `clientId`, `vehicleId?`, `requestedServices?[]`.

---

## Phase 3f — Inventory write routes + tools

### No existing routes or directory

`/api/inventory/` does not exist. `src/actions/inventory/` exists with:
`create.ts`, `edit.ts`, `delete.ts`, `query.ts`, `replenish.ts`, `useProduct.ts` etc.

Must verify if `create.ts` and `edit.ts` accept `forceCompanyId`/`forceUserId` before
building routes (likely they do not — they probably use `getServerSession`).

### New API routes

**`src/app/api/inventory/company/[companyId]/route.ts`** — GET (list), POST (create item)

Calls `src/actions/inventory/create.ts` with force params (add if needed) OR queries
`db.inventoryProduct` directly (simpler if action uses session).

**`src/app/api/inventory/company/[companyId]/[id]/route.ts`** — PATCH (update item)

Calls `src/actions/inventory/edit.ts` with force params (add if needed).

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

## Open items requiring verification before implementation

1. **Schema fix first.** `EmergencyBookingRequest` missing from merged schema.prisma —
   `prisma generate` fails. Must resolve before any tsc check works. See BLOCKER above.

2. **Appointment PATCH route inspection.** What server action does
   `/api/appointment/company/[companyId]/[id]/route.ts` call? If `editAppointment`,
   force params need to be added. If it calls `db` directly, no action changes needed.

3. **Inventory action signatures.** Do `src/actions/inventory/create.ts` and `edit.ts`
   use `getServerSession`? If yes, they need force params added or Phase 3f routes must
   query `db` directly.

4. **Task route companyId handling.** The existing `/api/task/route.ts` POST takes
   `companyId` from the request body. No JWT verification currently. Confirm this works
   for the copilot's use case (copilot sends session companyId in body).

5. **`internalApiClient` base URL.** When the copilot route calls its own internal
   routes, it needs the full URL (`http://localhost:3000/api/...` in dev,
   `https://...railway.app/api/...` in prod). Must read from `process.env.NEXTAUTH_URL`
   or similar. Verify what env var holds the base URL.

6. **Existing appointment route auth.** AbuBokorprog's `/api/appointment/company/[companyId]/`
   POST has no JWT auth. Leave as-is for Phase 3 (copilot will send Bearer anyway), add
   auth in Phase 6 hardening. Confirm this is acceptable.

7. **`update_appointment` and `update_task` tool reversibility.** Per TOOL_REGISTRY.md,
   these are write operations. Confirm whether they should be "confirm before execute" in
   Phase 3 or deferred to Phase 4 (Phase 4 is explicitly for external-effect tools like
   send_estimate). Internal mutations (create/update) can proceed without confirmation in
   Phase 3 per original design.

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

| Route                                        | Exists? | Methods          | Notes                                      |
| -------------------------------------------- | ------- | ---------------- | ------------------------------------------ |
| `/api/appointment/company/[companyId]/`      | ✓       | GET POST         | No JWT auth (leave for Phase 6)            |
| `/api/appointment/company/[companyId]/[id]/` | ✓       | PATCH DELETE     | Verify action called                       |
| `/api/task/`                                 | ✓       | GET POST         | No JWT auth; takes companyId from body     |
| `/api/task/[id]/`                            | ✓       | GET PATCH DELETE | No JWT auth                                |
| `/api/task/company/[companyId]/`             | ✓       | GET              | List only, no write needed                 |
| `/api/estimate/[companyId]/`                 | ✓       | GET POST         | JWT Bearer auth ✓ (secure-estimate-routes) |
| `/api/lead/company/[companyId]/`             | ✗       | —                | **Must create**                            |
| `/api/inventory/company/[companyId]/`        | ✗       | —                | **Must create**                            |
| `/api/inventory/company/[companyId]/[id]/`   | ✗       | —                | **Must create**                            |
| `/api/invoice/company/[companyId]/`          | ✓       | GET              | Read-only, no write needed for Phase 3     |

---

## Conflict risks

- `/api/estimate/[companyId]/` — EXISTS from `taiseer/secure-estimate-routes`; POST
  already implemented. Copilot can use this directly. Do not duplicate.
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
