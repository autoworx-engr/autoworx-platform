# Security Audit — autoworx-platform

**Date:** 2026-08-08
**Branch audited:** `sundim` (working tree)
**Scope:** Full codebase — `src/app/api/**` (301 route files), server actions (`src/actions/**`), NextAuth/JWT auth, Prisma data access, third‑party integrations (Authorize.Net, Twilio, Pusher, AWS S3/SES, SendGrid, Groq, Infobip, Mailgun), configuration and dependencies.
**Method:** Seven parallel domain reviews (auth, injection, secrets, access‑control/IDOR, XSS/SSRF/upload, payments/integrations, dependencies/hardening). Findings below were confirmed by reading source, not pattern‑matching alone. Load‑bearing claims about the auth gate were independently re‑verified against the code and the Next.js 16 documentation.

> ⚠️ **This document describes real, exploitable vulnerabilities and includes exploit sketches.** Treat it as confidential. Do not commit exploit payloads to public issues.

---

## 1. How authentication actually works (read this first)

Getting this right changes the severity of almost everything else, so it is stated up front.

- **The app has an active edge auth gate: `src/proxy.ts`.** In **Next.js 16 the `middleware.ts` file convention was renamed to `proxy.ts`** (official: _"Middleware replaced by proxy.ts"_ — nextjs.org/blog/next-16). So `src/proxy.ts`, which exports a `proxy()` function and a `config.matcher` covering all routes, **is** the middleware and **does run on every request**. Any earlier claim that "there is no middleware, nothing is protected" is **incorrect for Next 16** and should be disregarded.
- **What the gate enforces (`src/proxy.ts:97‑153`):** for a request to `/api/*` with **no** NextAuth session cookie and **no** valid bearer JWT, it returns a 401 body and the route handler is **never reached** — _unless_ the path is on an allowlist (`PUBLIC_API_ROUTES` exact match, or `PUBLIC_DYNAMIC_API_ROUTES` regex match). Bearer tokens are signature‑verified via `jwtVerifyToken` and checked for expiry.
- **What the gate does NOT do:** it never compares the caller's `companyId` (from their token/session) to the `companyId`/record‑id in the URL, query, or body. **Tenant authorization is left entirely to each handler** — and most handlers omit it.

This yields **two distinct classes of vulnerability**, and every finding below is tagged with which one applies:

| Tag               | Meaning                                                                                 | Who can exploit                                                     |
| ----------------- | --------------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| **[ANON]**        | Route is on the public allowlist (or handler runs before the gate matters)              | **Anyone on the internet**, no account                              |
| **[AUTHed‑IDOR]** | Route requires a valid token, but the handler trusts a client‑supplied `companyId`/`id` | **Any logged‑in user of any tenant** (a $1 trial account is enough) |

The public allowlist (`src/constants/public-route.ts`) is the anonymous attack surface. Verbatim, the sensitive non‑auth/non‑webhook entries are:

```
/api/task            /api/sales-agent        /api/upload
/api/lead-generate   /api/ai-train-company   /api/invoice/track-view
/api/communication/client-hub/send-twilio-message
/api/virtual-shop/*  (buy-gift-card, issued-gift-card, check-balance, reload,
                      service-booking, gift-card-payment, client-lookup/by-phone,
                      emergency-requests, shop-services, appointment-slots, ...)
PUBLIC_DYNAMIC: /api/admin/client/:id/sales-agent, /api/infobip/sms/receive/:companyIds,
                /api/twilio/sms-receive/:companyIds, /api/twilio/call-recording/:recordingSid,
                /api/virtual-shop/configure/subdomain/:slug
```

Note the allowlist uses **exact** matching for the static list, so `/api/task` is public but `/api/task/123` is **not** (it requires a token → [AUTHed‑IDOR]).

---

## 2. Severity summary

