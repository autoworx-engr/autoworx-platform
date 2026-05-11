# AutoWorx AI Copilot — Tool Registry (v1)

> Design date: 2026-05-10 | Last updated: 2026-05-11
> **Read-only tools (Phase 2): all 8 shipped.** Write tools and external-effect tools: design only, not yet implemented.
> Shipped tools live in `src/lib/copilot/tools/handlers/`. Registry: `src/lib/copilot/tools/registry.ts`. Dispatcher: `src/lib/copilot/tools/dispatcher.ts`.
>
> **Implementation notes (deviations from this spec):**
>
> - `Priority` enum: Prisma schema has `Low | Medium | High` (no `Urgent`). Handler returns actual enum values.
> - `Task.completed` field: does not exist in schema. `get_tasks_for_user` uses `date < now` as a proxy.
> - `get_revenue_summary` input: `category` filter from spec not implemented (direct Invoice query, no category join).
> - Tool file structure: `src/lib/copilot/tools/handlers/` (flat), not the `read/write/external/` subdirectory structure shown in the file tree below.

---

## Overview

The tool registry is divided into three risk tiers:

- **Read-only** — execute freely after permission check; log to AuditLog
- **Reversible write** — execute, return result summary, log to AuditLog
- **External-effect** — require a `confirmationToken` from a prior `preview_*` call; log to AuditLog

All tools share the same execution envelope:

1. `canUserDo(userId, action)` permission check — reject with user-facing error if denied
2. Zod validation of tool input — reject with field-level error if invalid
3. `companyId` injected from session — AI-provided `companyId` field is ignored
4. Execute server action
5. `normalizeActionResult()` if action uses old `{success, message}` shape
6. `writeAuditLog(...)` — always, including on failure
7. Return result to Anthropic

---

## `canUserDo` Permission Mapping

The `canUserDo(userId, action)` helper maps tool action strings to existing permission fields:

```ts
// src/lib/copilot/permissions.ts
const PERMISSION_MAP: Record<string, (perms: PermissionsResult) => boolean> = {
  "lead.create": (p) =>
    p.role === "Admin" ||
    !!(p.userPermissions?.salesPipeline ?? p.companyPermissions?.salesPipeline),
  "lead.read": (p) =>
    p.role === "Admin" ||
    !!(p.userPermissions?.salesPipeline ?? p.companyPermissions?.salesPipeline),
  "appointment.create": (p) =>
    p.role === "Admin" ||
    !!(p.userPermissions?.calendarTask ?? p.companyPermissions?.calendarTask),
  "appointment.read": (p) =>
    p.role === "Admin" ||
    !!(p.userPermissions?.calendarTask ?? p.companyPermissions?.calendarTask),
  "appointment.update": (p) =>
    p.role === "Admin" ||
    !!(p.userPermissions?.calendarTask ?? p.companyPermissions?.calendarTask),
  "appointment.delete": (p) =>
    p.role === "Admin" ||
    !!(p.userPermissions?.calendarTask ?? p.companyPermissions?.calendarTask),
  "task.create": (p) =>
    p.role === "Admin" ||
    !!(p.userPermissions?.calendarTask ?? p.companyPermissions?.calendarTask),
  "task.read": (p) =>
    p.role === "Admin" ||
    !!(p.userPermissions?.calendarTask ?? p.companyPermissions?.calendarTask),
  "task.update": (p) =>
    p.role === "Admin" ||
    !!(p.userPermissions?.calendarTask ?? p.companyPermissions?.calendarTask),
  "task.delete": (p) =>
    p.role === "Admin" ||
    !!(p.userPermissions?.calendarTask ?? p.companyPermissions?.calendarTask),
  "estimate.create": (p) =>
    p.role === "Admin" ||
    !!(
      p.userPermissions?.estimatesInvoices ??
      p.companyPermissions?.estimatesInvoices
    ),
  "estimate.read": (p) =>
    p.role === "Admin" ||
    !!(
      p.userPermissions?.estimatesInvoices ??
      p.companyPermissions?.estimatesInvoices
    ),
  "estimate.send": (p) =>
    p.role === "Admin" ||
    !!(
      p.userPermissions?.estimatesInvoices ??
      p.companyPermissions?.estimatesInvoices
    ),
  "invoice.send": (p) =>
    p.role === "Admin" ||
    !!(
      p.userPermissions?.estimatesInvoices ??
      p.companyPermissions?.estimatesInvoices
    ),
  "inventory.create": (p) =>
    p.role === "Admin" ||
    !!(p.userPermissions?.inventoryAll ?? p.companyPermissions?.inventoryAll),
  "inventory.read": (p) =>
    p.role === "Admin" ||
    !!(p.userPermissions?.inventoryAll ?? p.companyPermissions?.inventoryAll),
  "inventory.update": (p) =>
    p.role === "Admin" ||
    !!(p.userPermissions?.inventoryAll ?? p.companyPermissions?.inventoryAll),
  "revenue.read": (p) =>
    p.role === "Admin" ||
    (p.userPermissions?.reporting ?? p.companyPermissions?.reporting) !== false,
  "payments.read": (p) =>
    p.role === "Admin" ||
    (p.userPermissions?.payments ?? p.companyPermissions?.payments) !== false,
  "client.read": (p) => true, // all roles can read clients they have access to
};
```

