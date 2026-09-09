# Platform Billing (Stripe) — Test Plan

AutoWorx billing its tenant companies for SaaS plans. Tests are ordered by risk: T1–T3 touch
money and access revocation and have never been exercised. Stop and fix before continuing if one
fails.

Tenant payment (a shop charging its own customers) is a **different** system and is out of scope
here.

---

## Prerequisites

**1. Stripe CLI** — not currently installed. No sudo needed:

```bash
curl -fsSL https://github.com/stripe/stripe-cli/releases/latest/download/stripe_linux_x86_64.tar.gz \
  | tar xz -C ~/.local/bin stripe
stripe login
```

**2. Plan catalog synced to Stripe** — done, all 8 active plans have a `stripePriceId`. Re-run
after any plan price/interval edit:

```bash
npx tsx scripts/sync-platform-plans-to-stripe.ts
```

**3. Webhook forwarding.** In its own terminal:

```bash
stripe listen --forward-to localhost:3000/api/platform/stripe-webhook
```

Copy the `whsec_…` it prints into `PLATFORM_STRIPE_WEBHOOK_SECRET` in `.env`, then restart the dev
server. **A stale secret makes every webhook fail signature verification with a 400 and nothing
reaches the database.**

**4. Dev server** — `yarn dev`. Watch its console: the pg-boss workers log
`[pg-boss] workers registered` at boot. No workers means webhooks land in `WebhookEvent` and never
get processed.

### Verifying at every step

```bash
npx tsx scripts/platform-billing-state.ts            # plans, subs, invoices, recent events
npx tsx scripts/platform-billing-state.ts 24         # one company
npx tsx scripts/platform-billing-state.ts --candidates
```

The last line of that output is the one that matters: `0 platform billing event(s) not PROCESSED`.
Anything else means a handler threw — the event's `lastError` is printed above it.

---

## Test bench

**Company 24 "Autoworx"** — platform-plan mode, no subscription, and it has all four roles, so it
covers both the happy path and the permission tests.

| Role       | Login                    | Billing access |
| ---------- | ------------------------ | -------------- |
| Admin      | `Autoworxtest@gmail.com` | yes            |
| Manager    | `dummyjack@gmail.com`    | yes            |
| Sales      | `dummyjen@gmail.com`     | **no**         |
| Technician | `dummyjoe@gmail.com`     | **no**         |

Spares: company 54 (`tta@`/`sm@`/`sss@`/`st@`), company 59 (`billing@gmail.com`, Admin only).

Test cards: `4242 4242 4242 4242` succeeds. `4000 0000 0000 0341` attaches then fails on charge.
Any future expiry, any CVC.

---

## T1 — Dunning: card declines on renewal ⚠️ never tested

The highest-risk path in the system. A shop's card fails; Stripe retries; access must survive the
grace period and then die.

```bash
# Terminal 1: stripe listen (leave running)
npx tsx scripts/platform-billing-testclock.ts create 24 "Starter (Call + Text)"
npx tsx scripts/platform-billing-testclock.ts status
```

Expect: local status `ACTIVE`, one `PAID` invoice for $149.

```bash
npx tsx scripts/platform-billing-testclock.ts break      # default card now declines
npx tsx scripts/platform-billing-testclock.ts advance 32  # past period end
```

| Check                             | Expected                                                          |
| --------------------------------- | ----------------------------------------------------------------- |
| Stripe subscription               | `past_due`                                                        |
| Our `PlatformSubscription.status` | `PAST_DUE`                                                        |
| New `PlatformInvoice`             | `FAILED`, $149, no payment row                                    |
| Entitlements                      | **still granted** — `PAST_DUE` is a deliberate grace period       |
| Billing page                      | plan name with a red `PAST_DUE` badge, "Next Billing" date in red |

Then advance through Stripe's retry schedule (roughly 3, 5 and 7 days out):

```bash
npx tsx scripts/platform-billing-testclock.ts advance 8
```

| Check                   | Expected                                      |
| ----------------------- | --------------------------------------------- |
| Invoice `attempt_count` | increments; `next retry` moves forward        |
| Our invoice row         | stays `FAILED` — one row, not one per retry   |
| No duplicate rows       | the `stripeInvoiceId` unique constraint holds |

Now prove a recovered payment is recorded (the FAILED → PAID transition):