| #     | Severity    | Finding                                                                   | Class              |
| ----- | ----------- | ------------------------------------------------------------------------- | ------------------ |
| C1    | 🔴 Critical | Free gift‑card issuance — payment optional on public endpoint             | ANON               |
| C2    | 🔴 Critical | Unauthenticated S3 upload **and arbitrary object delete**                 | ANON               |
| C3    | 🔴 Critical | Multi‑tenant IDOR across ~40 mutating server actions                      | AUTHed‑IDOR        |
| C4    | 🔴 Critical | Appointment create/update/delete cross‑tenant                             | AUTHed‑IDOR        |
| C5    | 🔴 Critical | Task / Client‑PII / Notifications IDOR (read+write+delete)                | AUTHed‑IDOR        |
| C6    | 🔴 Critical | AI‑agent config hijack + KB exfiltration (`ai-train`)                     | AUTHed‑IDOR / ANON |
| H1    | 🟠 High     | JWT verification fails **open** on empty `ACCESS_SECRET`                  | ANON (conditional) |
| H2    | 🟠 High     | 2FA fully bypassable via the mobile REST login                            | ANON               |
| H3    | 🟠 High     | Plaintext passwords + auth tokens logged to server console                | Insider/log access |
| H4    | 🟠 High     | Pusher public channels — cross‑tenant realtime eavesdropping              | AUTHed / ANON      |
| H5    | 🟠 High     | Live third‑party credentials in working‑tree `.env`; rotation needed      | Filesystem/backup  |
| H6    | 🟠 High     | Stored XSS + open redirect in short‑link redirect page                    | ANON (sink)        |
| H7    | 🟠 High     | Gift‑card email HTML injection → phishing to arbitrary victims            | ANON               |
| H8    | 🟠 High     | Blind SSRF via unauthenticated Infobip/Mailgun webhooks                   | ANON               |
| H9    | 🟠 High     | Path‑traversal file **write** from multipart `file.name`                  | AUTHed/ANON        |
| H10   | 🟠 High     | Client attachment IDOR (auth present, ownership never checked)            | AUTHed‑IDOR        |
| H11   | 🟠 High     | Feature‑permission checks are UI‑only, never enforced on writes           | AUTHed             |
| H12   | 🟠 High     | Next.js 16.2.6 behind security patches (SSRF CVE‑2026‑64649 et al.)       | ANON               |
| M1    | 🟡 Medium   | No security headers / no CSP anywhere                                     | Defense‑in‑depth   |
| M2    | 🟡 Medium   | Systemic missing input validation (~85% of body routes)                   | Varies             |
| M3    | 🟡 Medium   | Stored XSS in public booking page (`service.description`)                 | ANON               |
| M4    | 🟡 Medium   | Unauthenticated Twilio SMS send (`send-twilio-message`)                   | ANON               |
| M5    | 🟡 Medium   | Unauthenticated file **read**/download + traversal                        | AUTHed/ANON        |
| M6    | 🟡 Medium   | `apply-gift-card` trusts client‑supplied `cashPaid`                       | AUTHed             |
| M7    | 🟡 Medium   | Merchant Authorize.Net transaction key logged                             | Log access         |
| M8    | 🟡 Medium   | User enumeration + role disclosure (`auth/user/[email]`, forgot‑password) | ANON               |
| M9    | 🟡 Medium   | In‑memory rate limiter ineffective across multiple instances              | ANON               |
| M10   | 🟡 Medium   | `CORS: *` on `/api/lead-generate` and `/api/proxy-image`                  | ANON               |
| M11   | 🟡 Medium   | Guessable discount codes via `Math.random`                                | ANON               |
| M12   | 🟡 Medium   | `demo-error` debug endpoint shippable to prod                             | AUTHed             |
| M13   | 🟡 Medium   | Proxy 401s return HTTP **200** (body‑only status)                         | Correctness/mobile |
| L1‑L6 | ⚪ Low      | See §6                                                                    | —                  |

**Positive findings that were verified as genuinely well‑built are in §7 — read them; they matter for prioritisation.**

---

## 3. Critical findings

### C1 — [ANON] Free gift‑card issuance: payment is optional on a public endpoint

**File:** `src/app/api/virtual-shop/buy-gift-card/route.ts` (public via `public-route.ts:45`)

`paymentId` is `optional()` in the schema (`:13`). The entire payment‑verification block — the DB lookup (`:147`), the `isPaid` check (`:162‑166`), and the `paidAmount + 0.01 < finalAmount` check (`:173‑174`) — is nested inside `if (paymentId) { … }` (`:100`). Execution then falls through to `issueGiftCardFromContext(...)` (`:182`) **unconditionally**, which mints a real, redeemable `AWX‑XXXX‑XXXX` gift card and emails/SMSes it.

**Exploit:** anonymous `POST /api/virtual-shop/buy-gift-card` with a valid `shopId` + active `templateId`, an `amount`, and **no `paymentId`** → a gift card for that amount is issued and delivered, for $0. Redeemable against bookings/reloads = unlimited free store credit.

**Fix:** make payment mandatory — require `paymentId`, always run the `isPaid` + `paidAmount >= finalAmount` checks, and refuse issuance unless a gateway‑confirmed `Payment` is linked. Preferably delete this legacy "mock checkout" route; the real, safe flow is `gift-card-payment/initiate` → gateway → signature‑verified webhook → `settleGiftCardPurchasePayment` (which is correctly guarded — see §7).

### C2 — [ANON] Unauthenticated S3 upload **and arbitrary object delete**

