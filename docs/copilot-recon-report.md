# AutoWorx AI Copilot — Codebase Recon Report

> Branch: `development` | Date: 2026-05-10 | Investigator: Claude Code (read-only)

---

## 1. Authentication & Session

### NextAuth Config Location

- Entry point: `src/app/api/auth/[...nextauth]/route.ts` — thin handler
- Actual config: `src/authOptions.ts`
- Strategy: **JWT** with Credentials + Google providers; custom refresh via `/api/auth/refresh-token`

### Session Type Augmentation (`src/authOptions.ts:12-39`)

```ts
interface Session {
  user: {
    id: string;
    name: string;
    email: string;
    image: string;
    role: string; // "admin" | "employee"
    companyId: number;
    employeeType: string; // "Admin"|"Manager"|"Sales"|"Technician"|"Other"
    isSuperAdmin: boolean;
  };
  accessToken: string;
  error?: "RefreshAccessTokenError";
}
```

### JWT Callback (`src/authOptions.ts:139-189`)

On initial login: verifies `user.accessToken` (signed with `ACCESS_SECRET`), persists `id, name, email, role, companyId, employeeType, isSuperAdmin, accessToken, refreshToken, accessTokenExpires`. On subsequent requests: refreshes from `db.user` if token expired → calls `refreshAccessToken()`.

### Session Callback (`src/authOptions.ts:190-204`)

Mirrors all token fields onto `session.user.*` and sets `session.accessToken` and `session.error`.

### Key Auth Helpers

| Helper                 | File                        | Returns                                                        |
| ---------------------- | --------------------------- | -------------------------------------------------------------- |
| `getCompanyId()`       | `src/lib/companyId.ts`      | `session?.user?.companyId as number` (React `cache()`-wrapped) |
| `getEssentials()`      | `src/lib/auth-utils.ts`     | `{ companyId, userId }` from session                           |
| `getUserFromSession()` | `src/lib/getCurrentUser.ts` | Full user object from DB or session                            |
| `getUser()`            | `src/lib/getUser.ts`        | Full Prisma `User`; redirects to `/login` if no session        |

### Mobile / Bearer Auth Flow

There is **no `src/app/api/_shared.ts`** and no `extractCompanyId` function. Mobile auth is handled in `src/proxy.ts` (the Next.js middleware):

- Routes starting with `/api/` that have no NextAuth session cookie and aren't in `PUBLIC_API_ROUTES` are treated as external API calls
- Require `Authorization: Bearer <token>` validated via `jwtVerifyToken`
- Client-side bearer attach: `src/helpers/next-axios.ts` — axios instance with `Authorization: Bearer ${session.accessToken}`, auto-signs out on 401
- Server-side bearer helpers: `src/helpers/server-auth.ts` — `getServerAccessToken()`, `getServerAuthHeaders()`, `createServerAxiosConfig()`

---

## 2. Permission System

### Prisma Models

**User** (`prisma/schema.prisma:2208-2270`):

```prisma
model User {
  id             Int          @id @default(autoincrement())
  firstName      String?
  lastName       String?
  email          String       @unique
  password       String?
  role           Role         @default(admin)        // admin | employee
  employeeType   EmployeeType @default(Admin)        // Admin|Manager|Sales|Technician|Other
  isSuperAdmin   Boolean      @default(false)
  companyId      Int
  phone          String?
  timezone       String?
  commission     Decimal      @default(0)
  // ... + many relations
  permissions    Permission?
}
```

**Permission** (per-user overrides, `prisma/schema.prisma:2429-2456`):

```prisma
model Permission {
  userId                          Int     @unique
  companyId                       Int
  communicationHubInternal        Boolean @default(true)
  communicationHubClients         Boolean @default(true)
  communicationHubCollaboration   Boolean @default(true)
  estimatesInvoices               Boolean @default(true)
  calendarTask                    Boolean @default(true)
  payments                        Boolean @default(true)
  workforceManagement             Boolean @default(true)
  reporting                       Boolean @default(true)
  inventoryAll                    Boolean @default(true)
  integrations                    Boolean @default(true)
  salesPipeline                   Boolean @default(true)
  shopPipeline                    Boolean @default(true)
  businessSettings                Boolean @default(true)
  workforceManagementViewOnly     Boolean @default(false)
  reportingViewOnly               Boolean @default(false)
  inventoryAllViewOnly            Boolean @default(false)
  @@unique([userId, companyId])
}
```

**Role-based defaults**: `PermissionForManager`, `PermissionForSales`, `PermissionForTechnician`, `PermissionForOther` models with same boolean fields, keyed by `companyId`. These are per-company role defaults.

**CompanyPermissionModule** (feature gates per company):

```prisma
model CompanyPermissionModule {
  id              Int     @id @default(autoincrement())
  companyId       Int
  permission_name String
  title           String
  enabled         Boolean
  @@unique([companyId, permission_name])
}
```

### Permission Architecture

- **Two-layer system**: Company-level feature gate (`CompanyPermissionModule`) + user-level override (`Permission`)
- **Not string-based** — no `"estimate.create"` strings. All permissions are boolean fields on model instances
- **Resolution**: `getPermissions()` in `src/lib/getPermissions.ts` returns discriminated union by role:
  - `role: "Admin"` → `companyPermissions: null` (full access, no per-user check needed)
  - Other roles → both `companyPermissions` (role defaults) and `userPermissions` (per-user override)
  - User permission takes precedence over role default when set
- **Feature entitlement layer** (newer): `src/lib/platform-billing/entitlement-service.ts` → `getCompanyEntitlements(companyId)` returns typed `Entitlements` object (`canUseVoice, canUseSms, aiSmartReplies, awxSalesAgent`, etc.)

### Permission Check Pattern

```ts
// src/app/(dashboard)/dashboard/components/box/RecentMessagesBox.tsx:14-28
const permissions = await getPermissions();
const hasMessagePermission =
  permissions?.role === "Admin" ||
  (userPermissions?.communicationHubInternal !== undefined
    ? userPermissions.communicationHubInternal
    : companyPermissions?.communicationHubInternal !== false);
```

### Route-Level Guards

