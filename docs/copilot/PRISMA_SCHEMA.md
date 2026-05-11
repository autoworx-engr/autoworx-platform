# AutoWorx AI Copilot — Prisma Schema Design

> Status: Applied — migration shipped in Phase 0a (commit cd1b7408) | Branch: taiseer/ai-copilot | Design date: 2026-05-10

---

## Overview

This document defines the exact Prisma model additions and modifications required for the AI Copilot feature. Nothing here is applied to the database yet. All models are designed to integrate with the existing schema at `prisma/schema.prisma`.

**Models introduced:**

- `CopilotSession` — conversation container
- `CopilotMessage` — flat message rows per turn
- `AuditLog` — general-purpose platform audit trail

**Models modified:**

- `User` — adds `hasCopilot`, `copilotAssignedAt`, `copilotAssignedBy`
- `Company` — adds `copilotSeatsAssigned`

**Existing models referenced (no changes):**

- `PlatformSubscriptionItem` — receives a new row pattern for copilot seats
- `PlanFeature` — receives a new `copilotSeats` key

---

## New Models

### `CopilotSession`

```prisma
model CopilotSession {
  id                    String           @id @default(cuid())
  userId                Int
  companyId             Int
  title                 String?          // Auto-generated from first user message (first 60 chars)
  startedAt             DateTime         @default(now())
  lastMessageAt         DateTime         @default(now())
  summary               String?          @db.Text   // Generated on session close, 2-3 sentences
  messageCount          Int              @default(0) // Denormalized count, incremented on each message
  tokenCount            Int              @default(0) // Running total of inputTokens + outputTokens
  cachedTokenCount      Int              @default(0) // Running total of cachedTokens (for cost reporting)
  pendingConfirmations  Json?            // { [token: string]: ConfirmationEntry } — see architecture doc
  createdAt             DateTime         @default(now())
  updatedAt             DateTime         @updatedAt

  user                  User             @relation(fields: [userId], references: [id], onDelete: Cascade)
  messages              CopilotMessage[]
  auditLogs             AuditLog[]

  @@index([userId, lastMessageAt(sort: Desc)])   // load user's sessions for history panel
  @@index([companyId, lastMessageAt(sort: Desc)]) // admin view of all company copilot usage
  @@index([userId, summary])                      // filter sessions that have summaries for context loading
}
```

**Field rationale:**

- `id: cuid()` — string IDs for session because they're referenced in SSE events and URLs. Avoids exposing sequential integers.
- `title` — set on first message, truncated to 60 chars. Shown in a future "past conversations" panel.
- `summary` — nullable until populated. Populated synchronously via `POST /api/copilot/sessions/[id]/close` on explicit close; populated lazily on next session start if the close was missed (dirty close fallback).
- `messageCount / tokenCount / cachedTokenCount` — denormalized for fast dashboard queries. Updated atomically with `db.copilotSession.update({ data: { messageCount: { increment: 1 }, tokenCount: { increment: tokens } } })`.
- `pendingConfirmations: Json?` — stores confirmation tokens for external-effect tools. Structure: `{ [uuid]: { tool, invoiceId, expiresAt } }`. Updated on preview generation and cleared on send.
- `updatedAt` — Prisma auto-managed, used for "last active" checks.

---

### `CopilotMessage`

```prisma
enum CopilotMessageRole {
  user
  assistant
  tool_call      // assistant decided to call a tool; content is JSON of the tool_use block
  tool_result    // tool returned a result; content is JSON of the tool_result block
  system_summary // injected at session start from past summaries; not user-generated
}

model CopilotMessage {
  id            Int                  @id @default(autoincrement())
  sessionId     String
  role          CopilotMessageRole
  content       String               @db.Text  // text for user/assistant; JSON for tool_call/tool_result
  toolName      String?              // populated when role = tool_call or tool_result
  toolCallId    String?              // Anthropic's tool_use id, used to pair tool_call with tool_result
  model         String?              // e.g. "claude-sonnet-4-6" — only on assistant messages
  inputTokens   Int                  @default(0)
  outputTokens  Int                  @default(0)
  cachedTokens  Int                  @default(0)
  createdAt     DateTime             @default(now())

  session       CopilotSession       @relation(fields: [sessionId], references: [id], onDelete: Cascade)

  @@index([sessionId, createdAt])    // load conversation history in order
  @@index([toolCallId])              // pair tool_call with tool_result rows
}
```

**Field rationale:**