**Files:** `src/app/api/upload/route.ts` (`POST:55`, `DELETE:108`; public via `public-route.ts`), `src/actions/s3/signedURL.ts:45‑49` (auth check commented out), `src/actions/s3/deleteObject.ts`

`POST` goes straight to `formData()` → `getSignedURL(...)` with no session/token check (the Swagger `bearerAuth` annotation is cosmetic). `DELETE` reads a client‑supplied `filePath` and calls `deleteObject(filePath)` with no ownership check. The `getServerSession` guard inside `getSignedURL` is commented out.

**Exploit:** anyone can (a) obtain signed URLs and push arbitrary files to the bucket (storage/cost abuse, hosting malicious/phishing content on a trusted domain), and (b) `DELETE /api/upload` with any object's basename to **destroy stored files**. Combined with C‑class content‑type issues (H‑upload), uploaded `text/html` can become stored XSS.

**Fix:** require `getAuthPrincipal` in both handlers; re‑enable the check in `getSignedURL`; namespace object keys per company; validate that a delete target belongs to the caller's company; enforce a server‑side MIME/extension allowlist and force a safe `Content-Type`.

### C3 — [AUTHed‑IDOR] Multi‑tenant IDOR across ~40 mutating server actions

**Files (verified):** `src/actions/client/delete.ts:7` (`db.client.delete({where:{id}})`), `src/actions/payment/updatePayment.ts` (find+update payment by id — **cross‑tenant financial tampering**), `src/actions/estimate/invoice/delete.ts` (delete invoice by id), `src/actions/estimate/material/updateMeterial.ts:46`. **Same pattern, not each individually opened (~36 more):** `client/edit.ts`, `client/saveNotes.ts`, `fleet/delete.ts|edit.ts`, `inventory/delete.ts`, `estimate/labor/deleteLabor.ts`, `estimate/service/deleteService.ts`, `vendor/deleteVendor.ts|editVendor.ts`, `source/deleteSource.ts`, `tag/deleteTag.ts`, `estimate-template/delete.ts`, `employee/delete.ts|update.ts`, etc.

Next.js server actions are invocable as POST endpoints by any authenticated user with arbitrary arguments. These actions `update`/`delete` a row by a caller‑supplied `id` with **no `companyId` scoping** anywhere in the file.

**Exploit:** a logged‑in user of company A calls the action with company B's row id → reads/edits/deletes B's clients, payments, invoices, materials, employees, inventory, etc.

**Fix:** every mutating action must resolve `companyId` from `getEssentials()`/`getCompanyId()` and constrain with it — `updateMany/deleteMany({where:{ id, companyId }})` and assert `count === 1`. This is the single highest‑volume remediation.

### C4 — [AUTHed‑IDOR] Appointment create/update/delete cross‑tenant

**Files:** `src/app/api/appointment/company/[companyId]/route.ts` (`POST:615`), `.../[companyId]/[id]/route.ts` (`PATCH:115`, `DELETE:219`), `.../[id]/date/route.ts` (`PUT:96`), `.../template/[templateId]/route.ts`, and the "auth‑optional" `src/app/api/appointment/route.ts:151`.

The `GET` handler was correctly hardened (`getAuthPrincipal` + `companyId === principal.companyId`, `:429‑441`) — **but the write handlers were not**. They take `companyId` from the URL path and "validate" ownership with `findFirst({where:{ id, companyId }})` where `companyId` is attacker‑supplied, so the check is circular. `appointment/route.ts:151` reads auth _optionally_ (`(await getAuthPrincipal(req))?.companyId ?? null`) then trusts `body.forceCompanyId` when null.

**Exploit:** any token holder sends `PATCH/DELETE /api/appointment/company/<B>/<apptId>` to rewrite/delete company B's appointments, or `POST` to inject appointments (triggering reminder emails/SMS to B's customers).

**Fix:** call `getAuthPrincipal` in every handler and reject when `Number(params.companyId) !== principal.companyId`; derive `forceCompanyId` from the principal. Remove the "auth‑optional" pattern.

### C5 — [AUTHed‑IDOR] Task / Client‑PII / Notifications IDOR

**Files:** `src/app/api/task/[id]/route.ts` (GET/PATCH/`DELETE:201` by numeric id, no scope), `src/app/api/client/client-details/[id]/route.ts` (GET/PATCH/DELETE of full customer PII by id), `src/app/api/notifications/company/[companyId]/route.ts` & `notifications/user/[userId]/route.ts` (list by URL id), `src/app/api/dashboard/clock-in/route.ts` (`POST:71`/`GET:213` clock any `userId` — payroll/attendance write IDOR).

