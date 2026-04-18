# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

AutoWorx is a multi-tenant SaaS web application for managing car repair shops. Built with **Next.js 14 App Router**, it serves shop owners (Admins), employees (Managers, Technicians, Sales, Others), and external clients. Each shop is a "company" in the system.

## Commands

```bash
yarn dev               # Start dev server
yarn build             # prisma generate + next build
yarn lint              # ESLint
yarn tsc               # TypeScript check (no emit)
yarn test              # Jest (all tests)
yarn test:watch        # Jest in watch mode
jest path/to/file      # Run a single test file

yarn prettier          # Format all files
yarn prisma:merge      # Merge split schema files → prisma/schema.prisma
yarn db:sync-sequences # Sync PostgreSQL sequences after seed
```

Tests live in `__test__/` (currently minimal). Jest is configured for `jsdom` with `@testing-library/jest-dom`.

## Architecture

### Route Groups (App Router)

| Group                               | Purpose                                                     |
| ----------------------------------- | ----------------------------------------------------------- |
| `src/app/(auth)`                    | Login, register, forgot-password flows                      |
| `src/app/(home)`                    | Public landing page at `/`                                  |
| `src/app/(public)`                  | Public pages: booking URL, invoice views, API docs, reports |
| `src/app/(dashboard)`               | Main authenticated app under `/dashboard`                   |
| `src/app/(dashboard)/awx-dashboard` | Super-admin internal dashboard                              |
| `src/app/subdomain/[subdomain]`     | Virtual shop storefront (rewrites from middleware)          |
| `src/app/api`                       | All REST API routes                                         |

### Multi-Tenancy & Subdomains

Middleware (`src/middleware.ts`) handles subdomain routing. Requests to `tenant.autoworx.tech` are rewritten to `/subdomain/[subdomain]/*` — the virtual shop public storefront. The `NEXT_PUBLIC_ROOT_DOMAIN` env var defines the root domain. Super-admin and `www`/`dev`/`stage` prefixes are excluded from tenant detection.

### Authentication

NextAuth (`src/authOptions.ts`) uses JWT sessions with:

- **Credentials** provider — calls `/api/auth/login` internally (bcrypt + Prisma)
- **Google OAuth** provider
- JWT tokens: short-lived `accessToken` + `refreshToken`, refreshed via `/api/auth/refresh-token`
- Session includes: `id`, `name`, `email`, `role`, `companyId`, `employeeType`, `isSuperAdmin`, `accessToken`
- 2FA flow: checked in `authorize`, confirmation record is consumed once

### Database

PostgreSQL via **Prisma 5**. The single schema file is at `prisma/schema.prisma`. The `db` singleton (`src/lib/db.ts`) extends PrismaClient to auto-serialize `Decimal` → `number` on all operations. Use `db` everywhere; never instantiate `PrismaClient` directly.

Key models: `Company`, `User`, `Client` (customers), `Vehicle`, `Invoice`/`InvoiceTemplate`, `InvoiceItem`, `Service`, `Material`, `Labor`, `Task`, `Appointment`, `Lead`, `Column` (pipeline), `Message`, `Shop` (virtual shop), `Permission*` (role-based), `PlatformPlan`/`PlatformSubscription` (billing).

### Permission System (Two Layers)

1. **Company feature permissions** — which modules a company's subscription includes. Stored in `CompanyPermissionModule` and loaded into `useCompanyFeaturePermissionStore` (Zustand).
2. **User role permissions** — what an individual employee can access. Loaded from `Permission`, `PermissionForManager`, `PermissionForSales`, etc. via `src/lib/getPermissions.ts` and stored in `usePermissionStore` (Zustand).

Route access is determined in `src/lib/routeAccess.ts` using maps in `src/lib/routePermissionsMap.ts`. The `PrivateRoute` client component enforces both layers on every navigation.

Employee types: `Admin`, `Manager`, `Sales`, `Technician`, `Other`. Admins bypass all permission checks.

### Server Actions vs. API Routes

The codebase uses **both** patterns:

- **Server Actions** (`"use server"` files in `src/actions/`) — used directly from Server Components and some Client Components. Always return `ServerAction` (`{ type: "error"|"success", message?, data? }`) or `TErrorHandler`.
- **API Routes** (`src/app/api/`) — used by external integrations (Zapier, webhooks), the mobile app, and client-side code via `nextAxios` or `serverFetch`.