- `src/lib/routeAccess.ts` — `canAccessRoute(route, permissions)` maps routes to permission keys
- `src/lib/routePermissionsMap.ts` — `ROUTE_PERMISSIONS_MAP` and `FEATURE_PERMISSIONS_MAP`
- `src/lib/permissionModule.ts` — human-readable labels for permission keys

### All Distinct Permission Keys

**User-level booleans**: `communicationHubInternal`, `communicationHubClients`, `communicationHubCollaboration`, `estimatesInvoices`, `calendarTask`, `payments`, `workforceManagement`, `reporting`, `inventoryAll`, `integrations`, `salesPipeline`, `shopPipeline`, `businessSettings`, `workforceManagementViewOnly`, `reportingViewOnly`, `inventoryAllViewOnly`

**CompanyPermissionModule permission_name values**: `virtual-shop`, `calendar`, `directory`, `automation`, `communicationHub`, `sales-agent`, `communication`, `callingAccess`, `aiSmartReplies`, `visualization`, plus automation subtypes: `pipelineAutomation`, `communicationAutomation`, `invoiceAutomation`, `inventoryAutomation`, `tagAutomation`, `serviceAutomation`, `marketingAutomation`, `reportingAutomation`

### Super Admin / Owner Bypass

- `User.isSuperAdmin Boolean @default(false)` — propagated through JWT/session
- SuperAdmin-only routes: `/awx-dashboard/*` — enforced in `src/lib/routeAccess.ts:17-22`
- `employeeType: "Admin"` bypasses all per-feature permission checks → `companyPermissions: null`
- No "owner" role concept; Admin + isSuperAdmin is the highest privilege

---

## 3. Server Action Patterns

### Folder Structure (`src/actions/`)

```
appointment/      auth/         automation/      booking/
bug-report/       calendar-settings/  category/  client/
common/           communication/  coupon/        dashboard/
employee/         estimate/       fleet/         inventory/
lead/             message/        notification/  payment/
pipelines/        platform-billing/  s3/         services/
settings/         shortener/      source/        status/
tag/              task/           two-factor/    user/
userFeedback/     vehicle/        vendor/
```

Server actions are **centralized in `src/actions/`**, not colocated with pages.

### Return Value Convention

Two coexisting patterns:

**(a) Discriminated union — preferred modern pattern** (`src/types/action.ts`):

```ts
export interface ServerAction {
  type: "error" | "success";
  message?: string;
  field?: string; // for field-level validation errors
  data?: any;
}
```

On errors, most newer actions call `errorHandler(error)` from `src/error-boundary/globalErrorHandler.ts`, returning:

```ts
type TErrorHandler = {
  success: false;
  type: "globalError";
  statusCode: number;
  message: string;
  errorSource: string;
  stack?: string;
};
```

**(b) Simple object — older pattern**:

```ts
return { success: true };
return { success: false, message: "Something went wrong" };
// or bare throw new Error(...)
```

Read actions often return the data directly (`Promise<ReturnPayment[]>`) with no envelope.

### Example: Create Action (`src/actions/task/createTask.ts`)

```ts
export async function createTask(
  task: TCreateTaskValidationSchema,
): Promise<ServerAction | TErrorHandler> {
  try {
    const companyId = await getCompanyId();
    const newTask = await db.task.create({ data: { ...task, companyId } });
    // sends notification, creates Google Calendar event
    return { type: "success", data: newTask };
  } catch (error) {
    return errorHandler(error);
  }
}
```

### Example: Read Action (`src/actions/payment/getPayments.ts`)

```ts
export async function getPayments(): Promise<ReturnPayment[]> {
  const companyId = await getCompanyId();
  return db.payment.findMany({
    where: { companyId },
    include: {
      invoice: { include: { vehicle, client } },
      card,
      cash,
      check,
      other,
      deposit,
    },
  });
}
```

**Input validation**: Zod schemas defined in `src/validation/` or inline. Estimate creation uses `estimateCreateValidationSchema` from a dedicated validation file.

---

## 4. Key Feature Files

### Lead Creation

- **Server action**: `src/actions/lead/createLeadFromForm.ts` — POSTs to `/api/lead-generate` with `X-TOKEN: company.zapierToken`
- **Actual DB write**: `src/app/api/lead-generate/route.ts:185` — authenticated via `X-TOKEN` matching `company.zapierToken`; inserts into `"New Leads"` column with `type: "sales"`
- **Lead list**: `src/actions/pipelines/getLeads.ts` — `getLeads({columnId, orderBy, take, skip, searchTerm, companyId})`

### Estimate Creation

- **Draft** (from pipeline): `src/actions/estimate/invoice/createDraft.ts`
  ```ts
  export async function createDraftEstimate({ id, clientId, vehicleId }) {
    // Creates invoice row with type: "Estimate" in "Pending" shop column
    // Sets lead.isEstimateCreated = true
    // Triggers updateInvoiceAutomationTrigger + sendEstimateCreateNotification
  }
  ```
- **Pipeline lead draft**: `src/actions/pipelines/createLeadDraftEstimate.ts`
- **Full estimate/invoice**: `src/actions/estimate/invoice/create.ts` (558 lines)
  ```ts
  // Zod-validated via estimateCreateValidationSchema
  export async function createInvoice(
    props,
  ): Promise<ServerAction | TErrorHandler> {
    // props: subtotal, discount, tax, deposit, items, photos, tasks,
    //        coupon, columnId, inspections, clientId, vehicleId, ...
  }
  ```

### Send Estimate to Client

- **Email**: `src/actions/estimate/invoice/sendInvoiceEmail.ts`
  - Fetches invoice, substitutes `<CLIENT>`, `<VEHICLE>`, `<BUSINESS_NAME>` placeholders
  - Generates short link via `getOrCreateInvoiceShortLink()`
  - Fallback public URL: `${NEXT_PUBLIC_APP_URL}/public-invoice/${invoice.id}`
  - Sends via `sendInfobipEmail` (or Mailgun/SES/SendGrid variants)
- **SMS**: `src/actions/estimate/invoice/sendInvoiceSms.ts` — same pattern, via `sendTwilioMessage` / `sendInfobipMessage`
- Other send variants: `sendCollaborationInvoiceSms.ts`, `sendMailgunEmail.ts`, `sendSESMail.ts`, `sendSendgridMail.ts`

### Digital Estimate Public URL Pattern