None derive the tenant/user from the principal; all key off a client‑supplied id.

**Exploit:** any logged‑in user enumerates ids to read/edit/delete any tenant's tasks, customer records (name, email, phone, address, vehicles, conversation history), notification feeds, and to falsify attendance.

**Fix:** derive `companyId`/`userId` from session/JWT; use `findFirst`/`updateMany`/`deleteMany` with `where:{ id, companyId }`; 404 on mismatch.

### C6 — [AUTHed‑IDOR / partly ANON] AI‑agent config hijack + knowledge‑base exfiltration

**Files:** `src/app/api/ai-train/utils.ts` (`validateCompanyId` reads `companyId` from the query string and trusts it), `ai-train/personality/route.ts` (POST reads `body.companyId`, upserts `aiPersonality.systemPrompt`), plus `faq`, `service-playbooks`, `conversation-examples`, `knowledge-base/documents(/[id])`, `sms-delay`, and **`/api/ai-train-company` which is on the ANON allowlist**.

**Exploit:** `POST /api/ai-train/personality` with `{"companyId": <B>, "systemPrompt": "...attacker instructions..."}` overwrites company B's customer‑facing AI sales‑agent persona (prompt‑injection at the source). `GET ?companyId=<B>` exfiltrates B's playbooks/FAQ/KB; `documents/[id]` edits/deletes any company's KB docs by id.

**Fix:** replace the query read in `validateCompanyId` with a principal‑derived `companyId`; scope all `ai-train` reads/writes (and `documents/[id]`) to it; re‑evaluate whether `/api/ai-train-company` belongs on the public allowlist at all.

---

## 4. High findings

### H1 — [ANON, conditional] JWT verification fails **open** on empty secret

**Files:** `src/lib/jwtVerify.ts:4` (`… .encode(process.env.ACCESS_SECRET || "")`), `src/authOptions.ts:73,147` (`jwt.verify(token, process.env.ACCESS_SECRET || "")`).

`jwtVerifyToken` is the primitive the **proxy gate itself** uses to validate bearer tokens. If `ACCESS_SECRET` is ever unset/empty at runtime, tokens are verified against an empty HMAC key — an attacker forges a token for any `companyId`/`userId`, clears the gate, and every [AUTHed‑IDOR] finding becomes anonymous. Exploitability depends on the deployed env (UNVERIFIED here — cannot read prod secrets), but the fail‑open default is the defect.

**Fix:** read secrets once at startup and throw if missing (`requireEnv("ACCESS_SECRET")`); never `|| ""`. Pass explicit `{ algorithms: ["HS256"] }`. `src/app/api/auth/refresh-token/route.ts:41` already fails closed — mirror it.

### H2 — [ANON] 2FA fully bypassable via mobile REST login

**Files:** `src/app/api/auth/login/route.ts:100` → `src/actions/auth/login.ts`. The 2FA gate lives only in `src/authOptions.ts:114‑128` (the web NextAuth `authorize`). The REST `login()` action checks only email + bcrypt password and issues access/refresh tokens — it never checks `twoFactorEnabled`.

**Exploit:** a user (or attacker with credentials) authenticates through `POST /api/auth/login` with just email+password, defeating 2FA for the mobile/REST path entirely.

**Fix:** move 2FA enforcement into the shared `login()` service so web and REST both honour it.

### H3 — [Insider/log] Plaintext passwords and auth tokens logged

**Files:** `src/authOptions.ts:111` (`console.log("credentials", credentials)` → **plaintext password every login**); `src/app/api/infobip/voice/token/route.ts:101,116,122` (WebRTC token + decoded JWT payload); `src/actions/payment/authorizeNetPayment.ts:430` (hosted‑payment token). Also `auth/login/route.ts:110` logs raw auth errors.

**Impact:** anyone with Railway/stdout/log‑aggregator access harvests real user passwords (→ credential stuffing) and replayable tokens.

**Fix:** delete the credential log; strip token/`tokenData`/decoded‑payload logs; log only booleans/ids.

### H4 — [AUTHed/ANON] Pusher public channels — cross‑tenant realtime eavesdropping

**Files:** `src/lib/pusher/client.ts:3‑8` (no `authEndpoint`/`channelAuthorization`), `src/app/api/pusher/route.ts` (`user-${userId}`, `group-${to}`), `src/app/api/pusher/collaboration/route.ts:217‑225` (`company-${companyId}`, `company-track-${companyId}`). No `/api/pusher/auth` endpoint exists; all channels are plain public channels.

**Exploit:** any browser holding the public key can `subscribe("company-<victim>")` / `subscribe("user-<victim>")` and receive other tenants' live chat, collaboration messages, attachments, and metadata.