---

## Read-only Tools (Haiku-eligible)

---

### `get_revenue_summary`

- **Description (for AI):** Fetch total revenue, cost, profit, and payment breakdown for a date range. Use when the user asks about earnings, revenue, income, or financial performance.
- **Risk tier:** read-only
- **Model:** haiku
- **Permission:** `revenue.read`
- **Entitlement gate:** `copilotEnabled` (always required)
- **Input schema (Zod):**
  ```ts
  z.object({
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Must be YYYY-MM-DD"),
    endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Must be YYYY-MM-DD"),
    category: z.string().optional(), // service category filter
  });
  ```
- **Wraps:** `src/actions/payment/getTotalPayment.ts` + direct DB aggregation on `db.invoice` (the revenue page reads DB directly — wrap that same logic into `src/actions/dashboard/data/getRevenueSummary.ts` as a new read action)
- **Refactor needed:** Yes — extract the revenue page's direct DB query into a `getRevenueSummary({ companyId, startDate, endDate, category })` action in `src/actions/dashboard/data/`. Currently only lives inline in the page component.
- **Output shape:**
  ```ts
  {
    totalRevenue: number,   // sum of grandTotal for invoices in range
    totalCost: number,      // sum of material costs
    grossProfit: number,    // revenue - cost
    paidCount: number,
    unpaidCount: number,
    dateRange: { startDate: string, endDate: string }
  }
  ```
- **AuditLog action string:** `revenue.read`
- **Requires confirmation token?:** No

---

### `get_payments_summary`

- **Description (for AI):** Fetch payment totals by method (card, cash, check, other) for a date range. Use when the user asks about payments collected, how clients paid, or payment totals.
- **Risk tier:** read-only
- **Model:** haiku
- **Permission:** `payments.read`
- **Entitlement gate:** `copilotEnabled`
- **Input schema (Zod):**
  ```ts
  z.object({
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  });
  ```
- **Wraps:** `src/actions/payment/getTotalPayment.ts`
- **Refactor needed:** No — `getTotalPayment` exists. Verify it accepts a date range parameter; if not, add optional `startDate`/`endDate` filtering.
- **Output shape:**
  ```ts
  {
    total: number,
    byMethod: { card: number, cash: number, check: number, other: number },
    paymentCount: number,
    dateRange: { startDate: string, endDate: string }
  }
  ```
- **AuditLog action string:** `payments.read`
- **Requires confirmation token?:** No

---

### `get_client_by_name`

- **Description (for AI):** Search for clients by name (fuzzy). Use when the user mentions a client name and you need their ID for another operation. Returns top 5 matches.
- **Risk tier:** read-only
- **Model:** haiku
- **Permission:** `client.read`
- **Entitlement gate:** `copilotEnabled`
- **Input schema (Zod):**
  ```ts
  z.object({
    searchTerm: z.string().min(2, "Search term must be at least 2 characters"),
  });
  ```
- **Wraps:** `db.client.findMany` with `ILIKE` search on `firstName + lastName + email`. Create `src/actions/client/searchClients.ts`.
- **Refactor needed:** Yes — create `searchClients({ searchTerm, companyId, take: 5 })` action. No existing fuzzy search action for clients.
- **Output shape:**
  ```ts
  Array<{
    id: number;
    firstName: string | null;
    lastName: string | null;
    email: string | null;
    phone: string | null;
    hasVehicles: boolean;
  }>;
  ```