```bash
# Stripe Dashboard → the customer → default payment method → back to 4242
npx tsx scripts/platform-billing-testclock.ts advance 3
```

| Check           | Expected                                               |
| --------------- | ------------------------------------------------------ |
| Our invoice row | flips `FAILED` → `PAID`, one `SUCCESS` payment appears |
| Status          | back to `ACTIVE`                                       |

Finally, the terminal end. Set **Settings → Billing → Subscriptions → after all retries fail** to
_Cancel subscription_ in the Stripe Dashboard, `break` the card again and advance past the retry
window.

| Check        | Expected                                          |
| ------------ | ------------------------------------------------- |
| Our status   | `CANCELED` (or `UNPAID` if you chose that action) |
| Entitlements | **revoked** — SMS, calling, automations all off   |
| Billing page | "Choose a Plan"                                   |

**This is the one test that must not be skipped.** Failure here means either a shop keeps full
access without paying, or a paying shop loses access mid-day.

---

## T2 — Renewal on a good card

```bash
npx tsx scripts/platform-billing-testclock.ts cleanup
npx tsx scripts/platform-billing-testclock.ts create 24 "Starter (Call + Text)"
npx tsx scripts/platform-billing-testclock.ts advance 32
```

Expect a **second** `PAID` invoice, status still `ACTIVE`, and `currentPeriodEnd` moved forward one
month. Two invoices, two payments, no duplicates.

---

## T3 — Trial that converts

```bash
npx tsx scripts/platform-billing-testclock.ts cleanup
npx tsx scripts/platform-billing-testclock.ts create 24 "Test awx"     # trial 2d
```

| Check             | Expected             |
| ----------------- | -------------------- |
| Our status        | `TRIALING`           |
| `trialConsumedAt` | set                  |
| Entitlements      | granted during trial |

`advance 3` → status `ACTIVE`, first `PAID` invoice appears.

Then confirm the trial cannot be taken twice: cancel, and start a fresh checkout through the UI on
the same company. Stripe Checkout must **not** show a free trial the second time
(`trialConsumedAt` gates it).

---

## T4 — Checkout through the UI

Log in as `Autoworxtest@gmail.com` → Settings → Billing → Choose a Plan → pick one → pay with
`4242 4242 4242 4242`.

| Check              | Expected                                                                |
| ------------------ | ----------------------------------------------------------------------- |
| Redirect           | back to billing with "Payment received — setting up your subscription…" |
| After ~2.5s reload | plan name, activation date, next billing date                           |
| Payment history    | one row, correct amount, within seconds — **not minutes**               |
| `--candidates`     | company 24 no longer listed                                             |

Payment history staying empty for more than ~10 seconds is the signup-race regression: `invoice.paid`
arrives before `customer.subscription.created`, and `resolveSubscriptionRow` is what fixes it.

---

## T5 — Permissions

| As                       | Action                                      | Expected                               |
| ------------------------ | ------------------------------------------- | -------------------------------------- |
| Sales (`dummyjen@`)      | open `/dashboard/settings/billing` directly | **404**                                |
| Technician (`dummyjoe@`) | same                                        | **404**                                |
| Manager (`dummyjack@`)   | same                                        | page loads, can cancel and change plan |
| Admin                    | same                                        | full access                            |
| Sales                    | Settings sidebar                            | no "Billing" item                      |

Resolved through the `businessSettings` permission key, so revoking Business Settings from the
Manager must remove billing access too — worth one spot check.

---

## T6 — Cancel and resume

As Admin, with a live subscription:

1. **Cancel Plan** → confirm dialog says access continues to period end → toast confirms.
   - `cancelAtPeriodEnd` true, status **unchanged** (still `ACTIVE`), amber "Ending <date>" badge.
   - Entitlements **still granted** — they paid for the period.
2. **Resume Plan** → `cancelAtPeriodEnd` back to false, badge gone.
3. Cancel again, then `advance 32` on the clock → status `CANCELED`, entitlements revoked.

A status flip to `CANCELED` at step 1 is a bug: it would revoke access the customer already paid for.

---

## T7 — Manage Billing portal

Requires a saved Portal configuration first: **Stripe Dashboard → Settings → Billing → Customer
portal → Save**. Without it the button returns a Stripe error.

Restrict the portal to your synced prices while you are there. If a customer switches to a price
with no matching `PlatformPlan`, the webhook fails closed and becomes a support ticket.