**Fix:** rename to `private-…`/`presence-…`, add an authorizing endpoint (`pusherServer.authorizeChannel`) that checks the session user's `companyId`/membership, and configure `channelAuthorization` on the client.

### H5 — [Filesystem/backup] Live third‑party credentials in working‑tree `.env`; rotate

`.env` is **not** committed (verified: absent from git history; `.env.example` is placeholders only; no `NEXT_PUBLIC_*` secret leaks — all good). **But** the on‑disk `.env` holds real, largely long‑lived credentials: `AUTH_SECRET`/`NEXTAUTH_SECRET` (reused), a **permanent `AKIA…` AWS IAM key** + secret, `STRIPE_SECRET_KEY`/`STRIPE_WEBHOOK_SECRET`, `SENDGRID_KEY`, `GROQ_API_KEY`, `GOOGLE_GENERATIVE_AI_API_KEY`, `PUSHER_SECRET`, `GOOGLE_/GMAIL_CLIENT_SECRET`, `EMAIL_PASS`/`GMAIL_PASS`, `TWILIO_API_KEY_*`, `MAILGUN_API_KEY`, `FACEBOOK_APP_SECRET`, `INFOBIP_API_KEY`, `AUTHVIA_*`, `PLATFORM_AUTHNET_TRANSACTION_KEY`, `CAR_API_*`, `ACCESS_SECRET`/`REFRESH_SECRET`.

**Fix:** (1) rotate every credential (they have now been exposed to the working tree/audit context); (2) move to a managed secret store (Railway/SSM/Secrets Manager); (3) replace the permanent `AKIA` key with a scoped role / short‑lived STS; (4) stop reusing one value for `AUTH_SECRET`+`NEXTAUTH_SECRET` and `ACCESS`+`REFRESH`. Also broaden `.gitignore` to `.env*` (currently `.env.development`/`.env.staging`/`.env.test` without `.local` are not ignored) with a `!.env.example` negation. Optional: run a `git log --all -p -S 'AKIA'` history scan for any historically committed secret.

### H6 — [ANON sink] Stored XSS + open redirect in short‑link redirect page

**File:** `src/app/s/[shortCode]/page.tsx:22‑26,44‑49` — `result.originalUrl` is interpolated **raw** into both a `<meta http-equiv="refresh">` and a `<script>window.location.href = "${result.originalUrl}"</script>`. Any `"`/`</script>`/newline breaks out and executes JS on the app origin; the value also drives an unvalidated redirect (incl. `javascript:`). `src/lib/shortener.ts` validates only `new URL(...)` (does not reject `javascript:` or strip quotes). Today's callers build `originalUrl` server‑side, but `createShortLink` is an exported `"use server"` action with no allow‑list, so reachability is UNVERIFIED — the sink is unconditionally unsafe.

**Fix:** use server `redirect()` after validating the scheme against an `http(s)` allow‑list; never interpolate into a script body (`JSON.stringify` at minimum); reject non‑http(s) schemes in `createShortLink`.

### H7 — [ANON] Gift‑card email HTML injection → phishing to arbitrary victims

**Files:** `src/lib/emails-template/gift-card.ts` (interpolates `recipientName`, `message`, `greeting`, `shopName` raw into HTML), caller `src/services/giftCardPurchaseService.ts:415‑419,625‑630`, entry `src/app/api/virtual-shop/buy-gift-card/route.ts` (public). Schema sets `recipientName: z.string()` (no max/sanitize), `message: z.string().max(250)` (length only).

**Exploit:** attacker calls the public endpoint with `recipientName`/`message` containing `<a href="https://phish">…</a>` or tracking `<img>`; the email is delivered to an **attacker‑supplied `recipientEmail`** from the shop's trusted sender → phishing/content‑spoofing into third parties. (Clients strip `<script>`, so HTML/link injection, not JS — hence High.)

**Fix:** HTML‑escape every interpolated field; cap `recipientName`; strip tags from `message`.

### H8 — [ANON] Blind SSRF via unauthenticated Infobip/Mailgun webhooks

**Files:** `src/app/api/infobip/sms/receive/route.ts` (`fetchInfobipMedia(url)` `:415‑417`, `url` from body `:190`), `infobip/email/receive/route.ts:373`, `mailgun/receive/route.ts:156`. No signature/HMAC verification on these receivers.

**Exploit:** forge a webhook with `media[].url = http://169.254.169.254/latest/meta-data/…` or an internal host → server fetches it and pipes the response into the upload pipeline (blind SSRF + fake‑inbound‑message spoofing).

**Fix:** verify provider signatures before processing; allow‑list provider media hosts; block private/link‑local/loopback ranges (resolve‑then‑check) before fetching.

