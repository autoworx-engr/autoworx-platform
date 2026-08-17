# Platform Billing: Authorize.net → Stripe Migration Plan

**Scope:** the _platform billing_ system only — AutoWorx charging tenant companies for SaaS plans.
The **tenant-facing gateway** (shops charging their own customers via their own Authorize.net/Stripe
accounts under `dashboard/settings/payments`, `src/actions/payment/`, `src/workers/authorize-net-payment.worker.ts`)
is **out of scope and must not be touched**.

**Branch:** `@sundim/awxStripe` · **Status:** plan approved-pending · **Author:** Claude + Sunzim · 2026-08-16

---

## 1. Why this is a big win (not just a swap)

The current Authorize.net implementation has real gaps that Stripe Billing eliminates for free:

| Today (Authorize.net CIM + ARB)                                                                                                                       | After (Stripe Billing)                                                                                                                                           |
| ----------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Cancel-and-recreate on plan change, card re-entered every time, **no proration** — user pays full new period on top of the old one                    | `subscriptions.update` with `proration_behavior` — instant, fair, no card re-entry                                                                               |
| Failed charge → `PAST_DUE` forever; dunning email is a `TODO`; `UNPAID` never set; no retries                                                         | **Smart Retries** (8 AI-timed retries / 2 weeks), built-in dunning emails, auto-escalation to `unpaid`/`canceled` — entitlement shutoff finally works end-to-end |
| ~800 lines of CIM plumbing: stale-profile self-healing, E00040 propagation retry loops, 10-profile cap recovery, first-charge/ARB double-charge dance | Deleted. Stripe Checkout owns card capture; subscription's first invoice is atomic                                                                               |
| Accept.js form we maintain (PCI SAQ A-EP)                                                                                                             | Stripe-hosted Checkout (PCI SAQ A)                                                                                                                               |
| Card update / invoice history UI we build ourselves                                                                                                   | Stripe **Customer Portal** out of the box                                                                                                                        |
| Immediate-only cancel (`cancelAtPeriodEnd` field exists but is dead)                                                                                  | `cancel_at_period_end=true`, reversible                                                                                                                          |
| Trial bug: `trialLengthDays` used as **months** (`subscribe.ts:258-270`)                                                                              | `trial_period_days` used as days, `trial_settings.end_behavior`                                                                                                  |

---

## 2. Current state (mapped 2026-08-16)

Full detail lives in the exploration report; the load-bearing facts:

- **Lib:** `src/lib/platform-billing/authorize-net.ts` (~800 lines, CIM + ARB). Entitlements in
  `entitlement-service.ts` key off `PlatformSubscriptionStatus`: `CANCELED`/`UNPAID` → all features off;
  `PAST_DUE`/`TRIALING` → full access. `src/proxy.ts` does **no** billing gating.
- **Flow:** super-admin flips `Company.enforcePlatformPlan` → owner subscribes at
  `/dashboard/settings/billing` → `CheckoutForm.tsx` (Accept.js nonce) → server action
  `src/actions/platform-billing/subscribe.ts` (445 lines: profile create/heal, ARB create with retry
  loop, immediate first charge, direct invoice write).
- **Recurring:** Authorize.net webhook → `src/app/api/platform/webhook/route.ts` → `WebhookEvent`
  (`gateway: "PLATFORM_AUTHORIZE_NET"`, plain `String` column) → pg-boss queue `platform-billing`
  (registered in `src/instrumentation-node.ts`) → `src/workers/platform-billing.worker.ts` →
  `PlatformInvoice`/`PlatformPayment`, roll period, set status. Hourly `reconciliation.worker.ts`
  re-drives stuck `PENDING` events.
- **Models** (`prisma/schema.prisma:2772+`): `PlatformPlan` (+ per-company custom plans via nullable
  `companyId`), `PlanFeature`, `PlatformBillingCustomer.authNetProfileId`,
  `PlatformSubscription.authNetSubscriptionId` (one per company, `@unique companyId`),
  `PlatformPaymentMethod.authNetPaymentProfileId`, `PlatformInvoice.authNetTransId`, `PlatformPayment`.