- `role` enum includes `tool_call` and `tool_result` as separate roles. This lets the application reconstruct the full Anthropic messages array faithfully on next load (Anthropic requires the full tool_call/tool_result pair in history).
- `content: @db.Text` — no length limit. Tool results can be large JSON payloads; assistant responses can be long.
- `toolCallId` — Anthropic assigns a unique ID to each `tool_use` block. Storing it allows matching the tool_call message row to the corresponding tool_result row for display in the UI ("this result came from that tool call").
- `model` — only set on `assistant` role messages. Allows per-message cost attribution and retrospective model-routing analysis.
- `inputTokens / outputTokens / cachedTokens` — per-message token accounting. Sum these to get session totals (in addition to the denormalized session-level `tokenCount`). Used for the future cost dashboard.
- No `updatedAt` — messages are immutable once written.

**How conversation history is reconstructed for Anthropic:**

```ts
// Load messages in order, convert to Anthropic format
const messages = await db.copilotMessage.findMany({
  where: { sessionId },
  orderBy: { createdAt: "asc" },
});

const anthropicMessages = messages
  .filter((m) => m.role !== "system_summary") // summaries go in system prompt, not messages
  .map((m) => {
    if (m.role === "user") return { role: "user", content: m.content };
    if (m.role === "assistant")
      return { role: "assistant", content: m.content };
    if (m.role === "tool_call") {
      return { role: "assistant", content: [JSON.parse(m.content)] }; // tool_use block
    }
    if (m.role === "tool_result") {
      return { role: "user", content: [JSON.parse(m.content)] }; // tool_result block
    }
  });
```

---

### `AuditLog`

```prisma
enum AuditActor {
  user      // human user acting directly (future use)
  copilot   // AI copilot acting on behalf of user
  system    // system/automated processes
  api       // external API calls (webhooks, Zapier, etc.)
}

model AuditLog {
  id               Int           @id @default(autoincrement())
  userId           Int
  companyId        Int
  actor            AuditActor
  action           String        // dot-notation: "lead.create", "estimate.send", "revenue.read"
  resourceType     String?       // "Lead", "Invoice", "Task", "InventoryProduct", etc.
  resourceId       String?       // the created/modified resource's ID (string to handle both Int and cuid)
  inputJson        String?       @db.Text  // JSON of the tool input or action parameters
  outputJson       String?       @db.Text  // JSON of the result (truncated if large)
  success          Boolean
  errorMessage     String?       // populated on failure
  latencyMs        Int?          // tool execution time in milliseconds
  ipAddress        String?       // from request headers (X-Forwarded-For)
  userAgent        String?       // from request headers
  copilotSessionId String?       // FK to CopilotSession when actor = copilot
  createdAt        DateTime      @default(now())

  user             User          @relation(fields: [userId], references: [id])
  copilotSession   CopilotSession? @relation(fields: [copilotSessionId], references: [id])

  @@index([companyId, createdAt(sort: Desc)])    // admin audit log view, scoped to company
  @@index([userId, createdAt(sort: Desc)])        // per-user activity log
  @@index([action])                               // filter by action type
  @@index([resourceType, resourceId])             // "show me all audit events for Lead #42"
  @@index([copilotSessionId])                     // all actions taken in a specific copilot session
  @@index([success, createdAt(sort: Desc)])       // failure monitoring
}
```

**Field rationale:**

- **General-purpose design** — `actor` enum makes this useful beyond copilot. Future uses: audit when an admin changes billing settings (`actor: system`), audit external API calls (`actor: api`).
- `action` uses dot-notation strings (e.g., `"lead.create"`, `"estimate.send"`) — not permission field names. These are copilot-specific action strings, separate from the existing boolean permission fields.
- `resourceId: String?` — string type (not Int) because some resources use cuid (Invoice, CopilotSession) and some use integer (Lead, Task). Stores the ID as a string for both.
- `inputJson` — stores the Zod-validated tool input (after validation, before execution). Does NOT store raw AI-provided input. Contains PII (client names, phone numbers) — this field must be excluded from any logging or external reporting.
- `outputJson` — stores the normalized tool result. Truncated to 5,000 chars if the result is a large dataset.
- `latencyMs` — critical for cost/performance monitoring. Measure from tool handler start to DB write completion.
- `ipAddress` — from `X-Forwarded-For` header, useful for anomaly detection. Store `null` if not available.
- `copilotSessionId` — nullable FK. When `actor = copilot`, always set. When `actor = user` or `system`, null.

**Action string conventions:**