After mutations, call `revalidatePath()` to invalidate Next.js cache.

### HTTP Clients

- **`nextAxios`** (`src/helpers/next-axios.ts`) — client-side Axios instance. Auto-injects `Bearer` token from NextAuth session. Redirects to `/login` on 401. Use in `"use client"` components.
- **`serverFetch` / `serverFetchJson`** (`src/lib/server-fetch.ts`) — server-side fetch wrapper. Forwards cookies for auth, builds query strings from `params` object.

### State Management (Zustand)

Stores live in `src/stores/`. Key stores:

- `usePopupStore` — global modal/popup state; renders via `<PopupState />` in layout
- `usePermissionStore` — current user's permission object
- `useCompanyFeaturePermissionStore` — company-level feature flags
- `useEstimateCreateStore` — full invoice/estimate creation state (items, totals, payments)
- `useCommunicationState` — active chat panel

Zustand stores use simple `create<StateType>()` — no middleware unless explicitly present.

### TanStack Query

Wrapped in `<QueryProvider>` (root layout). `refetchOnWindowFocus` is disabled globally. Query keys are centralized in `src/lib/queryKeys.ts`. Custom hooks in `src/hooks/query-hook/` wrap server actions as `queryFn`.

### Real-Time (Pusher)

- **Server**: `getPusherInstance()` in `src/lib/pusher/server.ts` — lazy singleton, `server-only`
- **Client**: `pusher` in `src/lib/pusher/client.ts` — single Pusher-JS instance using `NEXT_PUBLIC_PUSHER_*` env vars
- Notification helpers in `src/lib/notification/` trigger Pusher events and OneSignal push notifications together

### Voice & Communication

VoiceDeviceContext (`src/context/VoiceDeviceContext.tsx`) abstracts **Twilio** and **Infobip** for browser voice calls. The active provider is determined at runtime from company settings. SMS/email can route through **Twilio**, **Infobip**, or **Mailgun**.

### Payment Gateways

Abstracted behind `src/lib/payment-gateway.ts`. Supports **Stripe** and **Authorize.Net**. Company selects their gateway in settings. Webhooks for both are public API routes.

### Platform Billing (SaaS Subscriptions)

`src/lib/platform-billing/` manages AutoWorx's own subscription tiers (plans sold to shop owners, not shop customers). `getCompanyEntitlements()` returns a typed `Entitlements` object checked before rendering gated features. Stripe handles billing; webhook at `/api/platform/webhook`.

### Virtual Shop

Each company can have a public-facing booking storefront at `[slug].autoworx.tech`. Routes under `src/app/subdomain/[subdomain]/` and `src/app/api/virtual-shop/` handle the public-facing shop: service browsing, appointment booking, gift cards.

### Error Handling

`errorHandler` (`src/error-boundary/globalErrorHandler.ts`) normalizes Zod, Axios, Prisma, and `AppError` errors into `TErrorHandler` objects. Used in both API route catch blocks and server actions. 5xx Prisma errors are hidden from users in production.

## Repository Context & External Apps

This repo (`autoworx-platform`) is the **sole backend and frontend** for the AutoWorx web application. The Next.js API routes at `src/app/api/` serve as the REST backend — there is no separate NestJS service. A **separate Expo mobile app** (different repo) and third-party integrations (Zapier, webhooks) also consume these same API routes.

### How the Mobile App and External Consumers Talk to This App

External consumers authenticate with a short-lived JWT `accessToken` in the `Authorization: Bearer <token>` header. The middleware (`src/middleware.ts`) intercepts all non-session `GET/POST/...` calls to `/api/*` routes not listed in `PUBLIC_API_ROUTES` and verifies the token against `ACCESS_SECRET` using `jwtVerifyToken` (`src/lib/jwtVerify.ts`).

Token issuance flow:

1. External client calls `/api/auth/login` (no auth required — it's in `PUBLIC_API_ROUTES`)
2. Response returns `accessToken` + `refreshToken`
3. Subsequent requests pass `Authorization: Bearer <accessToken>`
4. When `accessToken` expires, call `/api/auth/refresh-token` to get a new pair

Public API routes that don't require a token are listed in `src/constants/public-route.ts` (`PUBLIC_API_ROUTES` and `PUBLIC_DYNAMIC_API_ROUTES`). Dynamic public routes (e.g. `/api/twilio/sms-receive/:companyIds`) are matched by `src/utils/isDynamicPublicApiRoute.ts`.

API routes intended for external/mobile consumption have JSDoc `@swagger` comments. The OpenAPI spec is served at `GET /api/docs` and rendered at `/api-docs` (public page). The Swagger spec title is "Autoworx API documentation for Web & Mobile apps."

## Folder Structure

```
src/
├── actions/          # Server Actions ("use server") — one file per operation, grouped by domain
│   ├── client/       # add.ts, edit.ts, delete.ts, get.ts, getClientList.ts …
│   ├── estimate/     # invoice/, labor/, material/, service/, technician/
│   ├── task/         # createTask.ts, editTask.ts, deleteTask.ts, google-calendar/
│   └── …             # appointment/, auth/, communication/, employee/, payment/ …
├── app/
│   ├── (auth)/       # /login, /register, /forgot-password
│   ├── (home)/       # Landing page at /
│   ├── (public)/     # /api-docs, /booking-url, /public-invoice, /reports …
│   ├── (dashboard)/
│   │   ├── dashboard/         # All shop-owner/employee pages
│   │   │   ├── estimate/      # Invoices & estimates (create/, edit/, invoices/)
│   │   │   ├── task/          # Calendar & task management
│   │   │   ├── communication/ # client/, internal/, collaboration/
│   │   │   ├── pipeline/      # sales/, shop/, team/ pipelines
│   │   │   ├── inventory/     # Inventory list, vendor, camera
│   │   │   ├── payments/      # Transactions & coupons
│   │   │   ├── client/        # Customer directory
│   │   │   ├── employee/      # Employee directory
│   │   │   ├── settings/      # business/, team-management/, billing/ …
│   │   │   └── reporting/     # Revenue & workforce reports
│   │   └── awx-dashboard/     # Super-admin: company stats, plans, billing
│   ├── subdomain/[subdomain]/ # Virtual shop public storefront
│   └── api/                   # REST API routes
│       ├── auth/              # login, register, refresh-token, forgot-password
│       ├── task/, appointment/, invoice/, client/ … # Domain-specific routes
│       ├── twilio/, infobip/, mailgun/ # Communication webhooks & actions
│       ├── stripe/, authorize-net/     # Payment webhooks
│       ├── pusher/            # Real-time auth & collaboration
│       ├── virtual-shop/      # Public storefront APIs
│       └── awx/, awx-crm/     # Super-admin & CRM APIs
├── components/
│   ├── ui/           # Shadcn/ui primitives (button, input, dialog, select …)
│   ├── common/       # Shared non-primitive components (CarLoading, LightBox)
│   └── …             # Feature-scoped shared components (estimate/, task/, message/ …)
├── context/          # React Contexts (VoiceDeviceContext, TwilioDeviceContext)
├── error-boundary/   # globalErrorHandler, handlePrismaError, handleZodErrors
├── helpers/          # next-axios.ts (client-side HTTP client)
├── hooks/
│   ├── query-hook/   # TanStack Query hooks (useClientListQuery, useTaskById …)
│   └── use*.ts       # Custom React hooks (useDebounce, useOutsideClick …)
├── lib/              # Pure server-side utilities and singletons
│   ├── db.ts         # Prisma singleton
│   ├── pusher/       # server.ts, client.ts
│   ├── notification/ # Pusher + OneSignal notification helpers per domain
│   ├── platform-billing/ # Entitlement checks, Stripe billing
│   ├── companyId.ts  # getCompanyId() cached helper
│   ├── getCurrentUser.ts
│   ├── getPermissions.ts
│   ├── routeAccess.ts / routePermissionsMap.ts
│   ├── server-fetch.ts
│   └── …
├── reducers/         # useReducer reducers (leadReducer for pipeline drag state)
├── service/          # Domain service layers (virtual-shop, automation triggers, AI agent …)
├── services/         # Thin service helpers (giftCardPurchaseService, confirmShopBooking)
├── stores/           # Zustand stores
├── types/            # Shared TypeScript types and interfaces
├── utils/            # Pure utility functions (formatCurrency, normalizePhone, permissions …)
└── validations/
    └── schemas/      # Zod schemas + inferred types, grouped by domain
```

## Naming Conventions

**Files and folders:**

- React components: `PascalCase.tsx` (e.g. `EditClient.tsx`, `PaymentTable.tsx`)
- Server actions: `camelCase.ts` (e.g. `createTask.ts`, `getClientList.ts`)
- Hooks: `use` prefix + `camelCase.ts` (e.g. `useDebounce.ts`, `useClientListQuery.ts`)
- Zustand stores: inconsistent but lean `camelCase.ts` or descriptive `camelCaseStore.ts`; exported hook is always `use*Store` (e.g. `usePermissionStore`, `usePopupStore`)
- Utility functions: `camelCase.ts` (e.g. `formatCurrency.ts`, `normalizePhone.ts`)
- Route-private folders: `_prefix` (e.g. `_component/`, `_hooks/`, `_utils/`, `_actions/`)
- Multi-word folder names in routes: `kebab-case` (e.g. `communication-automation/`, `platform-billing/`)
- Zod validation files: `<domain>.validation.ts`

**TypeScript:**

- Interfaces/types exported from `src/types/`: `PascalCase` for interfaces, `TPascalCase` for type aliases (e.g. `TErrorHandler`, `TCreateTaskValidationSchema`)
- Prisma-generated types are imported directly from `@prisma/client`
- Zod inferred types use `T` prefix: `type TCreateTaskValidationSchema = z.infer<typeof createTaskValidationSchema>`

**Components:**

- Page files are always named `page.tsx`; layout files `layout.tsx`
- Default-exported React components always use `PascalCase` function names matching the file
- `"use client"` directive goes on the very first line of client components; server components have no directive

## Key Conventions

**`getCompanyId()`** (`src/lib/companyId.ts`) — cached async helper to get `companyId` from session in Server Components. Use this instead of fetching the session manually when only the company ID is needed.

**`getUserFromSession()`** (`src/lib/getCurrentUser.ts`) — get full user object from session or by userId.

**Utility: `cn()`** (`src/lib/cn.ts`) — `clsx` + `tailwind-merge`. Use for all conditional className logic.

**Toasts** — use `successToast()` / `errorToast()` from `src/lib/toast.ts` (wraps `react-hot-toast`).

**Validations** — Zod schemas live in `src/validations/schemas/`. Always export inferred `T*` types alongside schemas.

**Folder naming inside feature routes** — private folders prefixed with `_` (`_component`, `_hooks`, `_utils`, `_actions`) to exclude them from Next.js routing.

**Shadcn/ui** components are in `src/components/ui/` (style: `new-york`, neutral base color, CSS variables). Add new components with `npx shadcn@latest add <component>`.

**Icons** — Lucide React is the primary icon library (configured in `components.json`).

**Data fetching pattern** — Server Components fetch directly via `db` or server actions. Client Components use TanStack Query hooks or `useServerGet` for one-off server action calls.

**`revalidatePath`** — must be called after any mutation server action to clear Next.js caches.

## Adding a New Feature

Most new features follow this file-creation checklist. Use an existing domain (e.g. `payments`, `client`) as a reference.

### 1. Database — `prisma/schema.prisma`

Add the new model or fields. Then run:

```bash
npx prisma migrate dev --name describe_change
# or for schema-only regeneration without a migration:
npx prisma generate
```

### 2. Zod validation — `src/validations/schemas/<domain>/<domain>.validation.ts`

```ts
import { z } from "zod";
export const createFooSchema = z.object({ ... });
export type TCreateFooSchema = z.infer<typeof createFooSchema>;
```

### 3. Server Actions — `src/actions/<domain>/`

One file per operation (`create.ts`, `edit.ts`, `delete.ts`, `get.ts`):

```ts
"use server";
import { db } from "@/lib/db";
import { getCompanyId } from "@/lib/companyId";
import { errorHandler } from "@/error-boundary/globalErrorHandler";
import { ServerAction } from "@/types/action";
import { revalidatePath } from "next/cache";

export async function createFoo(data: TCreateFooSchema): Promise<ServerAction> {
  try {
    const companyId = await getCompanyId();
    const result = await db.foo.create({ data: { ...data, companyId } });
    revalidatePath("/dashboard/<feature>");
    return { type: "success", data: result };
  } catch (error) {
    return errorHandler(error);
  }
}
```

### 4. API Route (if needed for external/mobile access) — `src/app/api/<domain>/route.ts`

```ts
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import httpStatus from "http-status";
import { errorHandler } from "@/error-boundary/globalErrorHandler";

/**
 * @swagger
 * /api/<domain>:
 *   post:
 *     summary: Create foo
 *     tags: [Foo]
 *     security:
 *       - bearerAuth: []
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    // ... logic
    return NextResponse.json({ statusCode: httpStatus.OK, data: result });
  } catch (err) {
    const error = errorHandler(err);
    return NextResponse.json(error, { status: error.statusCode });
  }
}
```

If the route must be publicly accessible (no auth), add it to `PUBLIC_API_ROUTES` in `src/constants/public-route.ts`.

### 5. TanStack Query hook (if client components need to read data) — `src/hooks/query-hook/use<Domain>Query.ts`

```ts
import { queryKeys } from "@/lib/queryKeys";
import { useQuery } from "@tanstack/react-query";
import { getFoos } from "@/actions/<domain>/get";

export default function useFooQuery() {
  return useQuery({
    queryKey: [queryKeys.fooList], // add key to src/lib/queryKeys.ts
    queryFn: () => getFoos(),
  });
}
```

### 6. Zustand store (if complex client-side state is needed) — `src/stores/<domain>Store.ts`

```ts
import { create } from "zustand";

type FooStore = { items: Foo[]; setItems: (items: Foo[]) => void };
export const useFooStore = create<FooStore>((set) => ({
  items: [],
  setItems: (items) => set({ items }),
}));
```

### 7. Page & components — `src/app/(dashboard)/dashboard/<feature>/`

```
<feature>/
  page.tsx          # Server Component — fetches initial data, passes to children
  layout.tsx        # Optional — shared chrome (tabs, sidebar)
  _component/       # Client components scoped to this feature
    FooTable.tsx
    CreateFoo.tsx
  _hooks/           # Feature-local hooks
  _actions/         # Feature-local server actions (if too many to share)
```

### 8. Permission gate (if the feature should be permission-gated)

- Add a `PermissionKeys` entry to `ROUTE_PERMISSIONS_MAP` in `src/lib/routePermissionsMap.ts`
- Add the corresponding field to the relevant `PermissionFor*` Prisma model

## Environment Variables

Key variables (see `.env.example` if present):

- `DATABASE_URL`, `DIRECT_URL` — PostgreSQL
- `NEXTAUTH_URL`, `NEXTAUTH_SECRET`, `ACCESS_SECRET`
- `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_ROOT_DOMAIN`
- `PUSHER_ID`, `PUSHER_KEY`, `PUSHER_SECRET`, `PUSHER_CLUSTER`, `NEXT_PUBLIC_PUSHER_KEY`, `NEXT_PUBLIC_PUSHER_CLUSTER`
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
- `AWS_BUCKET_REGION`, `AUTOWORX_AWS_ACCESS_KEY`, `AUTOWORX_AWS_SECRET_KEY`
- `STRIPE_SECRET_KEY`, Authorize.Net keys
- Twilio, Infobip, Mailgun, SendGrid credentials

`next-runtime-env` / `PublicEnvScript` are used to expose `NEXT_PUBLIC_*` vars to the browser at runtime (not build time), so use `env("NEXT_PUBLIC_FOO")` from `next-runtime-env` — not `process.env.NEXT_PUBLIC_FOO` — in client-side code.

## Meta (Instagram + Facebook) Messaging Integration

Allows shop staff to send and receive Instagram DMs and Facebook Messenger messages directly inside the Client Communication Hub, alongside existing SMS and Email channels.

### What it does

- OAuth flow connects a Facebook Page (and its linked Instagram Business Account) to a company
- Incoming messages from Instagram DMs and Facebook Messenger are received via webhook, saved as `ClientMetaMessage`, and pushed in real-time via Pusher
- Outgoing messages are sent via the Meta Graph API and saved with `sentBy: "Company"`
- First-time senders auto-create a `Client` record; existing clients are matched by `metaSenderId`
- The Communication Hub shows Meta as a 4th tab (Messenger icon) in `ChatHead.tsx`; clicking opens a popover to choose Instagram or Facebook
- `ClientItem.tsx` shows the latest Meta message preview and an unread badge
- The Settings → Communications page has a `MetaIntegrationCard` showing connected state (page name, IG handle, Disconnect button) or a Connect button

### Data models

**`MetaCredentials`** — one row per Facebook Page per company. Stores encrypted `pageAccessToken` (AES-256-GCM via `src/lib/encryption.ts`), `pageId`, `pageName`, `instagramAccountId`, `instagramUsername`, `metaUserId`. Unique on `(companyId, pageId)`.

**`ClientMetaMessage`** — mirrors `ClientSmsMessage`. Fields: `message`, `platform` ("INSTAGRAM"|"FACEBOOK"), `metaMessageId`, `metaSenderId`, `sentBy` (Client|Company), `isRead`, `userId`, `companyId`, `clientId`. Has `attachments: ClientMetaAttachments[]`.

**`ClientMetaAttachments`** — `url`, `name`, `type`, cascades on message delete.

**`ClientConversationTrack`** additions: `metaLastMessage`, `metaIsRead`, `metaUnReadCount`, `metaLastPlatform`.

**`Client`** addition: `metaSenderId` — the Meta PSID (page-scoped user ID) for matching incoming messages.

### Data flow

```
OAuth connect (initiateMetaConnect)
  → Facebook dialog
  → GET /api/meta/callback
      → exchange code → long-lived token
      → fetch pages + IG accounts
      → subscribe page webhooks
      → upsert MetaCredentials (encrypted token)
      → redirect → /dashboard/settings/communications?meta=connected

Incoming message
  → POST /api/meta/webhook
      → find MetaCredentials by pageId
      → find/create Client by metaSenderId
      → create ClientMetaMessage + ClientMetaAttachments
      → updateMetaChatTrack (metaIsRead=false, metaUnReadCount++)
      → pusher.trigger("meta-{companyId}-{clientId}", "meta", message)
      → sendClientMailOrSMSNotify (client-notify Pusher + OneSignal)
      → pusher.trigger("message-{clientId}", "client", { count })

Outgoing message (sendMetaMessage server action)
  → POST Meta Graph API /me/messages
  → create ClientMetaMessage + ClientMetaAttachments
  → updateMetaChatTrackOutgoing (metaIsRead=true, no count increment)
  → pusher.trigger("meta-{companyId}-{clientId}", "meta", message)

UI receive (MetaContainer.tsx)
  → pusher.subscribe("meta-{companyId}-{clientId}").bind("meta", handler)
      → prepend to TanStack Query cache (metaQueryKey.allByClientId)
  → pusher.subscribe("message-{clientId}").bind("client", invalidate)
  → readMetaMessages(clientId) on mount → setClientConversationTrack
```

### Pusher channels

| Channel                                | Event             | Direction     | Purpose                           |
| -------------------------------------- | ----------------- | ------------- | --------------------------------- |
| `meta-{companyId}-{clientId}`          | `"meta"`          | server→client | New message in open chat          |
| `message-{clientId}`                   | `"client"`        | server→client | Unread count badge update         |
| `client-notify-{companyId}-{clientId}` | `"client-notify"` | server→client | Sidebar conversation track update |

### File inventory

**Schema & migration**

- `prisma/schema.prisma` — MetaCredentials, ClientMetaMessage, ClientMetaAttachments models; added fields to Client, Company, User, ClientConversationTrack
- `prisma/migrations/20260417000000_add_meta_integration.sql` — raw SQL applied via `npx prisma db execute --file`

**Utilities**

- `src/lib/encryption.ts` — `encrypt(text)` / `decrypt(text)` using AES-256-GCM; key from `META_TOKEN_ENCRYPTION_KEY` env var (64-char hex)

**Server Actions**

- `src/actions/meta/connect.ts` — `initiateMetaConnect()` — builds OAuth URL and redirects
- `src/actions/meta/disconnect.ts` — `disconnectMeta(integrationId)` — sets `isActive: false`
- `src/actions/meta/sendMessage.ts` — `sendMetaMessage({ clientId, message, platform, attachments? })`

**API Routes** (both in `PUBLIC_API_ROUTES`)

- `src/app/api/meta/callback/route.ts` — GET: OAuth code exchange and credential upsert
- `src/app/api/meta/webhook/route.ts` — GET: webhook verification; POST: incoming message handler

**Feature-local actions** (`communication/client/_actions/`)

- `getMetaMessages.ts` — paginated fetch (mirrors `getSms.ts`)
- `getMetaCredentials.ts` — fetch active credentials for current company
- `readMetaMessages.ts` — sets `metaIsRead: true`, `metaUnReadCount: 0`

**Feature-local hooks** (`communication/client/_hooks/`)

- `useInfinityMetaQuery.ts` — TanStack `useInfiniteQuery` wrapper (mirrors `useInfinitySmsQuery.ts`)
- `useMetaSendMutation.ts` — upload files → `sendMetaMessage`, optimistic cache update (mirrors `useSmsSendMutation.ts`)

**UI Components** (`communication/client/_component/conversations/meta/`)

- `Meta.tsx` — Server Component; checks MetaCredentials, shows `RedirectToSettings` if not connected
- `MetaContainer.tsx` — Pusher subscriptions, `readMetaMessages` on mount, renders MetaBox + SendMeta
- `MetaBox.tsx` — Infinite scroll message list (mirrors `SmsBox.tsx`)
- `MetaMessage.tsx` — Single message bubble with platform badge (IG = purple-pink gradient, FB = `#1877F2`)
- `SendMeta.tsx` — Textarea + platform toggle (Instagram / Facebook) + attachment support

**Settings**

- `src/app/(dashboard)/dashboard/settings/communications/MetaIntegrationCard.tsx` — connected/disconnected card
- `src/app/(dashboard)/dashboard/settings/communications/MetaConnectedToast.tsx` — reads `?meta=connected`, fires toast, clears param

**Modified files**

- `src/constants/public-route.ts` — added `/api/meta/callback`, `/api/meta/webhook`
- `communication/client/_component/conversations/ChatHead.tsx` — Meta tab (Messenger icon + popover)
- `communication/client/_component/conversations/ConversationsBox.tsx` — INSTAGRAM / FACEBOOK cases
- `communication/client/_component/ClientItem.tsx` — Meta preview row and unread badge
- `communication/client/_utils/queryKey.ts` — `metaQueryKey`
- `src/app/(dashboard)/dashboard/settings/communications/page.tsx` — fetches MetaCredentials, renders card + toast

### Environment variables required

```
META_APP_ID=                    # Facebook App ID
META_APP_SECRET=                # Facebook App Secret
META_OAUTH_REDIRECT_URI=        # Must match app dashboard (e.g. https://yourdomain.com/api/meta/callback)
META_WEBHOOK_VERIFY_TOKEN=      # Any random string — set same in Meta app webhook config
META_TOKEN_ENCRYPTION_KEY=      # 64-char hex string (openssl rand -hex 32)
```

### Important implementation notes

- **Do not use `prisma migrate dev`** for schema changes — write raw SQL in `prisma/migrations/` and apply with `npx prisma db execute --file prisma/migrations/<file>.sql`, then `npx prisma generate`.
- **`ClientConversationTrack` new meta fields** (`metaIsRead`, `metaUnReadCount`, `metaLastMessage`, `metaLastPlatform`) are not yet in the Prisma-generated TypeScript type in all places. Use `as any` casts where needed until the type is regenerated and propagated.
- **Platform routing**: URL param `open=INSTAGRAM` or `open=FACEBOOK` determines which channel is selected. Both render `MetaContainer` (which shows ALL meta messages). The `activePlatform` state inside `MetaContainer` / `SendMeta` controls which platform outgoing messages are sent on.
- **Webhook always returns 200** — Meta retries on non-2xx responses, which would create duplicate messages.
- **Token encryption**: `pageAccessToken` is stored encrypted (`iv:authTag:encryptedData` as a single colon-separated hex string). Never store the raw token.