**`/public-invoice/[invoiceId]`** — estimates and invoices share one public surface.

- Page: `src/app/(public)/public-invoice/[invoiceId]/page.tsx`
- Wrapped by `ProtectedRouteForViewInvoice.tsx`
- Short-link model: `ShortLink` in Prisma schema (~line 2595)
- No separate `/public/estimate/[token]` route exists

### Inventory / Material Creation

- **InventoryProduct**: `src/actions/inventory/create.ts` → `createProduct(data)`
  ```ts
  // Required: name, type ("Product"|"Supply")
  // Optional: categoryId, vendorId, description, price, quantity, lot, unit, lowInventoryAlert
  // Auto-creates paired inventoryProductHistory row of type "Purchase"
  ```
- **Estimate material (line item)**: `src/actions/estimate/material/newMaterial.ts` → `newMaterial({name, categoryId?, vendorId?, tags?, notes?, quantity?, cost?, sell?, discount?, addToInventory?})`
  - If `addToInventory: true` → calls `createProduct` first, then creates `Material` linked via `productId`

### Appointment / Calendar Event Creation

- `src/actions/appointment/addAppointment.ts` → `addAppointment(appointment: TCreateAppointmentValidationSchema)`
  - Creates `db.appointment` + `appointmentUser` rows
  - Optionally creates draft estimate (Pending column)
  - Schedules SMS reminders via `scheduleRemindersInNest` (external Nest.js service)
  - Syncs to Google Calendar via `syncAppointmentToGoogleCalendar`
  - Sends `sendAppointmentConfirmation` + `sendNewAppointmentNotification`

### Task Creation

- `src/actions/task/createTask.ts` → `createTask(task: TCreateTaskValidationSchema)`
  - Creates `db.task` + `taskUser` rows for assigned users
  - Sends `sendNewTaskAssignNotification`
  - Optionally creates Google Calendar event via `createGoogleCalendarEvent`

---

## 5. Existing AI / LLM Integrations

**Only Groq is integrated.** No Anthropic, OpenAI, `@ai-sdk`, or Google Gemini packages found.

### Groq Usage

```ts
// src/actions/communication/ai-reply/smart-reply.ts:1-10
import Groq from "groq-sdk";
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY! });

// Model: llama-3.3-70b-versatile
// response_format: { type: "json_object" }
// Returns: SmartSuggestion[]
```

Function: `getSmartReplies({ clientId, companyId, maxSuggestions, tone, mode: "suggest"|"enhance", draft?, context: "sms"|"email" })`

- Gated by `entitlements.aiSmartReplies` via `getCompanyEntitlements(companyId)`
- 15-minute in-memory MD5-keyed cache
- Context assembled from: last 10 SMS/emails, vehicles, lead services, last 3 invoices

### AI Training Data Routes (no LLM calls — persist config for external service)

`src/app/api/ai-train/` CRUD routes manage: `personality`, `faq`, `conversation-examples`, `sms-delay`, `company-knowledge`, `service-playbooks`, `knowledge-base/documents`, `sales-agent-metrics`, `clone-playbooks`

Corresponding Prisma models: `AiPersonality`, `ConversationExample`, `KnowledgeBaseDocument`, `ServicePlaybook`, `FAQ`, `PricingRule`, `CompanyInfo`, `SMSDelay`

### No existing files

- `src/lib/ai.ts` — does not exist
- `src/lib/anthropic.ts` — does not exist
- `src/lib/llm.ts` — does not exist

---

## 6. UI Components & Layout

### TopNavbar (`src/components/TopNavbar.tsx`)

```tsx
export default function TopNavbar() {
  const { companyFeaturePermission } = useCompanyFeaturePermissionStore();
  const virtualShopPermission = companyFeaturePermission?.find(
    (p) => p.permission_name === "virtual-shop",
  );
  return (
    <div className="hidden h-[6vh] items-center justify-end p-5 pr-10 sm:flex">
      {virtualShopPermission?.enabled && <ShopList />}
      <TopNavbarIcons />
    </div>
  );
}
```

### TopNavbarIcons (`src/components/TopNavbarIcons.tsx`)

Icon row (left to right): reload button → `/dashboard/resources` SquarePlay link → `QuickLink` (Admin/Manager/Sales only) → `BugReport` (off-dashboard) → `<NotificationsPopover />` (dynamic import, `ssr: false`) → `LogoutBtn`

**→ Add copilot chat icon immediately before or after `<NotificationsPopover />`**

### Notification Bell (`src/components/NotificationProvider.tsx`)

```tsx
// Uses shadcn Popover + PopoverTrigger, inline SVG bell icon
// Red Badge for unread count (99+ cap)
// Pusher channel: noti-${userId}
// Actions: getNotifications(), markAsAllRead(), markAsReadById()
```

### Chat / Messaging UI Components

No reusable generic `ChatPanel`. Each surface has bespoke components:

- Internal comms: `src/app/(dashboard)/dashboard/communication/internal/` — `UserMessageBox.tsx`, `GroupMessageBox.tsx`, `EmptyMessageBox.tsx`
- Client comms: `src/app/(dashboard)/dashboard/communication/client/_component/conversations/`
- Bug report chat: `src/components/bug-report/` — `ChatHeader.tsx`, `ChatInput.tsx`, `MessageCard.tsx`, `MessageBubbleSkeleton.tsx`, `OptimisticMessageCard.tsx`

**Most reusable pattern for Copilot**: bug-report chat components — they already implement optimistic updates and message bubbles

### Modal / Drawer / Slide-over Primitives

Available in `src/components/ui/`:

- `sheet.tsx` — Radix Dialog-based slide-over (`data-slot="sheet"`)
- `drawer.tsx` — vaul-based bottom drawer
- `dialog.tsx` — standard modal
- `popover.tsx` — for notification bell pattern

**Recommendation**: Use `Sheet` (slide-over) for the copilot chat panel — consistent with existing patterns and leaves main content visible.

---

## 7. Conversation / Message Persistence

### Existing Models

**Flat Message pattern** — no parent `Conversation`/`Thread` model exists.