```
lead.create          lead.read           lead.update
appointment.create   appointment.read    appointment.update   appointment.delete
task.create          task.read           task.update          task.delete
estimate.create      estimate.read       estimate.send
invoice.send
inventory.create     inventory.read      inventory.update
revenue.read         payments.read
```

---

## Modified Models

### `User` Additions

```prisma
// Add these fields to the existing User model:
hasCopilot          Boolean    @default(false)
copilotAssignedAt   DateTime?  // when the seat was assigned
copilotAssignedBy   String?    // userId (as string) of the admin who assigned the seat
```

**Field rationale:**

- `hasCopilot` — the primary gate. Checked on every copilot route handler call. Default: false (off for all users). Admin explicitly toggles to true.
- `copilotAssignedAt` / `copilotAssignedBy` — audit trail for seat management. Useful when an admin asks "who assigned this seat and when?" Stored as `String?` (not FK) to avoid circular dependency and because the assigning user might be a superAdmin not in the same company.

**Relation additions:**

```prisma
// Add to User model:
copilotSessions     CopilotSession[]
auditLogs           AuditLog[]
```

---

### `Company` Additions

```prisma
// Add to existing Company model:
copilotSeatsAssigned  Int  @default(0)
```

**Field rationale:**

- Denormalized count of users with `hasCopilot = true` in this company. Updated atomically whenever `User.hasCopilot` is toggled (via a dedicated `assignCopilotSeat` / `revokeCopilotSeat` server action). Used to: (a) show admins "2 of 5 seats assigned", and (b) write the `PlatformSubscriptionItem.quantity` value for billing.
- Not computed via `_count` relation because the billing service reads `Company.copilotSeatsAssigned` directly — it needs a simple column, not a JOIN.

**How to keep it consistent:**

```ts
// In assignCopilotSeat() server action:
await db.$transaction([
  db.user.update({
    where: { id: userId },
    data: {
      hasCopilot: true,
      copilotAssignedAt: new Date(),
      copilotAssignedBy: adminUserId,
    },
  }),
  db.company.update({
    where: { id: companyId },
    data: { copilotSeatsAssigned: { increment: 1 } },
  }),
  // Update PlatformSubscriptionItem.quantity (see below)
]);
```

---

## Existing Models — New Row Patterns (no schema changes)

### `PlatformSubscriptionItem` — Copilot Row Pattern

No schema change needed. The existing model handles this via a new row:

```prisma
// Existing model (from recon):
model PlatformSubscriptionItem {
  id             Int                  @id @default(autoincrement())
  subscriptionId Int
  name           String
  price          Decimal
  quantity       Int
  isOneTime      Boolean              @default(false)
  // ... other fields
}
```

**Copilot seat row pattern:**

```
{
  subscriptionId: <company's subscription id>,
  name: "AI Copilot",
  price: 3900,           // in cents ($39.00)
  quantity: <copilotSeatsAssigned>,
  isOneTime: false,
}
```

**How this row is updated:** The `assignCopilotSeat` / `revokeCopilotSeat` server actions upsert this row:

```ts
// Upsert the copilot subscription item on seat change
await db.platformSubscriptionItem.upsert({
  where: { subscriptionId_name: { subscriptionId, name: "AI Copilot" } },
  create: {
    subscriptionId,
    name: "AI Copilot",
    price: 3900,
    quantity: 1,
    isOneTime: false,
  },
  update: { quantity: company.copilotSeatsAssigned },
});
```

> **⚠️ NestJS coordination required:** The external NestJS billing service reads `PlatformSubscriptionItem` rows to compute the monthly invoice. Taiseer must confirm with the NestJS team that: (a) a row with `name: "AI Copilot"` will be picked up correctly, (b) `quantity: 0` rows are handled gracefully (or deleted), and (c) the `price` field is in cents (same convention as existing items). **Do not assume this works without coordination.**

### `PlanFeature` — Copilot Seats Key

```prisma
// Existing model (from recon):
model PlanFeature {
  id        Int    @id @default(autoincrement())
  planId    String
  featureKey String
  value     String  // stored as string, cast at read time
  type      PlanFeatureType  // BOOLEAN | NUMERIC | TEXT
  @@unique([planId, featureKey])
}
```

**New row to add for each plan that includes copilot:**

```
{
  planId: <relevant plan cuid>,
  featureKey: "copilotSeats",
  value: "unlimited",   // or a number like "5" for plans with seat limits
  type: TEXT,           // TEXT because "unlimited" isn't a valid integer
}
```

**How `getCompanyEntitlements()` should read this:**