| Check                              | Expected                                                                |
| ---------------------------------- | ----------------------------------------------------------------------- |
| Button opens Stripe portal         | invoices and card management visible                                    |
| Add a second card, make it default | `customer.updated` fires; `default card` in the state script follows it |
| Cancel from the portal             | `cancelAtPeriodEnd` true in our DB                                      |

---

## T8 — Plan change with proration

As Admin on a live subscription, pick a **different** plan from the modal.

| Check            | Expected                                  |
| ---------------- | ----------------------------------------- |
| No card re-entry | swaps in place                            |
| Our `planId`     | updates immediately (optimistic)          |
| Stripe           | a proration line item on the next invoice |
| `advance 32`     | next invoice charges the **new** price    |

Downgrade too — a proration _credit_ should appear, not a negative charge.

---

## T9 — Duplicate subscription guard

Open the plans modal in two browser tabs as the same Admin and complete both checkouts as fast as
possible.

Expect: exactly **one** live subscription in Stripe. The second attempt fails with "This company
already has an active subscription." The guard queries Stripe directly, not our DB mirror, because
the mirror lags the webhook.

Check the Stripe customer afterwards — more than one `active` subscription means double billing.

---

## T10 — Webhook resilience

```bash
stripe events resend <event_id>                     # duplicate delivery
```

| Test                                                              | Expected                                                                                  |
| ----------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| Resend a processed event                                          | no duplicate invoice/payment rows; event stays `PROCESSED`                                |
| Resend an old `payment_failed` after the invoice was paid         | ignored, warning logged, row stays `PAID`                                                 |
| `curl -X POST localhost:3000/api/platform/stripe-webhook -d '{}'` | **400** invalid signature                                                                 |
| Stop the dev server, run `advance`, restart                       | events replay from Stripe; state catches up                                               |
| AWX dashboard → Webhook Events                                    | retry on a `PLATFORM_AUTHORIZE_NET` row shows "Authorize.Net platform billing is retired" |

---

## T11 — Super-admin surfaces

| Action                                                     | Expected                                                                               |
| ---------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| AWX → Plans → create a plan                                | appears with a `stripePriceId`; a duplicate name gives a clear 409 message             |
| Edit a plan's price                                        | new Stripe Price created, old one archived, plan repointed                             |
| Deactivate a plan with active subscriptions                | existing subscribers keep billing; the plan disappears from the customer modal         |
| Company detail → custom plan, twice with the default label | both succeed — second is named `… #2`, no crash                                        |
| Company detail → **Force Cancel**                          | Stripe subscription cancelled immediately, status `CANCELED`, entitlements revoked now |
| Non-super-admin hitting `/api/awx/*`                       | 403                                                                                    |

---

## T12 — Entitlement enforcement

With a `CANCELED` subscription, as an Admin of that company, confirm each is actually blocked and
the message is in plain language — no "entitlement" or "feature flag" wording on screen:

- Send an SMS
- Place a call
- Create an automation beyond the plan's limit
- Car wrap visualizer, AI smart replies, sales agent

Then re-subscribe and confirm they come back without a logout.

`-1` on a limit means unlimited. `0` means blocked. Any other negative number is invalid and the
plan editor rejects it.

---

## Cleanup

```bash
npx tsx scripts/platform-billing-testclock.ts cleanup   # deletes the clock and everything on it
```

The `PlatformSubscription` row for the test company stays behind — delete it by hand for a clean
re-run. Stripe test-mode Products/Prices from the sync can stay.

---

## Known gaps (not bugs to find — decisions still open)

- **Refunds are not handled.** `charge.refunded` / `credit_note.created` are unhandled, so a refund
  in Stripe leaves our invoice `PAID`. Anything reporting revenue off these tables overstates.
- **`PlatformSubscriptionItem` is write-only** — `changePlan` maintains it, checkout never creates
  rows, nothing reads it.
- **Deleting a plan does not archive its Stripe Product** — clutter only, not purchasable.
- **Pre-migration rows grant free access.** Three companies here (4, 39, 49) have a live status with
  no `stripeSubscriptionId`: entitlements are granted and nothing bills them. Prod reportedly has
  none — confirm with the `--candidates` output against prod before shipping, because each one is a
  shop with full access and no invoice.
