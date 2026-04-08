# Pagination and Data Handling Audit

Date: 2026-04-08
Repository: autoworx-platform

## Executive Summary

This audit reviewed dashboard and reporting list screens for the same class of issue seen in Payments: large unbounded reads followed by client-side filtering and client-side pagination.

The core pattern appears repeatedly:

1. Parse page and page size in URL.
2. Fetch all rows anyway from Prisma.
3. Filter and sort in memory.
4. Render pagination UI using array length.

This creates slow page loads, large memory usage, and inconsistent pagination behavior under scale.

## Scope

The scan covered:

1. Dashboard list pages.
2. Reporting list pages.
3. Related server actions and hooks.
4. Both workspace repositories (primary findings are in autoworx-platform).

## How Findings Were Validated

Each finding was validated with direct code evidence:

1. Query source (Prisma query shape).
2. Filter location (server or client).
3. Pagination location (server or client).
4. Total count source (database count or array length).

## Severity Guide

1. Critical: high-latency user-facing pages with unbounded reads and client-side data processing.
2. High: large list screens with expensive includes and in-memory filtering/pagination.
3. Medium: risky patterns that can degrade with growth or cause unstable re-fetch behavior.

## Confirmed Findings

### 1) Critical: Revenue report uses fake pagination

Status: Confirmed

Evidence:

1. URL page and take are parsed but not used in query.