```ts
// In src/lib/platform-billing/entitlement-service.ts
const copilotFeature = planFeatures.find(
  (f) => f.featureKey === "copilotSeats",
);
const copilotSeats =
  copilotFeature?.value === "unlimited"
    ? Infinity
    : parseInt(copilotFeature?.value ?? "0");

// For legacy companies (enforcePlatformPlan: false):
// Check CompanyPermissionModule for permission_name: "copilot"
// If no such row exists, copilotEnabled: false
```

**`Entitlements` type additions** (in `src/lib/platform-billing/entitlement-service.ts`):

```ts
type Entitlements = {
  // ... existing fields ...
  copilotEnabled: boolean; // true if company has any copilot seats
  copilotSeats: number; // max seats (Infinity for unlimited)
};
```

---

## Migration Order

Apply in this exact order to avoid FK violations:

```
Migration 1: enum additions
  - CopilotMessageRole enum
  - AuditActor enum

Migration 2: AuditLog (no FKs to new tables yet)
  - CREATE TABLE AuditLog
  - Add indexes

Migration 3: CopilotSession (FK to User)
  - CREATE TABLE CopilotSession
  - Add indexes

Migration 4: CopilotMessage (FK to CopilotSession)
  - CREATE TABLE CopilotMessage
  - Add indexes
  - Add FK from AuditLog.copilotSessionId to CopilotSession

Migration 5: User + Company additions
  - ALTER TABLE User ADD hasCopilot, copilotAssignedAt, copilotAssignedBy
  - ALTER TABLE Company ADD copilotSeatsAssigned
  - These are additive — no data migrations needed, defaults handle existing rows

Migration 6: Data seeding (manual, not a schema migration)
  - Optionally insert PlanFeature rows for copilotSeats on existing plans
  - Optionally insert CompanyPermissionModule row { permission_name: "copilot", enabled: false }
    for all existing companies — or let getCompanyEntitlements() default to false when absent
```

**Run time estimates:**

- Migrations 1–4: < 1 second (new tables, no existing data to touch)
- Migration 5: < 1 second on a fresh column add with a default (no row rewriting)
- Migration 6: manual, coordinate timing with NestJS team

---

## Backward Compatibility

### Does any of this break legacy `enforcePlatformPlan: false` companies?

No. Here's why:

1. **AuditLog, CopilotSession, CopilotMessage** — entirely new tables. Existing code never touches them. No impact.

2. **User.hasCopilot default(false)** — additive column. All existing users get `hasCopilot: false`. The copilot icon is hidden. No behavior change.

3. **Company.copilotSeatsAssigned default(0)** — additive column with default. No behavior change.

4. **`getCompanyEntitlements()`** — will be modified to read the new fields. For legacy companies (`enforcePlatformPlan: false`), the function checks `CompanyPermissionModule` for `permission_name: "copilot"`. If no such row exists (which it won't for existing companies), `copilotEnabled: false` is returned. The copilot icon is hidden. No behavior change.

5. **PlatformSubscriptionItem** — no schema change. The new "AI Copilot" row only exists for companies that have seats assigned. Existing billing code ignores rows it doesn't know about (it reads all items and sums them — adding a new item type doesn't break the sum).

6. **PlanFeature** — no schema change. The new `copilotSeats` key only matters if `getCompanyEntitlements()` looks for it. Existing plans without this key get `copilotSeats: 0` and `copilotEnabled: false`.

**Summary:** All changes are strictly additive. Existing companies see no behavior change until an admin explicitly assigns a seat.

---

## NestJS Coordination Required

Flag the following items for Taiseer to discuss with the NestJS billing team **before Phase 5**:

1. **`PlatformSubscriptionItem` with `name: "AI Copilot"`** — confirm the NestJS service picks this up correctly in the monthly invoice computation.
2. **`quantity: 0` handling** — when all seats are revoked, should the row be deleted or set to `quantity: 0`? If set to 0, does NestJS skip zero-quantity items?
3. **`price` field units** — confirm NestJS interprets this as cents (3900 = $39.00), same as other items.
4. **`PlanFeature.copilotSeats` for `enforcePlatformPlan: true` companies** — NestJS may need to read this to enforce seat limits at the billing level (reject seat assignment if plan limit reached). Or this can be enforced in the Next.js layer.
5. **Seat change webhook** — should the Next.js app call a NestJS endpoint when seats change (to trigger an immediate billing update), or does NestJS poll on a schedule? Current architecture (from recon) suggests NestJS polls — confirm.