### H9 — [AUTHed/ANON] Path‑traversal file **write** from multipart `file.name`

**Files:** `src/app/api/communication/client/route.ts:234`, `src/app/api/mailgun/send/route.ts:162`, `src/app/api/infobip/email/send/route.ts:222` — `path.join(uploadDir, file.name)` → `fs.createWriteStream`. `file.name` is not normalised, so `../../` escapes the upload dir.

**Fix:** `path.basename(file.name)` and reject names containing `/`, `\`, `..`; prefer a generated random name.

### H10 — [AUTHed‑IDOR] Client attachment access: auth present, ownership never checked

**File:** `src/app/api/client/client-details/[id]/files/route.ts` — GET _does_ `getAuthPrincipal` (401 without token) but then queries attachments purely by URL `clientId`; the resolved `jwtCompanyId` is fetched and **never used**.

**Exploit:** any authenticated user `GET …/<any clientId>/files?type=docs` → URLs of another tenant's customer email/SMS/Messenger/Instagram attachments.

**Fix:** assert `client.companyId === jwtCompanyId` (or add `companyId` to each attachment `where`) before returning.

### H11 — [AUTHed] Feature‑permission checks are UI‑only

`serverRouteGuard`/`hasRouteAccess`/`navListAuthorization` are invoked only in `layout.tsx`, dashboard boxes, and client hooks (`useCanAccessRoute`, `PrivateRoute.tsx`). Only ~7 of 292 action files reference permissions, mostly to _fetch_ not to _gate_. So the "feature‑permission" system hides UI but does not stop direct API/action calls. Combined with C3‑C6, a restricted user performs admin‑only writes.

**Fix:** enforce feature/role checks server‑side inside mutating actions/routes.

### H12 — [ANON] Next.js 16.2.6 behind security patches

`yarn.lock` resolves `next@16.2.6`. **CVE‑2026‑64649** (SSRF via Server Action forward/redirect) affects 16.0.0–16.2.10 → 16.2.6 is in range. The July‑2026 security release shipped further 16.2 patches (middleware/proxy bypass, DoS, SSRF, cache‑poisoning, XSS) not present in 16.2.6. (Not affected by CVE‑2025‑29927.)

**Fix:** upgrade to the latest 16.2.x (> 16.2.10; confirm exact fixed version at upgrade time) and wire `yarn npm audit` into CI.

---

## 5. Medium findings

- **M1 — No security headers / CSP.** `next.config.mjs` `headers()` is commented out; repo‑wide grep for CSP/HSTS/X‑Frame‑Options/X‑Content‑Type‑Options/Referrer‑Policy = 0 hits. A CSP would blunt H6/H7/C2/M3. Add a global `headers()` (start CSP report‑only; note inline `<script>`/`<style>` in `s/[shortCode]/page.tsx` and `chart.tsx` need nonces; `frame-ancestors`/`X-Frame-Options` must be scoped, not blanket‑DENY, because of subdomain iframe embedding).
- **M2 — Systemic missing input validation.** 178 routes read a request body; only ~25 reference any schema/zod at the route layer. Auth endpoints (`register`, `login`, `forgot-password`) parse raw bodies. Some delegate to actions that validate internally (partly UNVERIFIED), so it's inconsistent adoption, not total absence. Standardise `schema.parse(await req.json())` at the top of every body route, reusing `src/validations/schemas`.
- **M3 — [ANON] Stored XSS on public booking page.** `src/app/subdomain/[subdomain]/components/booking/ServiceCard.tsx:203` renders `service.description` (admin/Quill rich text) via `dangerouslySetInnerHTML`, no sanitizer → a shop user injects script that runs for every public visitor. Also review `src/components/TermsAndPolicyModal.tsx:89` (UNVERIFIED whether tenant‑editable). Sanitize with `isomorphic-dompurify`.
- **M4 — [ANON] Unauthenticated Twilio SMS send.** `/api/communication/client-hub/send-twilio-message` is on the public allowlist → anonymous SMS sending (cost/fraud/spoofing) unless the handler enforces its own token. Verify and gate.
- **M5 — File read/download + traversal.** `src/app/api/download/[filename]/route.ts:39` and `images/[filename]/route.ts:38` — `path.join(uploadDir, params.filename)` → `fs.readFileSync`, no `basename`/`..` guard, no auth/tenant scope. `basename` + confine to `uploadDir` + auth + owning‑companyId check.
- **M6 — `apply-gift-card` trusts client `cashPaid`.** `src/app/api/virtual-shop/service-booking/[id]/apply-gift-card/route.ts:27‑38` → `confirmShopBooking` records `deposit: incomingCash, depositMethod:"Online"` with no gateway verification (`confirmShopBooking.ts:311,74‑78`). Reachability requires a token (nested path not on allowlist) so Medium, but the trust model is wrong: derive the paid amount from the signature‑verified webhook `authAmount`, never the client.
- **M7 — Merchant credential logged.** `src/actions/payment/authorizeNetPayment.ts:381‑384` logs the full request incl. `merchantAuthentication.transactionKey` (long‑lived per‑company API credential). Redact before logging.
- **M8 — [ANON] User enumeration + role disclosure.** `src/app/api/auth/user/[email]/route.ts:24` returns `{email, role, employeeType}` for any email, no auth/limit; `forgot-password` returns 404 for unknown emails (distinguishes accounts); `register.ts:79` throws "User already exist!". Return uniform responses; require auth on `user/[email]`.
- **M9 — Rate limiter not multi‑instance safe.** `src/lib/rateLimit.ts` uses a per‑process `Map`; with `output:"standalone"` on >1 replica, limits are per‑instance and reset on deploy. Also `extractClientIp` trusts `X‑Forwarded‑For` via `TRUSTED_PROXY_COUNT` (default 1) — verify it matches the real proxy hop count or XFF spoofing rotates the key. Use a shared store (Redis/Upstash) if scaled.
- **M10 — [ANON] `CORS: *`.** `src/app/api/lead-generate/route.ts:18‑20` and `src/app/api/proxy-image/route.ts:40` set `Access-Control-Allow-Origin: *`. No `Allow-Credentials:true`+`*` combo exists (good), but any site can POST to lead‑ingest / drive the image proxy (also an SSRF surface). Use an env‑driven origin allowlist.
- **M11 — [ANON] Guessable discount codes.** `src/app/(dashboard)/dashboard/payments/components/CodeDiscount.tsx:73` builds codes from `Math.random()` → coupon guessing. Use `crypto.getRandomValues`/`nanoid`.
- **M12 — Debug endpoint.** `src/app/api/demo-error/route.ts` intentionally throws and returns the error object; reachable by any authenticated user and triggers Telegram alert noise. Delete or gate to non‑prod.
- **M13 — Proxy 401 → HTTP 200.** `src/proxy.ts` (and `proxy.ts` 401 branches) return `NextResponse.json({status:401,…})` **without** a `{status:401}` init, so the HTTP status is 200 with a `status:401` body. Auth is still enforced (handler not reached), but clients/mobile keying on HTTP status treat unauthorized as success. Pass `{status:401}`.

---

## 6. Low findings

- **L1 — Registration gated by a single shared static `ACCESS_CODE`** (`src/actions/auth/register.ts:68`) — anyone who learns it can create companies/admins. Move to single‑use per‑invite tokens with expiry.
- **L2 — Login user‑enumeration timing** (`src/actions/auth/login.ts:21`) returns before bcrypt for unknown users → timing oracle. Compare against a dummy hash.
- **L3 — `getUserFromSession(userId)`** (`src/lib/getCurrentUser.ts:6‑26`) returns the user with no session check when passed an id; safe today (sole caller passes none) but a latent bypass — never accept a caller‑supplied id as identity.
- **L4 — Predictable payment references** via `Math.random().toString(36)` in `gift-card-payment/initiate/route.ts:22` and `reload-payment/initiate/route.ts:18` — use `nanoid`.
- **L5 — Unauthenticated gift‑card balance enumeration** (`issued-gift-card/check-balance/route.ts`) — public, no rate limit; add lockout on repeated misses.
- **L6 — Deprecated deps** — `aws-sdk` v2 (maintenance), `moment`/`moment-timezone` (deprecated; `dayjs`+`date-fns` already present), `next-auth` v4 (legacy), transitive `axios@1.8.3` (CVE‑2025‑58754 DoS; force ≥1.12.0). `LIMIT/OFFSET` interpolation in `inventoryWirehouse/products/route.ts:88` (integers today, not injectable — migrate to bind params). Duplicate `src/app/auth.config.ts` uses a divergent `process.env.SECRET` — delete.

---

## 7. What is done well (verified — do not "fix" these)

- **Authorize.Net webhook authenticity is properly verified** — HMAC‑SHA512 over the raw body with the per‑company signature key, `timingSafeEqual`, rejects missing‑key/bad‑signature with 401, no state mutated before verification (`src/app/api/authorize-net/webhook/route.ts:12‑33,164‑174`).
- **Payment amounts are recomputed server‑side** from gateway‑authenticated `authAmount`; `settleGiftCardPurchasePayment` refuses to issue when `paidAmount + 0.01 < finalAmount`. Client‑supplied amounts cannot reduce what you pay **through the real gateway paths** (the bypass is C1's _optional_ path, not these).
- **Idempotency / double‑spend guards are solid** — unique `webhookEvent.eventId` + `PROCESSED` check + `transactionId` guard; gift‑card redemption/reload use unique `referenceId` and atomic conditional `updateMany` with `currentBalance >= amount`.
- **No PCI data stored or logged** — card entry via Authorize.Net Accept Hosted + Stripe; no PAN/CVV reaches this server.
- **Password reset / OTP flow is genuinely hardened** — CSPRNG `generateOTP` (`crypto.randomInt`), bcrypt‑hashed OTP, 15‑min expiry, one‑time consume, constant‑time compare, random‑UUID reset token, and **real IP+email rate limiting** on login/forgot‑password/verify‑otp/reset.
- **The estimate/invoice IDOR patch is real and applied** — all 17 estimate/invoice routes 401 on missing bearer, 403 on `companyId` mismatch, and scope queries to the JWT `companyId` (`docs/SECURITY_ESTIMATE_ROUTES_PATCH.md`).
- **No SQL injection** (all raw queries are `Prisma.sql`/`$N` parameterised) and **no command injection** (the lone `eval` is a static `require` shim).
- **Secrets hygiene in‑repo is good** — `.env` not committed, `.env.example` is placeholders, no hardcoded secrets in source, no secret behind a `NEXT_PUBLIC_` prefix.
- **`getAuthPrincipal`/`getEssentials`/`getCompanyId` are the correct primitives** and are used correctly in a few places (appointment GET, estimate routes) — the remediation is to apply them consistently, not to invent new machinery.

---

## 8. Prioritised remediation roadmap

**Phase 0 — do this week (anonymous, trivial, live):**

1. C1 — remove/guard `buy-gift-card` (free money).
2. C2 — auth on `/api/upload` + re‑enable `getSignedURL` auth; scope deletes.
3. H1 — fail closed on missing `ACCESS_SECRET`/`NEXTAUTH_SECRET` (protects the whole gate).
4. H3 — delete the password/token `console.log`s.
5. H5 — rotate all `.env` credentials; swap the permanent AWS key.
6. Review the public allowlist: does `/api/task`, `/api/sales-agent`, `/api/ai-train-company`, `/api/communication/client-hub/send-twilio-message`, `/api/admin/client/:id/sales-agent` really need to be anonymous? Remove what doesn't.

**Phase 1 — tenant authorization (the structural fix):** 7. C3 — add `companyId` scoping to the ~40 mutating server actions (highest volume). 8. C4/C5/C6/H10 — add `getAuthPrincipal` + `companyId` scope to appointment/task/client/notifications/ai‑train/client‑files routes. 9. H2 — enforce 2FA in the shared login path. 10. H11 — enforce feature‑permission server‑side on writes. 11. Consider extending `src/proxy.ts` to attach the verified principal and, where the URL carries a `companyId`, reject mismatches centrally as defence‑in‑depth (handlers must still scope).

**Phase 2 — injection/XSS/SSRF/hardening:** 12. H4 (Pusher private channels), H6/H7/M3 (XSS + sanitizer + escaping), H8 (webhook signatures + SSRF allow‑list), H9/M5 (path traversal read+write). 13. M1 (security headers/CSP), M2 (input validation standardisation), H12 (Next.js upgrade + `yarn audit` in CI).

**Phase 3 — cleanup:** M4/M6/M7/M8/M9/M10/M11/M12/M13 and all Low items.

---

## 9. Methodology caveats (what this audit did **not** fully cover)

- **Prod env values are unverified** — H1's exploitability and whether keys are prod vs sandbox depend on the deployment, which is not in the repo.
- **`git` history was not deep‑scanned** for previously‑committed secrets — run a trufflehog/`git log -S` pass for certainty.
- **`npm/yarn audit` was not run live** (offline) — advisories beyond spot‑checked packages are unverified; wire it into CI.
- **The CSV/bulk‑lead parser lives in a separate backend** (`/bulk-lead-upload`) — its injection/`companyId`‑trust posture is out of scope here; the client sends `companyId` in FormData, so verify that service doesn't trust it.
- **~36 of the C3 server actions share the verified pattern but were not each opened individually** — they are flagged as such; confirm during remediation.
- **Call‑feature / Twilio files were intentionally not modified or deep‑audited** per repo rules — issues there were only flagged.
- **Route auth classification** was cross‑checked against `proxy.ts` + the allowlists, but a handful of the ~177 "no in‑handler auth marker" routes may guard via an unusual pattern; the systemic findings are confirmed by direct reads of 20+ diverse handlers.