- [src/app/(dashboard)/dashboard/reporting/(report)/revenue/page.tsx#L82](<src/app/(dashboard)/dashboard/reporting/(report)/revenue/page.tsx#L82>)
- [src/app/(dashboard)/dashboard/reporting/(report)/revenue/page.tsx#L83](<src/app/(dashboard)/dashboard/reporting/(report)/revenue/page.tsx#L83>)

2. Unbounded invoice read with heavy includes.

- [src/app/(dashboard)/dashboard/reporting/(report)/revenue/page.tsx#L87](<src/app/(dashboard)/dashboard/reporting/(report)/revenue/page.tsx#L87>)

3. Client-side filtering and additional nested per-invoice queries.

- [src/app/(dashboard)/dashboard/reporting/(report)/revenue/page.tsx#L183](<src/app/(dashboard)/dashboard/reporting/(report)/revenue/page.tsx#L183>)
- [src/app/(dashboard)/dashboard/reporting/(report)/revenue/page.tsx#L224](<src/app/(dashboard)/dashboard/reporting/(report)/revenue/page.tsx#L224>)
- [src/app/(dashboard)/dashboard/reporting/(report)/revenue/page.tsx#L548](<src/app/(dashboard)/dashboard/reporting/(report)/revenue/page.tsx#L548>)

4. Pagination slices on client and uses array length as total.

- [src/app/(dashboard)/dashboard/reporting/(report)/revenue/RevenueDisplay.tsx#L74](<src/app/(dashboard)/dashboard/reporting/(report)/revenue/RevenueDisplay.tsx#L74>)
- [src/app/(dashboard)/dashboard/reporting/(report)/revenue/RevenueDisplay.tsx#L166](<src/app/(dashboard)/dashboard/reporting/(report)/revenue/RevenueDisplay.tsx#L166>)

Risk:

1. Slow report load with large invoice history.
2. High memory and CPU cost in server and browser.
3. Pagination controls do not reduce database work.

Recommended fix:

1. Add server action for paged revenue rows with full filter contract.
2. Return data and total from database count.
3. Keep calculations split: quick aggregates in SQL-safe logic, heavy analytics async if needed.

---

### 2) Critical: Payments report repeats the same anti-pattern

Status: Confirmed

Evidence:

1. URL page and take parsed.

- [src/app/(dashboard)/dashboard/reporting/(report)/payments/page.tsx#L64](<src/app/(dashboard)/dashboard/reporting/(report)/payments/page.tsx#L64>)
- [src/app/(dashboard)/dashboard/reporting/(report)/payments/page.tsx#L65](<src/app/(dashboard)/dashboard/reporting/(report)/payments/page.tsx#L65>)

2. Full payment read without skip/take.

- [src/app/(dashboard)/dashboard/reporting/(report)/payments/page.tsx#L69](<src/app/(dashboard)/dashboard/reporting/(report)/payments/page.tsx#L69>)

3. All filtering done in memory.

- [src/app/(dashboard)/dashboard/reporting/(report)/payments/page.tsx#L100](<src/app/(dashboard)/dashboard/reporting/(report)/payments/page.tsx#L100>)
- [src/app/(dashboard)/dashboard/reporting/(report)/payments/page.tsx#L136](<src/app/(dashboard)/dashboard/reporting/(report)/payments/page.tsx#L136>)
- [src/app/(dashboard)/dashboard/reporting/(report)/payments/page.tsx#L153](<src/app/(dashboard)/dashboard/reporting/(report)/payments/page.tsx#L153>)

4. Additional full payment read for outstanding payment.

- [src/app/(dashboard)/dashboard/reporting/(report)/payments/page.tsx#L171](<src/app/(dashboard)/dashboard/reporting/(report)/payments/page.tsx#L171>)

5. Client-side slicing and total from array length.

- [src/app/(dashboard)/dashboard/reporting/(report)/payments/PaymentDisplay.tsx#L95](<src/app/(dashboard)/dashboard/reporting/(report)/payments/PaymentDisplay.tsx#L95>)
- [src/app/(dashboard)/dashboard/reporting/(report)/payments/PaymentDisplay.tsx#L215](<src/app/(dashboard)/dashboard/reporting/(report)/payments/PaymentDisplay.tsx#L215>)

Risk:

1. Latency scales linearly with payment history.
2. Report response and memory blow up on large companies.

Recommended fix:

1. Introduce paginated payment-report action with server-side search/date/method filters.
2. Compute outstanding amount in grouped query, not by full materialized list.

---

### 3) Critical: Fleet list loads all records then filters/slices in client

Status: Confirmed

Evidence:

1. Unbounded fleet client query.

- [src/app/(dashboard)/dashboard/fleet/page.tsx#L12](<src/app/(dashboard)/dashboard/fleet/page.tsx#L12>)

2. Client-side filter state and filtering.

- [src/app/(dashboard)/dashboard/fleet/components/FleetList.tsx#L20](<src/app/(dashboard)/dashboard/fleet/components/FleetList.tsx#L20>)
- [src/app/(dashboard)/dashboard/fleet/components/FleetList.tsx#L25](<src/app/(dashboard)/dashboard/fleet/components/FleetList.tsx#L25>)

3. Client-side pagination via slice and total from length.

- [src/app/(dashboard)/dashboard/fleet/components/FleetListTable.tsx#L32](<src/app/(dashboard)/dashboard/fleet/components/FleetListTable.tsx#L32>)
- [src/app/(dashboard)/dashboard/fleet/components/FleetListTable.tsx#L128](<src/app/(dashboard)/dashboard/fleet/components/FleetListTable.tsx#L128>)

Risk:

1. Same scaling issue as Payments before optimization.

Recommended fix:

1. Move search and pagination to server action.
2. Keep table and cards unchanged; only data pipeline changes.

---

### 4) High: Work Orders pipeline fetch is unbounded and include-heavy

Status: Confirmed

Evidence:

1. Action fetches all work orders and deep relations.

- [src/actions/pipelines/getWorkOrders.ts#L8](src/actions/pipelines/getWorkOrders.ts#L8)
- [src/actions/pipelines/getWorkOrders.ts#L14](src/actions/pipelines/getWorkOrders.ts#L14)
- [src/actions/pipelines/getWorkOrders.ts#L17](src/actions/pipelines/getWorkOrders.ts#L17)
- [src/actions/pipelines/getWorkOrders.ts#L21](src/actions/pipelines/getWorkOrders.ts#L21)

2. Client runs multiple filters and sorting in memory.

- [src/app/(dashboard)/dashboard/pipeline/components/WorkOrders.tsx#L39](<src/app/(dashboard)/dashboard/pipeline/components/WorkOrders.tsx#L39>)
- [src/app/(dashboard)/dashboard/pipeline/components/WorkOrders.tsx#L102](<src/app/(dashboard)/dashboard/pipeline/components/WorkOrders.tsx#L102>)

Risk:

1. Large payload and expensive client-side filtering.
2. Slow interaction with complex shop data.

Recommended fix:

1. Add server query params for status/date/search/service/technician.
2. Replace include-heavy shape with list-optimized select.

---

### 5) High: Teams report is all-load + client-filter + client-pagination

Status: Confirmed

Evidence:

1. Full user list with technician relation.

- [src/app/(dashboard)/dashboard/reporting/(report)/teams/page.tsx#L67](<src/app/(dashboard)/dashboard/reporting/(report)/teams/page.tsx#L67>)

2. In-memory filtering by type/date/search.

- [src/app/(dashboard)/dashboard/reporting/(report)/teams/page.tsx#L77](<src/app/(dashboard)/dashboard/reporting/(report)/teams/page.tsx#L77>)

3. Client-side slicing and total length paginator.

- [src/app/(dashboard)/dashboard/reporting/(report)/teams/WorkforceDisplay.tsx#L82](<src/app/(dashboard)/dashboard/reporting/(report)/teams/WorkforceDisplay.tsx#L82>)
- [src/app/(dashboard)/dashboard/reporting/(report)/teams/WorkforceDisplay.tsx#L214](<src/app/(dashboard)/dashboard/reporting/(report)/teams/WorkforceDisplay.tsx#L214>)

Risk:

1. Performance decays as employee and technician records grow.

Recommended fix:

1. Paged employee analytics endpoint with server-side filter where clauses.

---

### 6) High: Inventory report has disabled server pagination and client slicing

Status: Confirmed

Evidence:

1. Unbounded inventory queries and commented skip/take.

- [src/app/(dashboard)/dashboard/reporting/(report)/inventory/page.tsx#L63](<src/app/(dashboard)/dashboard/reporting/(report)/inventory/page.tsx#L63>)
- [src/app/(dashboard)/dashboard/reporting/(report)/inventory/page.tsx#L97](<src/app/(dashboard)/dashboard/reporting/(report)/inventory/page.tsx#L97>)
- [src/app/(dashboard)/dashboard/reporting/(report)/inventory/page.tsx#L101](<src/app/(dashboard)/dashboard/reporting/(report)/inventory/page.tsx#L101>)

2. Client-side transform and pagination slice.

- [src/app/(dashboard)/dashboard/reporting/(report)/inventory/InventoryDisplay.tsx#L163](<src/app/(dashboard)/dashboard/reporting/(report)/inventory/InventoryDisplay.tsx#L163>)
- [src/app/(dashboard)/dashboard/reporting/(report)/inventory/InventoryDisplay.tsx#L233](<src/app/(dashboard)/dashboard/reporting/(report)/inventory/InventoryDisplay.tsx#L233>)

Risk:

1. Large product history generates heavy server and client processing.

Recommended fix:

1. Re-enable and complete server-side pagination and filtering.
2. Keep computed metrics in a dedicated aggregate path.

---

### 7) High: Estimate canned page computes paginated arrays but does not use them

Status: Confirmed

Evidence:

1. Full canned labor/service reads.

- [src/app/(dashboard)/dashboard/estimate/canned/page.tsx#L35](<src/app/(dashboard)/dashboard/estimate/canned/page.tsx#L35>)
- [src/app/(dashboard)/dashboard/estimate/canned/page.tsx#L40](<src/app/(dashboard)/dashboard/estimate/canned/page.tsx#L40>)

2. Paginated arrays are created but not passed to UI.

- [src/app/(dashboard)/dashboard/estimate/canned/page.tsx#L84](<src/app/(dashboard)/dashboard/estimate/canned/page.tsx#L84>)
- [src/app/(dashboard)/dashboard/estimate/canned/page.tsx#L85](<src/app/(dashboard)/dashboard/estimate/canned/page.tsx#L85>)
- [src/app/(dashboard)/dashboard/estimate/canned/page.tsx#L97](<src/app/(dashboard)/dashboard/estimate/canned/page.tsx#L97>)

3. Child components filter and paginate in memory.

- [src/app/(dashboard)/dashboard/estimate/CannedServices.tsx#L63](<src/app/(dashboard)/dashboard/estimate/CannedServices.tsx#L63>)
- [src/app/(dashboard)/dashboard/estimate/CannedServices.tsx#L100](<src/app/(dashboard)/dashboard/estimate/CannedServices.tsx#L100>)
- [src/app/(dashboard)/dashboard/estimate/CannedLabor.tsx#L62](<src/app/(dashboard)/dashboard/estimate/CannedLabor.tsx#L62>)
- [src/app/(dashboard)/dashboard/estimate/CannedLabor.tsx#L100](<src/app/(dashboard)/dashboard/estimate/CannedLabor.tsx#L100>)

Risk:

1. Double work and inconsistent pagination totals.

Recommended fix:

1. Single source of truth server paginator for canned labor/service list.

---

### 8) Medium: Technician reporting query is unbounded with deep include graph

Status: Confirmed

Evidence:

1. Full technician history load with nested relations.

- [src/app/(dashboard)/dashboard/reporting/technicianreporting/page.tsx#L23](<src/app/(dashboard)/dashboard/reporting/technicianreporting/page.tsx#L23>)
- [src/app/(dashboard)/dashboard/reporting/technicianreporting/page.tsx#L30](<src/app/(dashboard)/dashboard/reporting/technicianreporting/page.tsx#L30>)

Risk:

1. Becomes expensive for long history users.

Recommended fix:

1. Add date-window and paging for technician work history lists.

---

### 9) Medium: Shared data hook dependency model can cause unstable fetch behavior

Status: Confirmed

Evidence:

1. Effect depends on spread args only.

- [src/hooks/useServerGet.ts#L48](src/hooks/useServerGet.ts#L48)

2. Function identity not included in dependency model while called inside effect.

- [src/hooks/useServerGet.ts#L27](src/hooks/useServerGet.ts#L27)

Risk:

1. Unnecessary refetches for unstable args.
2. Potential stale or missed refresh behavior.

Recommended fix:

1. Convert to useCallback-based fetch with explicit deps including fn.
2. Add stable query keys where possible.

## Architectural Anti-Pattern Summary

Across affected pages, the same four anti-patterns recur:

1. Unbounded findMany for list pages.
2. include-heavy relation loading for table rows.
3. Client-side filter/sort/slice over full arrays.
4. Paginator total derived from in-memory array length.

## Target Data Contract for List Screens

Every list/report page should use the same server contract:

1. Input:

- page
- take
- search
- filters
- dateRange
- sort

2. Output:

- data
- total
- page
- take

UI keeps existing controls and rendering. Only data source behavior changes.

## Recommended Rollout Order

1. reporting revenue
2. reporting payments
3. fleet list
4. pipeline work orders
5. reporting teams
6. reporting inventory
7. estimate canned

This order prioritizes screens with highest user-facing latency risk.

## Acceptance Criteria

For each converted screen:

1. No unbounded list query for paginated view path.
2. Filters and search executed in server query.
3. Paginator total comes from database count.
4. Client no longer slices full list for primary table rendering.
5. Existing UI behavior and controls remain unchanged.

## Notes on autoworx-automation-backend

The backend repo has many findMany calls, but most are automation and processing paths, not interactive paginated list UIs. Primary user-facing pagination and client filtering issues are concentrated in autoworx-platform.

## Suggested Next Action

Create one shared helper for paginated list actions and migrate modules incrementally using the rollout order above.