```prisma
model Message {
  id        Int              @id @default(autoincrement())
  to        Int?             // recipient userId (nullable for group)
  from      Int              // sender userId
  message   String           @db.Text
  groupId   Int?             // FK to Group
  section   MessageSection?  // internal | collaboration
  attachments Attachment[]
  chatTrack ChatTrack[]
  createdAt DateTime         @default(now())
}

model ChatTrack {
  id          Int     @id @default(autoincrement())
  senderId    Int
  receiverId  Int
  messageId   Int     // points to last Message
  lastMessage String
  isRead      Boolean @default(false)
  section     MessageSection?
}
```

**For CollaborationMessages** (cross-company):

```prisma
model CollaborationMessage {
  id              Int    @id @default(autoincrement())
  fromCompanyId   Int
  toCompanyId     Int
  senderUserId    Int
  message         String @db.Text
  section         MessageSection?
  attachment      Attachment[]
  companyChatTrackId Int?
}
model CompanyChatTrack {  // last-message tracker for company pairs
  senderCompanyId   Int
  receiverCompanyId Int
  messageId         Int
  lastMessage       String
  isRead            Boolean
}
```

**Client comms**: Separate tables — `ClientSMS`, `ClientCall`, `MailgunEmail` — not unified under `Message`.

### Recommended Copilot Storage Pattern

Model after flat `Message` + `ChatTrack` pattern:

- `CopilotMessage` table: `id, sessionId (FK to CopilotSession), role ("user"|"assistant"), content Text, toolCallId?, toolResult?, createdAt`
- `CopilotSession` table: `id, userId, companyId, title?, createdAt, updatedAt, lastMessageAt`
- No need for a complex thread hierarchy — the existing pattern proves flat rows + session FK is sufficient

---

## 8. Billing & Seats

### Company Model (key fields, `prisma/schema.prisma:617-749`)

```prisma
model Company {
  id                      Int      @id @default(autoincrement())
  name                    String
  email                   String?  @unique
  phone                   String?
  address/city/state/zip  String?
  businessType            String?
  // Feature toggles (legacy inline flags):
  isSalesAgent            Boolean  @default(true)
  isCRMEnabled            Boolean? @default(false)
  isCollaborators         Boolean? @default(false)
  tipEnabled              Boolean  @default(true)
  missedCallTextBackEnabled Boolean @default(true)
  enforcePlatformPlan     Boolean  @default(false)  // ← key: if false, uses CompanyPermissionModule (legacy)
  callWhisperEnabled      Boolean  @default(true)
  // Payment gateways:
  paymentGateway          PaymentGateway @default(STRIPE)
  smsGateway              SmsGateway     @default(TWILIO)
  stripeAccountId         String?
  authorizeNetApiLoginId  String?
  authorizeNetTransactionKey String?
  // Comms integrations:
  zapierToken             String?   @unique
  googleEmail             String?
  googleRefreshToken      String?
  mailgunCredentialId     Int?
  twilioCredentialsId     Int?
  // Relations:
  billingCustomer         PlatformBillingCustomer?
  platformSubscription    PlatformSubscription?
  platformPlans           PlatformPlan[]
  companyPermissions      CompanyPermissionModule[]
}
```

**No boolean `aiEnabled`, `hasCopilot`, or `hasMetaIntegration` fields** — feature gating uses `CompanyPermissionModule` rows + `PlatformPlan.features`.

### Billing Architecture (`prisma/schema.prisma:2633-2768`)

```
PlatformPlan
  └── PlanFeature[]  (featureKey, value: string, type: BOOLEAN|NUMERIC|TEXT)

PlatformBillingCustomer (1:1 Company)
  └── PlatformSubscription (1:1 Company)
        └── PlatformSubscriptionItem[] (name, price, quantity, isOneTime)
  └── PlatformPaymentMethod[]
  └── PlatformInvoice[]
        └── PlatformPayment[]
```

Payment processor: **Authorize.Net** (not Stripe) for platform billing. Stripe is for customer-facing shop payments.

### Entitlement Service (`src/lib/platform-billing/entitlement-service.ts`)

`getCompanyEntitlements(companyId): Promise<Entitlements>` — typed object:

- `canUseVoice`, `canUseSms`, `callRecording`, `missedCallTextBack`
- `automationModules[]`, automation limits per type
- `websiteIncluded`, `carWrapVisualizer`, `aiSmartReplies`, `awxSalesAgent`
- `enforcePlatformPlan: false` → reads from `CompanyPermissionModule` (legacy); `true` → reads from `PlanFeature` rows

### Cron / Scheduled Billing

- **No `src/app/api/cron/` directory exists**
- **No `vercel.json` with cron config** at project root
- `croner` package is in `package.json` but no obvious Next.js entrypoint
- Appointment reminders scheduled via `scheduleRemindersInNest` — implies a **separate Nest.js service** handles recurring jobs

### Seat Enforcement

- No "seats" field on `Company`, `PlatformPlan`, or `PlatformSubscription`
- Plan limits are stored as `PlanFeature.value` (string, cast to number for numeric limits)
- To implement per-seat copilot billing: add `PlanFeature { featureKey: "copilotSeats", value: "0", type: NUMERIC }` + a `CopilotSeat` model or a `User.hasCopilot Boolean` field

### AuditLog

**No `AuditLog` model exists.** Not present anywhere in Prisma schema or `src/`.

---

## 9. Reports & Analytics

### Revenue Report

- Page: `src/app/(dashboard)/dashboard/reporting/(report)/revenue/page.tsx`
- Server component; reads invoices directly from `db` — **no dedicated `getRevenueReport()` action**
- Filters: `category`, `startDate`, `endDate`, `service`, `search`, `price`, `cost`, `profit`, `filterRevenue`, `page`, `take`
- Sibling components: `RevenueDisplay.tsx`, `Analytics.tsx`, `DesktopAnalytics.tsx`, chart containers

### Reporting Structure

```
src/app/(dashboard)/dashboard/reporting/
  (report)/
    inventory/
    leads/
    payments/
    revenue/      ← primary revenue report
    teams/
  salesreporting/
  technicianreporting/
  components/
  data.tsx
```

### Payment / Revenue Helpers (`src/actions/payment/`)

- `getPayments.ts` — `getPayments(): Promise<ReturnPayment[]>` — scoped by `getCompanyId()`
- `getPaymentsPaginated.ts` — paginated variant
- `getTotalPayment.ts` — aggregate
- Includes: `invoice{vehicle, client}`, `card`, `cash`, `check`, `other{paymentMethod}`, `deposit`

