# Security Patch: Authenticate /api/estimate/[companyId]/\* Routes

## Summary

Prior to this patch, all routes under `/api/estimate/[companyId]/*` (and `/api/estimate/company`, `/api/invoice/company/[companyId]`) read `companyId` directly from the URL path or query string with no JWT or session validation. Any caller who knew or guessed a companyId integer could read or write estimate data for that company. This patch applies the existing `getCompanyIdFromBearer` auth utility (already in production use on `/api/pipeline/sales/*` routes) to all affected routes.

## Vulnerability Detail

- **Affected routes:** all 17 files listed under "Files Changed" below
- **Attack:** A caller sends `GET /api/estimate/42/clients` with no `Authorization` header and receives every client record for company 42. Same for any read or write operation — no auth was required.
- **Discovery:** Found during Phase 0 reconnaissance of the mobile Estimates & Invoices build.

## Patch Behavior

- All affected routes now require an `Authorization: Bearer <jwt>` header.
- The JWT must be signed with `ACCESS_SECRET` (same secret used by the NestJS backend to issue tokens and by NextAuth for web session verification).
- If the bearer token is missing or invalid → `401 Unauthorized`.
- If the URL `[companyId]` does not match the JWT's `companyId` claim → `403 Forbidden`.
- All DB queries inside the handler use the JWT's `companyId` (`jwtCompanyId`) as the scoping value — the URL param is validated against it but not used directly for queries.
- For `estimate/company` (no `[companyId]` path segment): the query-string `companyId` param is ignored entirely; `jwtCompanyId` is used directly.

## Web App Compatibility

Pre-flight check confirmed **no web pages or components call these routes**. A grep across `src/app/`, `src/components/`, `src/hooks/`, `src/lib/`, and `src/actions/` found zero calls to `/api/estimate/` or `/api/invoice/company/` outside of the API route handlers themselves. The only hit was `/api/invoice/track-view`, which is explicitly out of scope (public endpoint). No web behavior changes.

## Files Changed

| File                                                             | Methods Patched    |
| ---------------------------------------------------------------- | ------------------ |
| `src/app/api/estimate/[companyId]/route.ts`                      | GET, POST          |
| `src/app/api/estimate/[companyId]/[id]/route.ts`                 | GET, PATCH, DELETE |
| `src/app/api/estimate/[companyId]/[id]/convert/route.ts`         | PATCH              |
| `src/app/api/estimate/[companyId]/categories/route.ts`           | GET                |
| `src/app/api/estimate/[companyId]/clients/route.ts`              | GET                |
| `src/app/api/estimate/[companyId]/labors/route.ts`               | GET                |
| `src/app/api/estimate/[companyId]/materials/route.ts`            | GET                |
| `src/app/api/estimate/[companyId]/payment-methods/route.ts`      | GET                |
| `src/app/api/estimate/[companyId]/services/route.ts`             | GET                |
| `src/app/api/estimate/[companyId]/statuses/route.ts`             | GET                |
| `src/app/api/estimate/[companyId]/tags/route.ts`                 | GET                |
| `src/app/api/estimate/[companyId]/vehicles/route.ts`             | GET                |
| `src/app/api/estimate/[companyId]/templates/route.ts`            | GET, POST          |
| `src/app/api/estimate/[companyId]/templates/[id]/route.ts`       | GET, PATCH, DELETE |
| `src/app/api/estimate/[companyId]/templates/[id]/clone/route.ts` | POST               |
| `src/app/api/estimate/company/route.ts`                          | GET                |
| `src/app/api/invoice/company/[companyId]/route.ts`               | GET                |

**Total: 17 files, 22 handler functions patched.**

## Out of Scope (Known Follow-ups)

- **`/api/upload` and `getSignedURL`** — also unauthenticated (session check is commented out). Separate fix required.
- **`ACCESS_SECRET` fallback to `""`** in `jwtVerify.ts` and `authOptions.ts` — if the env var is absent, verification silently fails against an empty-string secret instead of throwing a startup error. Should be hardened to crash-fast on missing config.
- **`updateWorkOrderStatus.ts`** — the `db.invoice.update` call that moves a work order to a new column is entirely commented out. Known platform issue, unrelated to this patch.
- **Pre-existing `vehicleExtraCost` unused variable** in `[companyId]/route.ts` and `[companyId]/[id]/route.ts` — TypeScript hint only, not introduced by this patch.
- **`/api/pipeline/shop/*` routes** — unauthenticated, will be addressed in Phase 2.

## Testing

Manual smoke test with curl (replace `<token>` with a valid JWT for company 1):

```bash
# Without auth → expect 401
curl http://localhost:3000/api/estimate/1/clients

# With wrong companyId → expect 403
curl -H "Authorization: Bearer <valid-jwt-for-company-2>" http://localhost:3000/api/estimate/1/clients

# With matching companyId → expect 200 + data
curl -H "Authorization: Bearer <valid-jwt-for-company-1>" http://localhost:3000/api/estimate/1/clients

# Main list route (GET)
curl -H "Authorization: Bearer <valid-jwt-for-company-1>" http://localhost:3000/api/estimate/1

# estimate/company route (companyId from JWT, not query string)
curl -H "Authorization: Bearer <valid-jwt-for-company-1>" "http://localhost:3000/api/estimate/company?type=Estimate"
```

## Merge Notes for Dev Team

- This is a security fix. Recommend prioritizing review.
- Patch is mechanical — same auth block inserted at the top of every handler.
- No business logic, response shapes, or DB query logic changed beyond replacing the URL-param companyId with the JWT companyId.
- Tested locally against the dev environment.
- Next: Phase 1 of the mobile Estimates & Invoices build will create new authenticated routes (manual payment recording, send-email, send-SMS, technician work-orders) on top of this now-secured foundation.