- **AuditLog action string:** `client.read`
- **Requires confirmation token?:** No

---

### `get_vehicle_by_client`

- **Description (for AI):** List all vehicles associated with a client. Use after get_client_by_name when the user's request requires a vehicle ID.
- **Risk tier:** read-only
- **Model:** haiku
- **Permission:** `client.read`
- **Entitlement gate:** `copilotEnabled`
- **Input schema (Zod):**
  ```ts
  z.object({
    clientId: z.number().int().positive(),
  });
  ```
- **Wraps:** `db.vehicle.findMany({ where: { clientId, companyId } })`
- **Refactor needed:** Yes — create `src/actions/vehicle/getVehiclesByClient.ts`. No existing action for this lookup.
- **Output shape:**
  ```ts
  Array<{
    id: number;
    year: string | null;
    make: string | null;
    model: string | null;
    other: string | null;
    vin: string | null;
    licensePlate: string | null;
  }>;
  ```
- **AuditLog action string:** `client.read`
- **Requires confirmation token?:** No

---

### `get_inventory_item_by_name`

- **Description (for AI):** Search inventory items by name. Use when the user asks about stock, inventory, parts, or supplies.
- **Risk tier:** read-only
- **Model:** haiku
- **Permission:** `inventory.read`
- **Entitlement gate:** `copilotEnabled`
- **Input schema (Zod):**
  ```ts
  z.object({
    searchTerm: z.string().min(1),
    type: z.enum(["Product", "Supply"]).optional(),
  });
  ```
- **Wraps:** `db.inventoryProduct.findMany` with ILIKE on `name`, scoped to `companyId`
- **Refactor needed:** Yes — create `src/actions/inventory/searchInventory.ts`. Existing `src/actions/inventory/` has `create.ts` and update actions, but no fuzzy search.
- **Output shape:**
  ```ts
  Array<{
    id: number;
    name: string;
    type: "Product" | "Supply";
    quantity: number;
    price: number;
    unit: string;
    lowInventoryAlert: number | null;
  }>;
  ```
- **AuditLog action string:** `inventory.read`
- **Requires confirmation token?:** No

---

### `get_estimate_by_number`

- **Description (for AI):** Fetch a specific estimate or invoice by its ID (e.g. "EST-0042" or a full invoice ID). Use when the user references a specific estimate by number.
- **Risk tier:** read-only
- **Model:** haiku
- **Permission:** `estimate.read`
- **Entitlement gate:** `copilotEnabled`
- **Input schema (Zod):**
  ```ts
  z.object({
    invoiceId: z.string().min(1),
  });
  ```
- **Wraps:** `db.invoice.findFirst({ where: { id: invoiceId, companyId }, include: { client, vehicle, column } })`
- **Refactor needed:** Yes — create `src/actions/estimate/getEstimateById.ts`. No existing read action for a single estimate by ID.
- **Output shape:**
  ```ts
  {
    id: string,
    type: "Estimate" | "Invoice",
    status: string | null,   // the column title (e.g. "Pending", "Completed")
    grandTotal: number | null,
    clientName: string | null,
    vehicleInfo: string | null,
    createdAt: string,
    publicLink: string,      // ${NEXT_PUBLIC_APP_URL}/public-invoice/${id}
    editLink: string,        // /dashboard/estimate/edit/${id}
  }
  ```
- **AuditLog action string:** `estimate.read`
- **Requires confirmation token?:** No

---

### `get_appointments_for_date_range`

- **Description (for AI):** List appointments within a date range, optionally filtered by status or assigned user. Use when the user asks about upcoming or past appointments.
- **Risk tier:** read-only
- **Model:** haiku
- **Permission:** `appointment.read`
- **Entitlement gate:** `copilotEnabled`
- **Input schema (Zod):**
  ```ts
  z.object({
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    assignedUserId: z.number().int().positive().optional(),
    take: z.number().int().min(1).max(50).default(20),
  });
  ```
- **Wraps:** `db.appointment.findMany` with date range filter and optional `appointmentUser` filter
- **Refactor needed:** Yes — create `src/actions/appointment/getAppointments.ts` as a generic read action. The existing calendar page reads appointments directly in the page component.
- **Output shape:**
  ```ts
  Array<{
    id: number;
    title: string;
    date: string | null;
    startTime: string | null;
    endTime: string | null;
    clientName: string | null;
    vehicleInfo: string | null;
    assignedUsers: Array<{ id: number; name: string }>;
    notes: string | null;
  }>;
  ```