### Dashboard Data Actions (`src/actions/dashboard/data/`)

`getAdminInfo.ts`, `getLeadInfo.ts`, `getSalaryPayouts.ts`, `getSalesInfo.ts`, `getSalesWinRate.ts`, `getTechnicianInfo.ts`, `lib.ts`

---

## 10. Inventory & Materials

### Prisma Models

**InventoryProduct** (canonical inventory model):

```prisma
model InventoryProduct {
  id                Int                      @id @default(autoincrement())
  name              String
  description       String?                  @db.Text
  categoryId        Int?
  quantity          Decimal                  @default(1)
  price             Decimal                  @default(0)
  unit              String                   @default("pc")
  lot               String?
  vendorId          Int?
  userId            Int?
  type              InventoryProductType     // Product | Supply  ← REQUIRED
  receipt           String?
  lowInventoryAlert Int?
  companyId         Int
  tags              InventoryProductTag[]
  Material          Material[]
  history           InventoryProductHistory[]
}
enum InventoryProductType { Supply  Product }
```

**Material** (estimate line-item level):

```prisma
model Material {
  id              Int     @id @default(autoincrement())
  name            String
  vendorId        Int?
  categoryId      Int?
  notes           String?
  quantity        Decimal?
  cost            Decimal?    // purchase cost
  sell            Decimal?    // selling price
  discount        Decimal?
  companyId       Int
  invoiceId       Int?
  invoiceItemId   Int?        // links to InvoiceItem line
  productId       Int?        // FK to InventoryProduct (if from inventory)
  tags            MaterialTag[]
}
```

**InvoiceItem** (polymorphic line item):

```prisma
model InvoiceItem {
  id          Int        @id @default(autoincrement())
  invoiceId   Int?
  serviceId   Int?
  laborId     Int?
  shopServiceId Int?
  serviceDesc String?
  materials   Material[]
  tags        ItemTag[]
  technicians Technician[]
}
```

### Required Fields for New InventoryProduct

Minimum: `name`, `type` (Product|Supply), `companyId` (auto from session)
Defaults: `quantity=1`, `price=0`, `unit="pc"`
Optional but common: `categoryId`, `vendorId`, `description`, `lot`, `lowInventoryAlert`, `receipt`

### Adding Material to Estimate

- `Material.invoiceItemId` → `InvoiceItem` → `Invoice`
- `src/actions/estimate/material/newMaterial.ts` → `newMaterial()` with optional `addToInventory` flag
- Other: `updateMeterial.ts`, `deleteMaterial.ts`

---

## 11. Tech Stack Confirmation

### `package.json` Versions

| Package            | Version                                 |
| ------------------ | --------------------------------------- |
| **Next.js**        | `^16.1.6` (⚠️ not 14 — this is Next 16) |
| **React**          | `^19.1.0`                               |
| **NextAuth**       | `next-auth ^4.24.14`                    |
| **Prisma**         | `^7.5.0` (with `@prisma/adapter-pg`)    |
| **TanStack Query** | `@tanstack/react-query ^5.76.1`         |
| **Zustand**        | `^4.5.2`                                |
| **Tailwind**       | `^3.3.0`                                |
| **shadcn**         | `^3.7.0` + full Radix UI suite          |
| **Groq SDK**       | `^0.34.0` (only LLM SDK present)        |
| **Zod**            | `^3.24.1`                               |
| **Pusher**         | `^5.2.0` / `pusher-js ^8.4.0-rc2`       |
| **Axios**          | `^1.9.0`                                |
| **Stripe**         | `^17.5.0`                               |
| **Twilio**         | `^5.7.3`                                |

### API / Fetch Helpers

| File                         | Purpose                                                                              |
| ---------------------------- | ------------------------------------------------------------------------------------ |
| `src/lib/server-fetch.ts`    | `serverFetch()` + `serverFetchJson<T>()` — Server Component fetch forwarding cookies |
| `src/helpers/next-axios.ts`  | Client-side axios, attaches `Bearer ${session.accessToken}`, auto-signout on 401     |
| `src/helpers/server-auth.ts` | `getServerAccessToken()`, `getServerAuthHeaders()`, `createServerAxiosConfig()`      |
| `src/helpers/axios.ts`       | Separate axios variant                                                               |
| `src/lib/db.ts`              | Prisma 7 singleton with `@prisma/adapter-pg`, `Decimal→number` serializer            |

No `src/lib/api.ts` or `src/lib/nextAxios.ts` at those exact paths.

### Realtime

Pusher is used for real-time notifications (`noti-${userId}` channel) and messaging. Channels pattern: `noti-${userId}`, `notification-${companyId}`, etc.

---

## Summary

---

### Top 3 Things That Are Surprising / Should Affect Architecture Decisions

**1. Next.js is version 16, React is version 19 — not Next 14.**
This matters because Next 16 has React 19 Server Actions with new cache semantics, different compiler behavior, and potentially different server action invocation patterns. Do not copy patterns from Next 14 tutorials. The existing actions use `"use server"` consistently, which is correct, but be aware that turbopack is likely the default bundler.

**2. There is NO AuditLog table and NO centralized permission helper.**
The copilot will perform operations on behalf of users — you absolutely need an audit trail. Every copilot tool call should be logged (who asked, what action, what parameters, what result). This needs to be built from scratch. Similarly, permission checks are ad-hoc property lookups (not `hasPermission("estimate.create")`), so the copilot's tool execution layer will need to replicate the same boolean-field checks or call `getPermissions()` + `getCompanyEntitlements()` before every tool invocation.

**3. Platform billing uses Authorize.Net (not Stripe) — and there is no cron job in the Next.js app.**
The per-seat copilot billing model ($39/seat/month) needs to integrate with Authorize.Net via `PlatformSubscriptionItem` rows (the existing addons pattern). There is no Vercel cron or Next.js cron setup — a separate Nest.js service handles scheduling. Monthly invoice generation is external, not in this repo, so seat charges need to be added as `PlatformSubscriptionItem { name: "AI Copilot", isOneTime: false, quantity: N, price: 39 }` rows that the external billing service picks up.