- **Env:** `PLATFORM_AUTHNET_{API_LOGIN_ID,TRANSACTION_KEY,ENVIRONMENT,SIGNATURE_KEY}` +
  `NEXT_PUBLIC_PLATFORM_AUTHNET_*`. Environment gating is deliberately per-subsystem
  (never `NODE_ENV` — Railway staging runs `NODE_ENV=production`).
- **Stripe today:** `stripe@^17.5.0` is already a dependency but used **only** by the tenant gateway
  (`STRIPE_SECRET_KEY` etc. = tenant creds). Zero Stripe code in platform billing.

## 3. Target architecture

```
Owner picks plan on /dashboard/settings/billing
        │
        ▼
Server action: create Stripe Checkout Session (mode=subscription,
  customer=<stripeCustomerId>, price=<plan price>, trial if eligible)
        │  redirect
        ▼
Stripe-hosted Checkout ──success──▶ /dashboard/settings/billing?checkout=success
        │
        ▼ (async, source of truth)
Stripe webhooks ─▶ /api/platform/stripe-webhook ─▶ WebhookEvent(gateway:"PLATFORM_STRIPE")
        ─▶ pg-boss "platform-billing" queue ─▶ platform-stripe worker
        ─▶ PlatformSubscription/PlatformInvoice/PlatformPayment sync
        ─▶ entitlements react automatically (existing code, unchanged)

Card update / invoice history / cancel ─▶ Stripe Customer Portal session
Plan change (upgrade/downgrade)        ─▶ in-app: subscriptions.update + proration
```

**Design decisions (recommended, with rationale):**

1. **Hosted Stripe Checkout** for card capture, not Elements/embedded. Deletes the most code,
   smallest PCI scope, and matches Stripe's primary documented path. Embedded Checkout is a drop-in
   later if the redirect feels off-brand.