- **AuditLog action string:** `appointment.read`
- **Requires confirmation token?:** No

---

### `get_tasks_for_user`

- **Description (for AI):** List tasks assigned to the current user or all users (if Admin). Use when the user asks about their to-do list, pending tasks, or what's due.
- **Risk tier:** read-only
- **Model:** haiku
- **Permission:** `task.read`
- **Entitlement gate:** `copilotEnabled`
- **Input schema (Zod):**
  ```ts
  z.object({
    assignedUserId: z.number().int().positive().optional(), // if null, use session userId
    status: z.enum(["pending", "completed", "all"]).default("pending"),
    startDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional(),
    endDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional(),
    take: z.number().int().min(1).max(50).default(20),
  });
  ```
- **Wraps:** `db.task.findMany` with `taskUser` join. Non-admin users can only query their own tasks (tool handler enforces `assignedUserId = sessionUserId` regardless of AI-provided value if user is not Admin).
- **Refactor needed:** Yes — create `src/actions/task/getTasks.ts`. Currently no read-all action exists.
- **Output shape:**
  ```ts
  Array<{
    id: number;
    title: string;
    description: string | null;
    priority: "Low" | "Medium" | "High" | "Urgent";
    date: string | null;
    startTime: string | null;
    endTime: string | null;
    completed: boolean;
    assignedUsers: Array<{ id: number; name: string }>;
  }>;
  ```
- **AuditLog action string:** `task.read`
- **Requires confirmation token?:** No

---

## Reversible Write Tools (Sonnet)

---

### `create_lead`

- **Description (for AI):** Create a new lead in the sales pipeline. Requires at minimum a client name, phone number, and brief description of the vehicle or service they need.
- **Risk tier:** reversible-write
- **Model:** sonnet
- **Permission:** `lead.create`
- **Entitlement gate:** `copilotEnabled`
- **Input schema (Zod):**
  ```ts
  z.object({
    clientName: z.string().min(2, "Name must be at least 2 characters"),
    clientPhone: z.string().min(7, "Phone number too short").optional(),
    clientEmail: z.string().email().optional(),
    vehicleInfo: z.string().min(2).optional(), // "2022 Ford Mustang" or "Custom sign job"
    serviceDescription: z.string().optional(), // what service they need
    source: z
      .enum([
        "Referrals",
        "Meta",
        "Instagram",
        "TikTok",
        "Yelp",
        "Google",
        "Website",
        "Trade show",
        "LinkedIn",
        "Walk-in",
        "Phone Call",
        "Other",
      ])
      .default("Phone Call"),
    countryCode: z.string().default("US"),
  });
  ```
- **Wraps:** New `src/actions/lead/createLead.ts` (to be created in Phase 0 — wraps the extracted `createLeadRecord()` shared function)
- **Refactor needed:** Yes — Phase 0 prerequisite. Currently `db.lead.create` lives in `/api/lead-generate/route.ts`. Must extract `createLeadRecord(data, companyId)` first.
- **Output shape:**
  ```ts
  {
    leadId: number,
    clientName: string,
    column: "New Leads",
    pipelineLink: string,   // /dashboard/pipeline
    message: "Lead created for [name]"
  }
  ```
- **AuditLog action string:** `lead.create`
- **Requires confirmation token?:** No

---

### `create_appointment`

- **Description (for AI):** Schedule a new appointment. Ask for date, time, client, and service type if not provided.
- **Risk tier:** reversible-write
- **Model:** sonnet
- **Permission:** `appointment.create`
- **Entitlement gate:** `copilotEnabled`
- **Input schema (Zod):**
  ```ts
  z.object({
    title: z.string().min(2),
    date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional(),
    startTime: z.string().optional(), // "09:00"
    endTime: z.string().optional(), // "10:30"
    clientId: z.number().int().positive().optional(),
    vehicleId: z.number().int().positive().optional(),
    assignedUsers: z.array(z.number().int().positive()).default([]),
    notes: z.string().optional(),
    draftEstimate: z.string().nullable().default(null),
    timezone: z.string().optional(),
  });
  ```