---

### Top 3 Things That Are Inconsistent / Could Cause Problems

**1. Two coexisting return value conventions in server actions.**
Newer actions return `Promise<ServerAction | TErrorHandler>`. Older ones return `{ success: boolean, message: string }` or throw directly. The copilot's tool execution layer must handle both shapes when calling existing actions. Either normalize all actions first (risk: large diff), or write a wrapper that detects and normalizes the response shape at the copilot layer.

**2. Feature entitlement system has a dual-mode switch (`enforcePlatformPlan`).**
If `Company.enforcePlatformPlan = false`, entitlements come from `CompanyPermissionModule` rows (legacy). If `true`, from `PlanFeature` rows. Adding copilot as a new entitlement must work in both modes. The copilot seat check must call `getCompanyEntitlements()` (which already handles both modes) rather than querying either source directly. Similarly, adding a `copilotSeats` feature key to `PlanFeature` won't be picked up for legacy-mode companies.

**3. Lead creation bypasses the server action layer — it goes through an HTTP route (`/api/lead-generate`) authenticated by a `zapierToken`.**
`src/actions/lead/createLeadFromForm.ts` doesn't call `db.lead.create` directly; it POSTs to the internal API. The copilot's "create lead" tool should call the server action directly (with session auth), not the HTTP route. But the actual DB logic lives in the API route, not in a reusable function. This means you'll need to either extract the DB logic into a shared function or call the action while forwarding the right auth context.

---

### Top 5 Patterns to Reuse for the Copilot

**1. `getEssentials()` + `getCompanyEntitlements()` for auth/gate pattern.**
Every copilot tool should start with:

```ts
const { companyId, userId } = await getEssentials();
const entitlements = await getCompanyEntitlements(companyId);
if (!entitlements.copilotEnabled) throw new Error("Copilot not enabled");
```

This is exactly how `smart-reply.ts` gates Groq access. Reuse this pattern.

**2. `groq-sdk` integration in `src/actions/communication/ai-reply/smart-reply.ts`.**
The only existing LLM integration. Study its: Groq client singleton pattern, in-memory MD5 cache, context assembly from Prisma, `response_format: { type: "json_object" }`, and entitlement gate. The Anthropic SDK integration for copilot should follow the same structural pattern (singleton client in `src/lib/anthropic.ts`, entitlement gate, context assembly).

**3. `ServerAction` discriminated union as the return type for all copilot tools.**

```ts
return { type: "success", data: result }
return { type: "error", message: "...", field?: "..." }
```

All copilot tool wrappers should return `Promise<ServerAction>`. This integrates cleanly with existing UI toast/error patterns.

**4. `Sheet` component from shadcn (`src/components/ui/sheet.tsx`) for the chat panel.**
It's the existing slide-over primitive. Combine with the bug-report chat component structure (`src/components/bug-report/ChatHeader.tsx`, `ChatInput.tsx`, `MessageCard.tsx`, `OptimisticMessageCard.tsx`) for the message UI.

**5. Pusher for real-time streaming of copilot responses.**
The notification system already uses Pusher with a per-user channel (`noti-${userId}`). For streaming LLM responses, either: (a) use Anthropic's streaming API + Pusher events per token chunk, or (b) use Next.js Route Handlers with streaming response (`ReadableStream`). Pattern (b) is cleaner for SSE — see how `src/lib/server-fetch.ts` is structured for the base fetch pattern.

---

### Recommended Additions / Changes Before Building the Copilot

**Prerequisites (do these first — they unblock architecture decisions):**

1. **Create `CopilotSession` + `CopilotMessage` Prisma models** — needed before any UI or tool work. Add migration. Model after existing flat Message + ChatTrack pattern.

2. **Create `AuditLog` Prisma model** — every copilot tool call (user, companyId, tool, input, output, timestamp, latency) must be auditable. This is also needed for usage-based billing tracking.

3. **Add copilot seat fields to Prisma**: `User.hasCopilot Boolean @default(false)` + `PlanFeature` key `"copilotSeats"`. Add a `CopilotSeat` join model or use `User.hasCopilot` for simpler tracking. Admin must explicitly assign seats.

4. **Extract lead creation DB logic into a shared function** — `src/app/api/lead-generate/route.ts` contains the actual `db.lead.create`. Extract this into a server action that both the route and the copilot tool can call, to avoid the zapierToken auth bypass.

5. **Create `src/lib/anthropic.ts`** — Anthropic SDK singleton (model the Groq singleton in `smart-reply.ts`). Use `claude-sonnet-4-6` as the default model with prompt caching enabled.

6. **Add `copilotEnabled` entitlement to `getCompanyEntitlements()`** — the copilot's tool execution layer should gate on this, consistent with how `aiSmartReplies` is gated. Add `copilotSeats: number` to the `Entitlements` type.

7. **Normalize server action return types** — at minimum, write a `normalizeActionResult()` wrapper that handles both the old `{success, message}` shape and the new `{type, data, message}` shape. This prevents the copilot tool layer from needing to handle both shapes case-by-case.

---

## 12. Quick-create Flows & Reusable Server Actions for Copilot Tools

> Updated: 2026-05-10 | Investigating in-platform "thunderbolt" (Zap icon) create flows and whether each operation has a server action the copilot can call directly.

### The Thunderbolt / QuickLink Component

The `Zap` icon in the header is rendered by `src/components/QuickLink.tsx:184`. It opens a dropdown card with five actions. "Create Lead" renders `<AddLeads>` inline:

```tsx
// src/components/QuickLink.tsx:219-231
} : action.label === "Create Lead" ? (
  <AddLeads
    buttonChild={
      <div className="flex cursor-pointer items-center space-x-3 ...">
        <action.icon className="h-5 w-5 text-[#6571FF]" />
        <span className="text-sm font-medium text-gray-700">{action.label}</span>
      </div>
    }
    isLeadOpen={isLeadOpen}
    setIsLeadOpen={setIsLeadOpen}
  />
```

"New Appointment" opens `<AppointmentCreateOrEdit>` modal. "Create Estimate" navigates to `/dashboard/estimate/create` (full-page form). "Create Client" uses `<NewCustomer>`. "Bug Report" is unrelated.

---

### 1. Lead Creation — Trace

