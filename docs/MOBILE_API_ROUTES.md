# Mobile Pipeline API Routes

These REST routes exist solely to support the `autoworx-native` mobile app. The web dashboard uses Next.js server actions and never calls these endpoints. All routes live under:

```
src/app/api/pipeline/sales/
  _shared.ts        Shared auth, validation, and error helpers
  pipeline/route.ts Kanban initial load
  columns/route.ts  Column list + create
  leads/route.ts    Paginated list view + column load-more
  tags/route.ts     SALES tag catalog
```

---

## Why REST routes instead of server actions

Next.js server actions run only in the server component / form submission context — they are not callable over HTTP from an external process. The React Native app is a separate binary that communicates over the network, so plain REST endpoints are required.

The NestJS automation backend (`autoworx-automation-backend`) owns most of the app's data endpoints. The pipeline routes are an exception: the `Column` and `Lead` models were originally web-only and live in the Prisma schema managed by `autoworx-platform`. Rather than duplicating those Prisma queries in the NestJS backend, the mobile team added lightweight REST routes directly in the Next.js app.

---

## Authentication

Every route requires a valid JWT Bearer token issued by the platform:

```
Authorization: Bearer <accessToken>
```

The token is verified with `jwtVerifyToken` (a thin wrapper around `jose`'s `jwtVerify`). On success, `companyId` is extracted from the JWT payload and scoped to every DB query so users can only read their own company's data.

**Token errors always return HTTP 401** — the JWT library can throw many error subtypes (`JWTExpired`, `JWTInvalid`, etc.) but `_shared.ts` normalises all of them to `"Unauthorized"` before calling `pipelineError`, so no internal error detail is leaked to clients.

**Next.js middleware note**: The middleware at `src/middleware.ts` intercepts all non-public routes and may return HTTP 200 with body `{ status: 401 }` for session-level auth failures. The mobile RTK Query base query checks for `result?.data?.status === 401` as well as the HTTP status code.

---

## Standard error response

All routes use the same error shape on failure:

```json
{ "success": false, "error": "<message>" }
```

| HTTP status | When                                                                                            |
| ----------- | ----------------------------------------------------------------------------------------------- |
| 400         | Invalid request body (POST only)                                                                |
| 401         | Missing/invalid/expired Bearer token                                                            |
| 500         | Unexpected server or DB error (message is a generic fallback, internal detail is not forwarded) |

---

## Shared helpers (`_shared.ts`)

| Export                                  | Purpose                                                                                         |
| --------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `extractCompanyId(request)`             | Verify JWT, return `companyId`; throw `"Unauthorized"` on any failure                           |
| `pipelineError(error, fallback)`        | Return consistent JSON error response with correct HTTP status                                  |
| `parseOrderField(raw)`                  | Validate sort field; default `"createdAt"`. Accepts `createdAt \| updatedAt \| columnChangedAt` |
| `parseIntParam(raw, default, min, max)` | Parse and clamp an integer query param                                                          |
| `sanitizeSearchTerm(raw, maxLength)`    | Trim and truncate free-text search; return `undefined` when empty                               |
| `parseDateParam(raw)`                   | Return `undefined` when the value is not a valid ISO date string                                |

---

## Route Reference

### `GET /api/pipeline/sales/pipeline`

Kanban initial load — returns all columns with their first 10 leads and total lead count per column.

**Query params**

| Param        | Type                                        | Default     | Notes                                            |
| ------------ | ------------------------------------------- | ----------- | ------------------------------------------------ |
| `orderBy`    | `createdAt \| updatedAt \| columnChangedAt` | `createdAt` | Sort field (always descending)                   |
| `searchTerm` | string                                      | —           | Filters leads inside every column; max 100 chars |

**Response**

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "title": "New Lead",
      "type": "sales",
      "order": 0,
      "bgColor": "#6571FF",
      "textColor": "#FFFFFF",
      "companyId": 42,
      "lead": [
        /* TLead[] — first 10 */
      ],
      "_count": { "lead": 34 }
    }
  ]
}
```

**Prisma models queried**: `Column`, `Lead`, `User` (as `salesUser`), `LeadTag`, `Tag`, `Client`

**DB access pattern**: One `column.findMany` + N parallel `lead.findMany` + N parallel `lead.count` (one pair per column). For typical shop pipelines with 3–6 columns this is 7–13 queries in a single request. A future optimisation would be a single raw SQL query with `ROW_NUMBER()`.

---

### `GET /api/pipeline/sales/columns`

Column catalog — used by the `MoveStageSheet` to show available stages.

**Query params**

| Param  | Type            | Default | Notes              |
| ------ | --------------- | ------- | ------------------ |
| `type` | `sales \| shop` | `sales` | Column type filter |

**Response**

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "title": "New Lead",
      "type": "sales",
      "order": 0,
      "bgColor": "#6571FF",
      "textColor": "#FFFFFF",
      "companyId": 42
    }
  ]
}
```

---

### `POST /api/pipeline/sales/columns`

Create a new pipeline column. Used by the web dashboard column manager; the mobile app does not call this endpoint.

**Request body**

```json
{
  "title": "Quoted",
  "type": "sales",
  "bgColor": "#6571FF",
  "textColor": "#FFFFFF"
}
```

- `title` and `type` are required; `bgColor` / `textColor` are optional
- `title` is trimmed and capped at 100 chars; colors capped at 20 chars

**Response**: `{ "success": true, "data": <column> }`

---

### `GET /api/pipeline/sales/leads`

Dual-mode endpoint — the behavior depends on whether `page` is present:

#### Mode 1 — Paginated list (`page` present)

Used by `usePipelineList` for the flat-list view.

**Query params**

| Param        | Type             | Default     | Notes                                                                     |
| ------------ | ---------------- | ----------- | ------------------------------------------------------------------------- |
| `page`       | integer ≥ 1      | 1           | Page number                                                               |
| `take`       | integer [1, 100] | 10          | Page size                                                                 |
| `orderBy`    | field name       | `createdAt` | Sort field (always descending)                                            |
| `searchTerm` | string           | —           | Full-text filter across `clientName`, `vehicleInfo`, `services`, `source` |
| `columnId`   | integer ≥ 1      | —           | Filter by stage                                                           |
| `assignedTo` | integer ≥ 1      | —           | Filter by sales rep user ID                                               |
| `source`     | string ≤ 100     | —           | Exact match on `source` field                                             |
| `service`    | string ≤ 100     | —           | Exact match on `services` field                                           |
| `status`     | string ≤ 100     | —           | Exact match on column `title`                                             |
| `startDate`  | ISO date         | —           | Inclusive; `createdAt ≥ startDate`                                        |
| `endDate`    | ISO date         | —           | Inclusive; `createdAt ≤ endDate + 23:59:59.999`                           |

**Response**

```json
{
  "success": true,
  "data": [
    /* TLead[] */
  ],
  "meta": {
    "total": 158,
    "page": 1,
    "take": 20,
    "totalPages": 8,
    "hasNextPage": true
  }
}
```

#### Mode 2 — Column load-more (`page` absent)

Used by `usePipelineKanban.handleLoadMoreLeads` when the user taps "Load more" in a kanban column.

**Query params** (in addition to filter params above)

| Param      | Type             | Default | Notes                                                      |
| ---------- | ---------------- | ------- | ---------------------------------------------------------- |
| `columnId` | integer ≥ 1      | —       | Required in practice — load-more always scopes to a column |
| `skip`     | integer ≥ 0      | 0       | Offset into the column's lead list                         |
| `take`     | integer [1, 100] | 10      | Batch size                                                 |

**Response**

```json
{
  "success": true,
  "data": [
    /* TLead[] */
  ],
  "totalCount": 34
}
```

The `totalCount` lets the mobile UI know whether more pages exist without a separate count query.

---

### `GET /api/pipeline/sales/tags`

Returns all `SALES`-type tags for the authenticated company, used to populate `TagSelectorSheet`.

**No query params.**

**Response**

```json
{
  "success": true,
  "data": [
    {
      "id": 7,
      "name": "Hot Lead",
      "bgColor": "#FF4444",
      "textColor": "#FFFFFF",
      "type": "SALES",
      "companyId": 42
    }
  ]
}
```

**Prisma model queried**: `Tag` (filtered by `type: "SALES"` and `companyId`)

---

## Lead shape (`TLead`)

All lead-returning routes produce the same object shape. Key transformations from the raw Prisma row:

- `salesUser` → renamed to `assignedSalesUser` (or `null`)
- `Client[]` → filtered to the single record where `companyId` matches and `leadId` matches the lead, then flattened to `client` (or `null`)
- `LeadTag[]` → included as `leadTags` with nested `tag` object

```typescript
type TLead = {
  id: number;
  clientName: string;
  vehicleInfo: string | null;
  services: string | null;
  source: string | null;
  columnId: number;
  companyId: number;
  assignedSalesUserId: number | null;
  estimateCreated: boolean;
  createdAt: string;
  updatedAt: string;
  columnChangedAt: string;
  assignedSalesUser: {
    id: number;
    firstName: string;
    lastName: string;
    email: string;
    employeeType: string;
  } | null;
  leadTags: Array<{ id: number; leadId: number; tagId: number; tag: TTag }>;
  client: {
    id: number;
    firstName: string;
    lastName: string;
    mobile: string | null;
    countryCode: string | null;
    email: string | null;
  } | null;
};
```

---

## Prisma models

| Model     | Used by                                                             |
| --------- | ------------------------------------------------------------------- |
| `Column`  | `pipeline/route.ts`, `columns/route.ts`                             |
| `Lead`    | `pipeline/route.ts`, `leads/route.ts`                               |
| `User`    | Via `Lead.salesUser` relation                                       |
| `LeadTag` | Via `Lead.leadTags` relation                                        |
| `Tag`     | Via `LeadTag.tag` relation, and directly in `tags/route.ts`         |
| `Client`  | Via `Lead.Client` relation (one-to-many; filtered to single record) |

---

## Differences from the web app

| Area             | Web (server actions)                                          | Mobile (REST routes)                                                                       |
| ---------------- | ------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| Auth             | Next.js session cookie                                        | JWT Bearer token                                                                           |
| Column mutations | `createColumn`, `updateColumn`, `deleteColumn` server actions | Only `POST /columns` (create) is wired; update/delete are web-only                         |
| Lead mutations   | Many server actions (create, move, assign, tag, estimate)     | RTK Query endpoints that call the NestJS backend or other platform APIs — not these routes |
| Real-time        | Server-sent events / polling                                  | Pusher channel (`company-{id}`)                                                            |
| Pagination       | Cursor-based in some views                                    | Offset-based (`page`/`skip`)                                                               |
| Search           | Client-side filtering in some views                           | Server-side with `searchTerm` query param                                                  |

The four routes documented here are **read-only for leads** — lead mutations (move, assign, add tag, create estimate, remove) go through separate RTK Query endpoints that hit the NestJS automation backend, not these Next.js routes.