- **Wraps:** `src/actions/appointment/addAppointment.ts` — `addAppointment()`
- **Refactor needed:** No — `addAppointment` is reusable as-is. The copilot passes `forceCompanyId` and `forceUserId` from session, never from AI input.
- **Output shape:**
  ```ts
  {
    appointmentId: number,
    title: string,
    date: string | null,
    startTime: string | null,
    calendarLink: string,   // /dashboard/task?date=YYYY-MM-DD
    message: "Appointment scheduled: [title]"
  }
  ```
- **AuditLog action string:** `appointment.create`
- **Requires confirmation token?:** No

---

### `update_appointment`

- **Description (for AI):** Update an existing appointment's date, time, notes, or assigned users. Requires the appointment ID.
- **Risk tier:** reversible-write
- **Model:** sonnet
- **Permission:** `appointment.update`
- **Entitlement gate:** `copilotEnabled`
- **Input schema (Zod):**
  ```ts
  z.object({
    appointmentId: z.number().int().positive(),
    title: z.string().min(2).optional(),
    date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional(),
    startTime: z.string().optional(),
    endTime: z.string().optional(),
    notes: z.string().optional(),
    assignedUsers: z.array(z.number().int().positive()).optional(),
  });
  ```
- **Wraps:** `src/actions/appointment/updateAppointment.ts` (verify this action exists; if not, create it as a thin `db.appointment.update` wrapper)
- **Refactor needed:** Verify — check `src/actions/appointment/` for an update action. May need to create one.
- **Output shape:**
  ```ts
  { appointmentId: number, message: "Appointment updated" }
  ```
- **AuditLog action string:** `appointment.update`
- **Requires confirmation token?:** No

---

### `create_task`

- **Description (for AI):** Create a new task. Ask for title, due date, priority, and assigned user if not provided.
- **Risk tier:** reversible-write
- **Model:** sonnet
- **Permission:** `task.create`
- **Entitlement gate:** `copilotEnabled`
- **Input schema (Zod):**
  ```ts
  z.object({
    title: z.string().min(2),
    description: z.string().optional(),
    priority: z.enum(["Low", "Medium", "High", "Urgent"]).default("Medium"),
    date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional(),
    startTime: z.string().optional(),
    endTime: z.string().optional(),
    assignedUsers: z.array(z.number().int().positive()).default([]),
    clientId: z.number().int().positive().optional(),
    invoiceId: z.string().optional(),
  });
  ```
- **Wraps:** `src/actions/task/createTask.ts` — `createTask()`
- **Refactor needed:** No — `createTask` is reusable as-is. Add `createdBy: "copilot"` to the task data (the `TaskType` interface already has `createdBy?: "user" | "sales_agent"` — extend to include `"copilot"`).
- **Output shape:**
  ```ts
  {
    taskId: number,
    title: string,
    calendarLink: string,
    message: "Task created: [title]"
  }
  ```
- **AuditLog action string:** `task.create`
- **Requires confirmation token?:** No

---

### `update_task`

- **Description (for AI):** Update an existing task's title, description, priority, due date, or completion status.
- **Risk tier:** reversible-write
- **Model:** sonnet
- **Permission:** `task.update`
- **Entitlement gate:** `copilotEnabled`
- **Input schema (Zod):**
  ```ts
  z.object({
    taskId: z.number().int().positive(),
    title: z.string().min(2).optional(),
    description: z.string().optional(),
    priority: z.enum(["Low", "Medium", "High", "Urgent"]).optional(),
    date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional(),
    completed: z.boolean().optional(),
    assignedUsers: z.array(z.number().int().positive()).optional(),
  });
  ```
- **Wraps:** `src/actions/task/updateTask.ts` (verify this action exists)
- **Refactor needed:** Verify — check `src/actions/task/` for an update action.
- **Output shape:**
  ```ts
  { taskId: number, message: "Task updated" }
  ```
- **AuditLog action string:** `task.update`
- **Requires confirmation token?:** No

---

### `create_draft_estimate`

- **Description (for AI):** Create a draft estimate shell for a client. This opens the estimate form for the user to fill in line items. Use when a user wants to start an estimate for a client.
- **Risk tier:** reversible-write
- **Model:** sonnet
- **Permission:** `estimate.create`
- **Entitlement gate:** `copilotEnabled`
- **Input schema (Zod):**
  ```ts
  z.object({
    clientId: z.number().int().positive(),
    vehicleId: z.number().int().positive().optional(),
    leadId: z.number().int().positive().optional(),
  });
  ```