| Layer  | File                                                                         | What it does                                       |
| ------ | ---------------------------------------------------------------------------- | -------------------------------------------------- |
| Icon   | `src/components/QuickLink.tsx:184`                                           | `<Zap>` icon, dropdown toggle                      |
| Dialog | `src/app/(dashboard)/dashboard/pipeline/components/AddLeads.tsx`             | Shadcn `<Dialog>` wrapper                          |
| Form   | `src/app/(dashboard)/dashboard/pipeline/components/AddLeadModalBody.tsx:160` | Calls `createLeadFromForm(...)`                    |
| Action | `src/actions/lead/createLeadFromForm.ts:16`                                  | Reads `zapierToken`, POSTs to `/api/lead-generate` |
| Route  | `src/app/api/lead-generate/route.ts:185`                                     | `db.lead.create(...)` — actual DB write            |

**The in-platform quick-create calls `createLeadFromForm`, which POSTs to `/api/lead-generate` using the company's `zapierToken` for auth — the same external Zapier route used by customer-facing websites.** The `db.lead.create` call is entirely inside the route handler, not in a reusable function.

#### createLeadFromForm (the "server action")

```ts
// src/actions/lead/createLeadFromForm.ts:16-46
export async function createLeadFromForm(data: CreateLeadFromFormInput) {
  const companyId = await getCompanyId();          // session auth ✅
  const company = await db.company.findFirst(...)  // fetches zapierToken
  if (!company?.zapierToken) throw new Error("Company token not configured");

  const response = await fetch(`${appUrl}/api/lead-generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-TOKEN": company.zapierToken },
    body: JSON.stringify(data),
  });
  // No Zod validation here — validation is inside the route handler
  return response.json();
}
```

**No Zod validation, no direct DB access, returns raw JSON.** It is a thin HTTP proxy using the zapier token, not a proper server action.

#### What /api/lead-generate actually does after db.lead.create

Beyond the `db.lead.create`, the route also: upserts a `Client`, creates a `Vehicle`, calls `triggerAutomation`, sends a `sendNewLeadNotification`, and optionally sends an AI opening SMS. None of this is extractable without refactoring.

#### Other places db.lead.create exists

- `src/app/api/lead-generate/route.ts:185` — primary location
- `src/app/api/virtual-shop/service-booking/route.ts:1082` — virtual shop booking, inline in route

**Three separate code paths create leads; none share a reusable function.**

**Verdict: ❌ Needs extraction**

---

### 2. Appointment Creation — Trace

| Layer      | File                                                        | What it does                                     |
| ---------- | ----------------------------------------------------------- | ------------------------------------------------ |
| Icon       | `src/components/QuickLink.tsx:118-124`                      | "New Appointment" → `setIsAppointmentOpen(true)` |
| Modal      | `src/components/appointment/AppointmentCreateOrEdit.tsx`    | `<Dialog>` → `<AppointmentModalBody>`            |
| Hook       | `src/components/appointment/useAppointmentFormState.ts:618` | Calls `addAppointment({...})`                    |
| **Action** | **`src/actions/appointment/addAppointment.ts:38`**          | **Canonical server action**                      |

```ts
// src/actions/appointment/addAppointment.ts:38-50
export async function addAppointment(
  appointment: TCreateAppointmentValidationSchema,
): Promise<ServerAction | TErrorHandler> {
  try {
    await createAppointmentValidationSchema.parseAsync(appointment); // Zod ✅
    const session = await getServerSession(authOptions); // session auth ✅
    let companyId = appointment.forceCompanyId ?? session?.user?.companyId;
    // ... db.appointment.create, assignedUsers, reminder scheduling, Google Cal sync
    return { type: "success", data: newAppointment }; // modern shape ✅
  } catch (error) {
    return errorHandler(error);
  }
}
```

**One clean path, modern return shape.** One caveat: `addAppointment` contains an inline draft estimate creation block (`src/actions/appointment/addAppointment.ts:106-141`) marked with `// TODO: use \`createDraftEstimate\` action`. This is duplicated logic from `createDraftEstimate`but it doesn't affect the copilot's ability to call`addAppointment` cleanly.

**Verdict: ✅ Reusable as-is — `src/actions/appointment/addAppointment.ts`**

---

### 3. Task Creation — Trace

No quick-link modal for tasks — tasks are created from the full calendar/task page. The canonical action is:

```ts
// src/actions/task/createTask.ts:34-46
export async function createTask(
  task: TCreateTaskValidationSchema,
): Promise<ServerAction | TErrorHandler> {
  try {
    await createTaskValidationSchema.parseAsync(task); // Zod ✅
    const session = await getServerSession(authOptions); // session auth ✅
    // db.task.create, taskUser.createMany, Google Calendar event
    return { type: "success", data: newTask }; // modern shape ✅
  } catch (error) {
    return errorHandler(error);
  }
}
```

**Single path, clean.** No duplication found elsewhere.

**Verdict: ✅ Reusable as-is — `src/actions/task/createTask.ts`**

---

### 4. Estimate Creation — Three Separate Server Actions

There are **three distinct server actions** that create draft estimates, each for a different entry point:

| Action                     | File                                                | Entry Point               | Notes                                                                                             |
| -------------------------- | --------------------------------------------------- | ------------------------- | ------------------------------------------------------------------------------------------------- |
| `createLeadDraftEstimate`  | `src/actions/pipelines/createLeadDraftEstimate.ts`  | Sales pipeline card       | Most complete: uses `db.$transaction`, checks for existing estimate, proper `ServerAction` return |
| `createDraftEstimate`      | `src/actions/estimate/invoice/createDraft.ts`       | Appointment/calendar flow | Older; no transaction; returns `{type:"success", data}` (not typed as `ServerAction`)             |
| Inline in `addAppointment` | `src/actions/appointment/addAppointment.ts:106-141` | Appointment quick-create  | Duplicated `db.invoice.create` logic; TODO comment acknowledges this                              |

All three create: `db.invoice` row with `type: "Estimate"`, `columnId` = "Pending" shop column, then `db.lead.update({ isEstimateCreated: true })`.