2. **Customer Portal** for payment-method update, invoice history, and cancellation.
   **Plan switching stays in-app** (portal catalog can't express our per-company custom plans);
   in-app switch calls `subscriptions.update` with `proration_behavior: "create_prorations"`.
3. **Local DB stays the read model.** UI keeps reading `PlatformSubscription` etc.; webhooks keep it
   in sync. No UI reads Stripe directly except the Portal redirect. This preserves the existing
   entitlement service untouched.
4. **Reuse the pg-boss + `WebhookEvent` pipeline** (idempotency, retries, reconciliation, super-admin
   replay UI all come for free). New `gateway` value: `"PLATFORM_STRIPE"` (string column — no migration).
5. **Status mapping is 1:1.** Stripe's subscription statuses (`trialing/active/past_due/canceled/unpaid`)
   map exactly onto the existing `PlatformSubscriptionStatus` enum. Configure Stripe dunning to move
   exhausted retries to **`unpaid`** → the existing entitlement shutoff (`CANCELED`/`UNPAID` → all off)
   starts actually firing, fixing today's "PAST_DUE forever with full access" hole.
6. **Separate Stripe account context from the tenant gateway.** New env vars
   `PLATFORM_STRIPE_SECRET_KEY`, `PLATFORM_STRIPE_WEBHOOK_SECRET`, `PLATFORM_STRIPE_ENVIRONMENT`
   (mirroring the `PLATFORM_AUTHNET_*` convention; never key off `NODE_ENV`). Even if the same Stripe
   account is used for both, the separate names keep the blast radius clean. No `NEXT_PUBLIC_*` keys
   needed at all — hosted Checkout removes client-side Stripe JS entirely.
7. **API version:** current GA is `2026-07-29.dahlia` (stripe-node v22). The repo pins `stripe@^17.5.0`,
   shared with the tenant gateway. **Plan: upgrade to v22 in Phase 0 with a tenant-gateway regression
   pass** (tenant surface is small: `settings/payments/stripe.ts`, `workers/stripe-payment.worker.ts`,
   `api/stripe/*`, gift-card settlement). If regression risk blocks, fall back to instantiating the
   platform client from v17 with its pinned API version — works, but do the upgrade; running a new
   integration on a 5-major-old SDK is debt on day one.
8. **Cancellation becomes `cancel_at_period_end`** (reversible, period-end grace) instead of today's
   immediate revoke. The dead `cancelAtPeriodEnd` DB field finally earns its keep. Immediate cancel
   remains a super-admin action.
9. **Trial semantics fixed:** `trialLengthDays` passed as `subscription_data.trial_period_days` (days,
   as named). One-trial-per-customer stays enforced locally via `trialConsumedAt`. Seeded plans have
   0-day trials, so nothing user-visible changes; the latent month-vs-day bug dies.

## 4. Data model changes (additive first, destructive last)

```prisma
// PlatformPlan            + stripeProductId String? @unique
//                         + stripePriceId   String? @unique   // active price; repoint on price change
// PlatformBillingCustomer + stripeCustomerId String? @unique  // keep authNetProfileId until Phase 8
// PlatformSubscription    + stripeSubscriptionId String? @unique
// PlatformPaymentMethod   + stripePaymentMethodId String? @unique
// PlatformInvoice         + stripeInvoiceId String? @unique
// PlatformPayment         + stripePaymentIntentId String? @unique
```

Rules: prices are **immutable** in Stripe — a plan price change creates a new Price, archives the old,
repoints `stripePriceId` (use `lookup_key` + `transfer_lookup_key: true`; existing subscribers keep
the old price until explicitly migrated, mirroring current ARB behavior). Per-company custom plans
(`PlatformPlan.companyId != null`) get their own Price under one shared "AutoWorx Custom" Product.
One-time `PlatformSubscriptionItem`s (`isOneTime`) become one-off invoice items / extra Checkout
line items at subscribe time.

## 5. Phased implementation

Each phase merges independently; Stripe path stays dark behind config until Phase 7 cutover.
All new files respect the 200–250 line repo limit — the lib is split by concern, not one god-file.

**Phase 0 — Foundations (½ day)**
Stripe sandbox + live account setup; Products/Prices created by script (below); Dashboard config:
Smart Retries on, post-retry action = mark `unpaid`, dunning emails on, Customer Portal configured
(payment method + invoices + cancel; catalog switching off). Upgrade `stripe` → v22 + tenant
regression. Add `PLATFORM_STRIPE_*` to `.env.example` (note: `PLATFORM_AUTHNET_*` was never in there — add
a deprecation block for it too while we're in the file).

**Phase 1 — Schema (½ day)**
Additive Prisma migration from §4. No behavior change.

**Phase 2 — Catalog sync (1 day)**
`scripts/sync-platform-plans-to-stripe.ts`: idempotent upsert of Product+Price per `PlatformPlan`
(lookup_key = slug of plan name + interval), writes back `stripeProductId/stripePriceId`.
Hook the same sync into super-admin plan CRUD (`/api/awx/platform-plans*`) and custom-plan creation
(`/api/awx/custom-plan`) so new/edited plans stay mirrored.

**Phase 3 — Core lib (1–2 days)** — `src/lib/platform-billing/stripe/`

- `client.ts` — singleton, `PLATFORM_STRIPE_SECRET_KEY`, pinned `apiVersion`
- `checkout.ts` — create Checkout Session (`mode: subscription`, existing-or-new customer,
  trial per §3.9, `metadata: { companyId, planId }` on both session and subscription)
- `subscription.ts` — plan change (`subscriptions.update` + proration), `cancel_at_period_end`
  set/unset, immediate cancel, amount override for custom plans
- `portal.ts` — portal session creation
- Server actions in `src/actions/platform-billing/`: `checkout.ts`, `portal.ts`, `changePlan.ts`
  (guards: existing `requireBillingSession`/`assertCompanyAccess`)

**Phase 4 — Webhook + worker (1–2 days)**

- `src/app/api/platform/stripe-webhook/route.ts`: `await req.text()` (raw body!) →
  `stripe.webhooks.constructEvent` → **400 on bad signature** (Stripe retries on non-2xx; do _not_
  copy the Authorize.net always-200 pattern) → upsert `WebhookEvent` keyed on Stripe `event.id`,
  `gateway: "PLATFORM_STRIPE"` → enqueue on existing `platform-billing` queue → 200.
- `src/workers/platform-stripe.worker.ts` handling:
  `checkout.session.completed` (link IDs, upsert `PlatformSubscription`, stamp `trialConsumedAt`),
  `customer.subscription.updated` (status/period/plan/cancelAtPeriodEnd sync — the single workhorse),
  `customer.subscription.deleted` (→ `CANCELED`), `invoice.paid` (→ `PlatformInvoice`+`PlatformPayment`,
  roll period, → `ACTIVE`), `invoice.payment_failed` (→ `PAST_DUE` invoice record; status comes from
  subscription.updated), `customer.subscription.trial_will_end` (email hook, can stub),
  `payment_method.attached`/`detached` (sync `PlatformPaymentMethod`).
  Idempotency: dedupe on `stripeInvoiceId`/event id (same pattern as `authNetTransId` today).
- Route by gateway in the `instrumentation-node.ts` worker registration and in
  `reconciliation.worker.ts` re-enqueue switch (one new case each).

**Phase 5 — Frontend (1 day)**
`BillingPage.tsx`: plan select → checkout server action → `redirect(session.url)`; handle
`?checkout=success|cancelled` return (show "processing" until webhook lands — poll
`getCurrentSubscription`); add **Manage billing** (portal) button; plan change for active subs calls
`changePlan` directly (no card re-entry); cancel becomes period-end with "resumes access until {date}"
copy + undo. **Delete** `CheckoutForm.tsx` (Accept.js) and `BillingAddressFields.tsx` usage from the
Stripe path (files removed in Phase 8).

**Phase 6 — Super-admin (½ day)**
Custom-plan route: create custom Price + `subscriptions.update` to swap the item (replaces
`updatePlatformARBSubscriptionAmount`). Webhook-events browser: include `PLATFORM_STRIPE` in filters
and replay routing.

**Phase 7 — Migration & cutover (calendar-gated, see §6)**

**Phase 8 — Decommission**
Delete `src/lib/platform-billing/authorize-net.ts`, platform paths in `subscribe.ts` (rewrite to
Stripe-only), `src/app/api/platform/webhook/route.ts`, ARB branches in `platform-billing.worker.ts`,
Accept.js components; drop `authNet*` columns; remove `PLATFORM_AUTHNET_*` +
`NEXT_PUBLIC_PLATFORM_AUTHNET_*` env vars; deactivate the Authorize.net webhook + close ARB
subscriptions merchant-side. Grep-verify `authorizenet` remains only in tenant-gateway paths.

## 6. Migrating live subscribers

**First action: count them.** `SELECT status, COUNT(*) FROM platform_subscriptions GROUP BY status`
in prod. The strategy forks on the answer:

- **Small (≲ 25 active/trialing):** skip card-data migration. Dual-run window: existing ARB subs keep
  billing via the old worker (left running); each owner gets an in-app banner + email to "update
  billing" → Stripe Checkout with `billing_cycle_anchor`/`trial_end` aligned to their current
  `currentPeriodEnd` (so Stripe's first charge lands exactly when ARB's next one would); on
  `checkout.session.completed` we cancel their ARB. 30-day window, then super-admin follows up
  stragglers. Simple, no Stripe team involvement.
- **Large:** Stripe **Data Migrations team PAN import** from Authorize.net (official, PCI-compliant,
  zero downtime — request at support.stripe.com early; **it takes weeks, file the request in Phase 0**).
  Stripe returns a JSON mapping (CIM profile → Stripe customer/PaymentMethod); a script backfills
  `stripeCustomerId`/`stripePaymentMethodId`, then creates subscriptions with
  `proration_behavior: "none"` + `billing_cycle_anchor`/`trial_end` = existing `billingAnchor`,
  `backdate_start_date` for accurate records, then cancels each ARB. Old worker stays alive until the
  last ARB event drains, then Phase 8.

Either way: **new subscriptions go Stripe-only from Phase 7 day one** (flag:
`PLATFORM_BILLING_GATEWAY=stripe` env or simply ship the new UI); the ARB worker is kept only to
serve existing subs during the window. `getCurrentSubscription`/entitlements don't care which
gateway — status is gateway-agnostic. **No double-charge invariant:** a company must never have a
live ARB and a live Stripe sub simultaneously — enforced in the checkout action (refuse if
`authNetSubscriptionId != null` unless the flow is the migration flow that cancels ARB on completion).

## 7. Testing

- **Sandbox** (Stripe Sandboxes, not legacy test mode) + `stripe listen --forward-to localhost:3000/api/platform/stripe-webhook`.
- **Test clocks (Simulations)** for: renewal `invoice.paid` → period roll; failed renewal →
  `past_due` → Smart Retries exhausted → `unpaid` → entitlements go dark (the full dunning chain,
  which was never testable before); trial expiry; `cancel_at_period_end` firing.
- Test cards: `4242…` success, `4000 0000 0000 0341` attach-then-fail for dunning.
- Webhook chaos: duplicate event delivery (idempotency), out-of-order `subscription.updated` before
  `checkout.session.completed`, signature failure → 400 → Stripe retry.
- Regression: tenant gateway suite after the stripe v22 bump (Phase 0 gate).
- Migration rehearsal in sandbox with a cloned company row before touching prod.

## 8. Risks & gotchas

1. **Shared `stripe` npm dep with the tenant gateway** — the v22 upgrade is the riskiest single step;
   isolate it in its own PR with tenant regression before any platform work stacks on it.
2. **Raw-body webhook verification** — any middleware/body-parsing touching `/api/platform/stripe-webhook`
   breaks signatures. Verify `proxy.ts` passes it through untouched (it currently does no body work).
3. **Instrumentation runs in the Next.js process** — same pg-boss bootstrap; multi-instance Railway
   deploys already handle this for ARB, Stripe events inherit the behavior. No change, just awareness.
4. **`checkout.session.completed` vs first `invoice.paid` race** — worker must upsert, not
   insert-assume-order (both handlers idempotent + tolerant of arriving first).
5. **Per-company custom plans** drift risk: custom Price creation must be transactional-ish with the
   DB plan row (create Stripe first, DB second; reconcile script for orphans).
6. **`enforcePlatformPlan=false` legacy companies** are untouched by all of this — the billing layout
   gate stays as-is.
7. **Env gating:** `PLATFORM_STRIPE_SECRET_KEY` live key must exist **only** in prod Railway env;
   staging gets sandbox keys (same discipline the AUTHNET vars follow; remember staging has
   `NODE_ENV=production`).
8. **Portal config is dashboard state, not code** — document the exact portal/dunning settings in this
   file when configured, or manage via `billing_portal/configurations` API in the sync script so
   sandbox and live can't drift.

## 9. Open decisions (owner: Sunzim)

1. **Hosted redirect vs embedded Checkout** — plan assumes hosted (recommended); embedded is a
   contained swap in Phase 5 if product wants no redirect.
2. **Migration fork in §6** — needs the prod subscriber count.
3. **Same Stripe account as tenant gift-card/invoice flows or a dedicated one?** Dedicated account
   (or at least separate webhook endpoint + restricted key) recommended for clean books.
4. **Proration policy** — plan assumes `create_prorations` on upgrades, credit-at-period-end default
   for downgrades; confirm with finance.

## Estimated effort

Phases 0–6: **6–8 dev days** to a fully testable Stripe path in sandbox. Phase 7: calendar time
dominated by the migration fork (days if small-N, weeks if PAN import). Phase 8: 1 day.