- **Wraps:** `src/actions/pipelines/createLeadDraftEstimate.ts` — `createLeadDraftEstimate()`
- **Refactor needed:** Minor — `createLeadDraftEstimate` requires `leadId`. If the user doesn't have a lead (just a client), fall back to `src/actions/estimate/invoice/createDraft.ts` — `createDraftEstimate()`. The tool handler selects the appropriate action based on whether `leadId` is provided.
- **Output shape:**
  ```ts
  {
    estimateId: string,
    clientName: string | null,
    editLink: string,      // /dashboard/estimate/edit/${estimateId}
    publicLink: string,    // ${NEXT_PUBLIC_APP_URL}/public-invoice/${estimateId}
    message: "Draft estimate created. Click to add line items: [editLink]"
  }
  ```
- **AuditLog action string:** `estimate.create`
- **Requires confirmation token?:** No

---

### `create_inventory_item`

- **Description (for AI):** Add a new product or supply item to inventory. Ask for name, type (product or supply), quantity, and price if not provided.
- **Risk tier:** reversible-write
- **Model:** sonnet
- **Permission:** `inventory.create`
- **Entitlement gate:** `copilotEnabled`
- **Input schema (Zod):**
  ```ts
  z.object({
    name: z.string().min(2),
    type: z.enum(["Product", "Supply"]),
    quantity: z.number().positive().default(1),
    price: z.number().min(0).default(0),
    unit: z.string().default("pc"),
    description: z.string().optional(),
    lowInventoryAlert: z.number().int().positive().optional(),
  });
  ```
- **Wraps:** `src/actions/inventory/create.ts` — `createProduct()`
- **Refactor needed:** No — `createProduct` is reusable as-is with modern return shape.
- **Output shape:**
  ```ts
  {
    productId: number,
    name: string,
    type: string,
    quantity: number,
    inventoryLink: string,   // /dashboard/inventory
    message: "Added [name] to inventory"
  }
  ```
- **AuditLog action string:** `inventory.create`
- **Requires confirmation token?:** No

---

### `update_inventory_item`

- **Description (for AI):** Update an inventory item's quantity, price, or description. Use when a user wants to adjust stock levels or pricing.
- **Risk tier:** reversible-write
- **Model:** sonnet
- **Permission:** `inventory.update`
- **Entitlement gate:** `copilotEnabled`
- **Input schema (Zod):**
  ```ts
  z.object({
    productId: z.number().int().positive(),
    quantity: z.number().positive().optional(),
    price: z.number().min(0).optional(),
    description: z.string().optional(),
    lowInventoryAlert: z.number().int().positive().optional(),
  });
  ```
- **Wraps:** `src/actions/inventory/update.ts` (verify this action exists; may need to create)
- **Refactor needed:** Verify — check `src/actions/inventory/` for an update action. The inventory history row should also be written (type: "Purchase" or "Sale" depending on quantity direction).
- **Output shape:**
  ```ts
  { productId: number, message: "Inventory updated" }
  ```
- **AuditLog action string:** `inventory.update`
- **Requires confirmation token?:** No

---

## External-effect Tools (Sonnet, confirmation required)

---

### `preview_send_estimate`

- **Description (for AI):** Preview what will be sent to the client before actually sending an estimate. Always call this before send_estimate_to_client. Returns a preview summary and a confirmation token.
- **Risk tier:** read-only (preview only — no external effect)
- **Model:** sonnet
- **Permission:** `estimate.send`
- **Entitlement gate:** `copilotEnabled`
- **Input schema (Zod):**
  ```ts
  z.object({
    invoiceId: z.string().min(1),
    channel: z.enum(["email", "sms", "auto"]).default("auto"),
    // "auto" = email if client has email, otherwise sms
  });
  ```