**For the full estimate/invoice** (with line items, photos, tasks, etc.): `src/actions/estimate/invoice/create.ts` — `createInvoice()`. This is 558 lines, Zod-validated, handles both `"Estimate"` and `"Invoice"` types. The copilot cannot realistically invoke this action directly for v1 — the input schema requires fully built line items, labor, materials, coupons, and inspection data.

**Verdict (draft):** ⚠️ Reusable with minor refactor — use `createLeadDraftEstimate` as the canonical action; `addAppointment.ts:106-141` should eventually call it instead of inlining.

**Verdict (full estimate):** ⚠️ Action exists at `src/actions/estimate/invoice/create.ts` but input schema too complex for copilot v1. The copilot should create a draft, then navigate the user to `/dashboard/estimate/[id]/edit` to fill in line items, or accept only simplified fields.

---

### 5. Invoice Creation

Same action as full estimate: `createInvoice` in `src/actions/estimate/invoice/create.ts`. Invoice vs. Estimate is controlled by the `type: InvoiceType` field. No separate invoice-specific action exists.

**Verdict:** ⚠️ Same as full estimate — action exists but input is too complex for copilot v1 direct invocation. For the copilot, draft creation is more practical.

---

### 6. Inventory Item Creation — Trace

No quick-link entry point. Created from `/dashboard/inventory`. The canonical action:

```ts
// src/actions/inventory/create.ts:14-28
export async function createProduct(
  data: TCreateProductValidation,
): Promise<ServerAction | TErrorHandler> {
  try {
    const user = await getUser(); // session auth ✅
    const companyId = await getCompanyId(); // session auth ✅
    const validatedData = await createProductValidationSchema.parseAsync(data); // Zod ✅
    // ... optional category auto-create
    const result = await db.$transaction(async (tx) => {
      // transaction ✅
      // tx.inventoryProduct.create + tx.inventoryProductHistory.create
    });
    return { type: "success", data: result }; // modern shape ✅
  } catch (error) {
    return errorHandler(error);
  }
}
```

No duplication found for `InventoryProduct` creation. The `newMaterial` action (`src/actions/estimate/material/newMaterial.ts`) is a separate concept (estimate line-item materials) and calls `createProduct` internally when `addToInventory: true`.

**Verdict: ✅ Reusable as-is — `src/actions/inventory/create.ts`**

---

### 7. Send Estimate to Client — Trace

Two separate send actions (email and SMS), both in `src/actions/estimate/invoice/`:

```ts
// src/actions/estimate/invoice/sendInvoiceEmail.ts:8
export async function sendInvoiceEmail({ invoiceId }: { invoiceId: string }) {
  // getUser() for session auth ✅ (but no Zod validation)
  // fetches invoice, builds template, generates short link, sendInfobipEmail
  return { success: true }; // ⚠️ OLD return shape
  // on error: return { success: false, message: "..." }
}

// src/actions/estimate/invoice/sendInvoiceSms.ts:9
export async function sendInvoiceSms({ invoiceId }: { invoiceId: string }) {
  // same shape, via sendTwilioMessage / sendInfobipMessage
  return { success: true }; // ⚠️ OLD return shape
}
```

Both actions use `getUser()` for auth (session-based ✅), but return the old `{success, message}` shape rather than `ServerAction | TErrorHandler`. Neither has Zod validation (input is just `{ invoiceId: string }`). Multiple gateway variants exist: `sendMailgunEmail.ts`, `sendSESMail.ts`, `sendSendgridMail.ts` — but there is no unified `sendEstimateToClient({ invoiceId, channel: "email"|"sms" })` wrapper.

**Verdict: ⚠️ Reusable with minor refactor** — actions exist at `src/actions/estimate/invoice/sendInvoiceEmail.ts` and `sendInvoiceSms.ts`. The copilot tool layer either normalizes the return shape itself, or a thin unified wrapper is created.

---

### Reusability Summary Table

| Operation                   | Verdict                                         | Canonical Action File                                                           |
| --------------------------- | ----------------------------------------------- | ------------------------------------------------------------------------------- |
| **Lead creation**           | ❌ Needs extraction                             | `src/app/api/lead-generate/route.ts` (logic must be extracted into a shared fn) |
| **Appointment creation**    | ✅ Reusable as-is                               | `src/actions/appointment/addAppointment.ts`                                     |
| **Task creation**           | ✅ Reusable as-is                               | `src/actions/task/createTask.ts`                                                |
| **Draft estimate**          | ⚠️ Minor refactor (3 copies of the logic exist) | `src/actions/pipelines/createLeadDraftEstimate.ts` (most complete)              |
| **Full estimate/invoice**   | ⚠️ Too complex for v1 direct invocation         | `src/actions/estimate/invoice/create.ts`                                        |
| **Inventory item**          | ✅ Reusable as-is                               | `src/actions/inventory/create.ts`                                               |
| **Send estimate to client** | ⚠️ Old return shape, no unified wrapper         | `src/actions/estimate/invoice/sendInvoiceEmail.ts` + `sendInvoiceSms.ts`        |

---

### Refactor Work Needed Before Phase 1

**Required (blocks copilot tool correctness):**

1. **Extract lead DB logic from `/api/lead-generate`** — create `src/lib/leads/createLeadRecord(data, companyId)` that both the API route and a new `createLead` server action can call. The API route can stay for external webhooks; the server action uses session auth and calls this shared function. Without this, the copilot has no session-authenticated path to create a lead.

**Recommended (prevents confusion and bugs):**

2. **Consolidate the three draft-estimate code paths** — `addAppointment.ts:106-141` has a `// TODO: use createDraftEstimate action` comment. Replace that inline block with a call to `createDraftEstimate`. Then the copilot and all internal callers use the same path.

3. **Create a unified `sendEstimateToClient({ invoiceId, channel })` wrapper** — thin function in `src/actions/estimate/invoice/sendEstimate.ts` that dispatches to email or SMS based on client contact info and company gateway config. Normalizes return to `ServerAction` shape. Eliminates the need for the copilot tool layer to know which gateway to call.

4. **For full estimate/invoice creation in the copilot v1** — do not call `createInvoice` directly. Instead: (a) call `createLeadDraftEstimate` to create the shell, (b) return the estimate ID and a deep link to `/dashboard/estimate/[id]/edit`, and let the user fill in the line items. Full `createInvoice` invocation is a Phase 2 copilot feature.