- **Wraps:** `db.invoice.findUnique` with client + company + template. No actual send.
- **Refactor needed:** No — this is new logic. Fetches the same data as `sendInvoiceEmail` but returns a preview instead of sending.
- **Output shape:**
  ```ts
  {
    estimateId: string,
    recipientName: string,
    recipientContact: string,    // email address or phone number (masked: j***@gmail.com)
    channel: "email" | "sms",
    subjectPreview: string,      // first 100 chars of email subject
    bodyPreview: string,         // first 200 chars of message body
    publicLink: string,          // the link that will be included
    grandTotal: string,          // formatted: "$1,250.00"
    confirmationToken: string,   // UUID stored in CopilotSession.pendingConfirmations
    tokenExpiresAt: string,      // ISO 8601, 10 minutes from now
  }
  ```
- **AuditLog action string:** `estimate.preview`
- **Requires confirmation token?:** No (this IS the preview that generates the token)

---

### `send_estimate_to_client`

- **Description (for AI):** Send a previously previewed estimate to the client by email or SMS. Requires a confirmation token from preview_send_estimate. Do not call this without first calling the preview tool.
- **Risk tier:** external-effect
- **Model:** sonnet
- **Permission:** `estimate.send`
- **Entitlement gate:** `copilotEnabled`
- **Input schema (Zod):**
  ```ts
  z.object({
    invoiceId: z.string().min(1),
    confirmationToken: z.string().uuid("Must be a valid confirmation token"),
    channel: z.enum(["email", "sms"]),
  });
  ```
- **Wraps:** New `src/actions/estimate/invoice/sendEstimate.ts` — `sendEstimateToClient({ invoiceId, channel })` (Phase 0 prerequisite)
- **Refactor needed:** Yes — Phase 0 prerequisite. Create unified `sendEstimateToClient` wrapper that dispatches to email or SMS gateway, returns `ServerAction` shape.
- **Output shape:**
  ```ts
  {
    estimateId: string,
    channel: "email" | "sms",
    recipientContact: string,   // masked
    sentAt: string,             // ISO 8601
    message: "Estimate sent to [clientName] via [channel]"
  }
  ```
- **AuditLog action string:** `estimate.send`
- **Requires confirmation token?:** Yes — paired with `preview_send_estimate`. Token must be valid and not expired.

---

### `preview_send_invoice`

- **Description (for AI):** Preview what will be sent to the client before actually sending an invoice. Always call this before send_invoice_to_client.
- **Risk tier:** read-only (preview only)
- **Model:** sonnet
- **Permission:** `invoice.send`
- **Entitlement gate:** `copilotEnabled`
- **Input schema (Zod):**
  ```ts
  z.object({
    invoiceId: z.string().min(1),
    channel: z.enum(["email", "sms", "auto"]).default("auto"),
  });
  ```
- **Wraps:** Same preview logic as `preview_send_estimate` (invoices and estimates share the same `Invoice` model and public URL). Can reuse the same preview handler with a type check.
- **Refactor needed:** No — same handler as estimate preview, different `type` check.
- **Output shape:** Same as `preview_send_estimate`
- **AuditLog action string:** `invoice.preview`
- **Requires confirmation token?:** No (generates the token)

---

### `send_invoice_to_client`

- **Description (for AI):** Send a previously previewed invoice to the client. Requires a confirmation token from preview_send_invoice.
- **Risk tier:** external-effect
- **Model:** sonnet
- **Permission:** `invoice.send`
- **Entitlement gate:** `copilotEnabled`
- **Input schema (Zod):**
  ```ts
  z.object({
    invoiceId: z.string().min(1),
    confirmationToken: z.string().uuid(),
    channel: z.enum(["email", "sms"]),
  });
  ```
- **Wraps:** Same `sendEstimateToClient` wrapper (handles both Invoice and Estimate types — they share the `Invoice` model)
- **Refactor needed:** No (same wrapper as send_estimate_to_client)
- **Output shape:** Same as `send_estimate_to_client`
- **AuditLog action string:** `invoice.send`
- **Requires confirmation token?:** Yes — paired with `preview_send_invoice`.

---

## Tool Selection Guidance for the AI

_This section goes into the system prompt._

```
## Tool Usage Guide

BEFORE calling any tool, ask yourself:
1. Do I have everything I need? If not, ask the user ONE question at a time.
2. Is this a read or a write? Read tools are safe to call immediately. Write tools change data.
3. Will this contact the client externally? If yes, ALWAYS call the preview_ tool first.

### Finding data before acting
- Need a client ID? → get_client_by_name first
- Need a vehicle ID? → get_vehicle_by_client after finding the client
- Need an estimate ID? → get_estimate_by_number
- Never guess IDs. Always look them up.

### Chaining tools correctly
GOOD:  get_client_by_name → [user confirms] → create_appointment (with clientId)
GOOD:  get_estimate_by_number → preview_send_estimate → [user confirms] → send_estimate_to_client
BAD:   create_appointment with a made-up clientId
BAD:   send_estimate_to_client without calling preview first

### When to use Haiku vs Sonnet
- You don't control model selection — the dispatcher handles this.
- Read-only tools automatically use a faster model.

### What to confirm before writing
For creates and updates: summarize what you're about to do and ask "Shall I proceed?"
For sends (external-effect): you MUST call preview_ first. The system won't let you skip this.

### What you cannot do
- Cross-company data access: you only see data for this company
- Full estimate line-item building: create the draft shell, then send the user to the edit page
- Delete leads, delete estimates, delete clients: out of scope for v1
- Billing changes, user management, company settings: not a copilot tool
```

---

## Common Error Patterns → User-Friendly Messages

The tool handlers map common error conditions to human-readable messages that Anthropic receives in `tool_result` and relays to the user:

| Condition                       | Error returned to AI                                                  | AI says to user                                                                                     |
| ------------------------------- | --------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| `canUserDo` returns false       | `"Permission denied: you don't have access to [feature]."`            | "You don't have permission to do that. Contact your admin."                                         |
| Zod validation fails (phone)    | `"Invalid input: phone number must be at least 7 digits"`             | "I need a valid phone number to create that lead. What's their number?"                             |
| Client not found                | `"No client found matching '[name]' in your company."`                | "I couldn't find a client named [name]. Can you double-check the spelling or give me more details?" |
| Estimate not found              | `"Invoice [id] not found in your company."`                           | "I couldn't find that estimate. Can you check the number again?"                                    |
| Lead already exists (duplicate) | `"A lead already exists for this client."`                            | "It looks like there's already a lead for that client. Want me to find it instead?"                 |
| `confirmationToken` missing     | `"No confirmation found. You must call preview_send_estimate first."` | "I need to show you a preview before sending. Let me pull up the estimate details first."           |
| `confirmationToken` expired     | `"Confirmation expired (10 min limit). Please preview again."`        | "That confirmation has expired. Want me to pull up a fresh preview?"                                |
| DB error (unexpected)           | `"Something went wrong. Our team has been notified."`                 | "Hmm, something went wrong on my end. Our team has been notified. Want to try again in a moment?"   |
| Rate limit (soft)               | Not returned as error — added to system context                       | (copilot may note usage nearing limit if relevant)                                                  |
| `hasCopilot: false`             | 403 response to client (not tool_result)                              | Toast: "You don't have a copilot seat. Ask your admin to assign one."                               |
| Company not on copilot          | 403 response to client                                                | Toast: "AI Copilot isn't enabled for your account."                                                 |

---

## Tool Implementation File Structure

```
src/lib/copilot/
├── index.ts                    — exports COPILOT_TOOLS array for Anthropic API
├── permissions.ts              — canUserDo() helper
├── dispatcher.ts               — tool execution router, model selection
├── normalize.ts                — normalizeActionResult() wrapper
├── confirmation.ts             — token generation, validation, storage helpers
└── tools/
    ├── read/
    │   ├── getRevenueSummary.ts
    │   ├── getPaymentsSummary.ts
    │   ├── getClientByName.ts
    │   ├── getVehicleByClient.ts
    │   ├── getInventoryItemByName.ts
    │   ├── getEstimateByNumber.ts
    │   ├── getAppointmentsForDateRange.ts
    │   └── getTasksForUser.ts
    ├── write/
    │   ├── createLead.ts
    │   ├── createAppointment.ts
    │   ├── updateAppointment.ts
    │   ├── createTask.ts
    │   ├── updateTask.ts
    │   ├── createDraftEstimate.ts
    │   ├── createInventoryItem.ts
    │   └── updateInventoryItem.ts
    └── external/
        ├── previewSendEstimate.ts
        ├── sendEstimateToClient.ts
        ├── previewSendInvoice.ts
        └── sendInvoiceToClient.ts
```

Each tool file exports:

```ts
export const toolDef: Tool = { name, description, input_schema }; // for Anthropic
export async function execute(
  input: unknown,
  ctx: SessionContext,
): Promise<ToolResult>;
```
