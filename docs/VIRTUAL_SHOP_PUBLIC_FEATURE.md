# Virtual Shop — Public Storefront Feature Documentation

> Scope: this document covers the **public-facing side** of the Virtual Shop feature — the customer-facing storefront served under a shop's subdomain (`https://{slug}.{domain}`). For the admin-side configuration and operations console, see [VIRTUAL_SHOP_ADMIN_FEATURE.md](VIRTUAL_SHOP_ADMIN_FEATURE.md).

## 1. What the public side is

Each shop configured in the admin dashboard gets its own storefront at `https://{slug}.{app-domain}`, where a customer can browse services, book an appointment (with optional deposit payment), submit an urgent/emergency service request, and buy or redeem gift cards — all without a platform account.

There is no traditional multi-section marketing homepage (hero/about/footer). **The storefront's "home page" is the first step of a single booking wizard** — landing on the service catalog, which then flows through date/time selection, checkout, and confirmation.

---

## 2. Subdomain routing mechanism

Routing is handled in `src/proxy.ts` (Next.js 16 renamed `middleware.ts` → `proxy.ts`), matched against all paths except static assets.

1. `extractSubdomain()` (`src/proxy.ts`, using `src/lib/subdomains.ts`) reads the `Host` header: in dev it parses `{slug}.localhost`; in production it strips `NEXT_PUBLIC_ROOT_DOMAIN` (ignoring `www`/`dev`/`stage` prefixes) and also supports Vercel preview URLs (`tenant---branch.vercel.app`).
2. If a subdomain is found:
   - Requests to `/dashboard` are redirected to `/` — the main dashboard is not reachable from a tenant subdomain.
   - API routes (`/api/...`) are left un-rewritten, so they hit normal API handlers.
   - Everything else is internally rewritten (URL bar doesn't change) to `/subdomain/{slug}{pathname}`, which Next.js resolves to `src/app/subdomain/[subdomain]/page.tsx`.

So `https://acme-detailing.autoworx.app/` is transparently served by `src/app/subdomain/[subdomain]/page.tsx` with `params.subdomain === "acme-detailing"`.

---

## 3. Data fetching & the `isActive` gate

- `page.tsx` (server component) fetches the shop via `getShopBySlugServer(slug)` — a cached `db.shop.findUnique({ where: { slug } })` — and passes it straight down as `initialShop`, **with no `isActive` check or `notFound()` at this layer**.
- `generateMetadata` does check `!shop || shop.isActive === false`, but only to swap the page `<title>` to "Shop Not Found | Autoworx" — it does not block rendering.
- The public API `GET /api/virtual-shop/configure/subdomain/{slug}` also only 404s when the shop row doesn't exist at all; it returns inactive shops with `isActive: false` in a 200 response.

**The actual `isActive` gate is client-side only**, in `BookingContent.tsx`:

```ts
if ((!shop && !isShopLoading) || shop?.isActive === false) {
  return <ShopNotFound />;
}
```

Once the client-side shop query resolves, an inactive or missing shop renders the shared `ShopNotFound` component instead of the booking UI.

**QA note:** because this check is client-only, there's a brief window during SSR/first paint where an inactive shop's data is present in the DOM/props before the client swaps to `ShopNotFound`. It's not a hard security boundary (no data beyond the shop record itself is exposed), but it's a minor flash-of-content issue worth knowing about. It also means the same `ShopNotFound` screen is shown for three different causes — wrong/missing slug, deleted shop, and deliberately deactivated shop — QA cannot currently distinguish these from the UI alone, only by inspecting the network response.

---

## 4. Storefront layout & components

| File                                        | Role                                                                                                                        |
| ------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `page.tsx`                                  | Server entry — fetches the shop, builds SEO metadata                                                                        |
| `pages/BookingPage.tsx`                     | Wraps everything in `BookingProvider` (the booking wizard's state/context)                                                  |
| `components/booking/BookingContent.tsx`     | Orchestrator — loading spinner → not-found gate → header + current step + cart button + emergency-request modal             |
| `components/booking/BookingHeader.tsx`      | Banner image (`shop.bannerUrl`, falls back to a stock photo), logo, store name/description overlay, "Gift Cards" nav button |
| `components/booking/ProgressBar.tsx`        | 4-step indicator: Services → Date & Time → Checkout → Confirmed                                                             |
| `components/booking/ServiceMenu.tsx`        | The de-facto landing page: category filter pills + paginated service grid                                                   |
| `components/booking/ServiceCard.tsx`        | Individual service tile, opens an in-page detail modal (no separate detail page/route)                                      |
| `components/booking/CartDrawer.tsx`         | Floating cart button/drawer, shown only during the Services step                                                            |
| `components/giftcards/ShopNotFound.tsx`     | Shared fallback for missing/inactive/deleted shops                                                                          |
| `components/ui/Skeleton.tsx`, `Spinner.tsx` | Loading placeholders                                                                                                        |
| `pages/Index.tsx`                           | Dead leftover Vite/Lovable boilerplate — not wired into any route, safe to ignore                                           |

There's no footer on this page; `termsConditions`/`privacyPolicy` links only appear later, inside the Checkout step.

### Theming

`useShopBranding(shop)` applies the admin-configured `themeConfig` (`primaryColor`, `fontFamily`) **client-side, imperatively**, not via Tailwind config or SSR:

- Converts the hex `primaryColor` to HSL and sets the `--primary`/`--ring` CSS custom properties — the same variable names Tailwind's `bg-primary`/`text-primary-foreground` utilities already consume, so existing components re-theme automatically.
- For `fontFamily`, dynamically injects a Google Fonts `<link>`, sets a `--font-family-base` CSS var, and sets `document.body.style.fontFamily` directly.

Because this runs in a `useEffect`, there's a brief flash of default theme before hydration applies the shop's branding (a FOUC-style artifact worth a QA note, not a functional bug).

### Services display

Responsive grid (1/2/3 columns), backed by a paginated API (10 services/page), filterable by category tag — no free-text search. Clicking a card opens a detail modal (full description + per-vehicle-type pricing) rather than navigating away; "Add to Cart" pushes the item into the wizard's cart state without leaving the Services step.

### SEO

`generateMetadata` is dynamic per shop: `<title>"{storeName} | Online Booking"</title>`, description from `shop.description` (falls back to a generic line), and Open Graph title/description/image (using `shop.logoUrl`). Inactive/missing shops get a static "Shop Not Found | Autoworx" title with no description/OG override.

---

## 5. Booking flow

The wizard (`BookingContent.tsx`) moves through 4 steps: **services → datetime → checkout → confirmation**.

### Step 1 — Service selection

Customer browses/filters `ServiceMenu`, adds services to a cart (each cart entry carries the service, chosen vehicle type, and quantity).

### Step 2 — Date & time (`DateTimeSelection.tsx`)

1. A calendar picks a date; available slots for that date (or "Next Available") are fetched from `GET /api/virtual-shop/appointment-slots`.
2. Once a slot is chosen, the client calls `POST /api/virtual-shop/service-booking/hold`, which places a **15-minute soft hold** on that slot before advancing to Checkout.
3. An "Urgent Request" button is also available here, opening the emergency-request modal (see §7) — this bypasses scheduling entirely.

**Availability calculation** (`getAvailableSlots`, `src/actions/appointment/getAvailableSlots.ts`):

- Reads `ShopBookingSetting` and that day's per-`dayOfWeek` open/close hours.
- Generates candidate slot start times stepping by the shop's `slotInterval` (default 30 min), skipping past times for "today" (timezone-aware via the company's timezone).
- For each slot, counts overlapping existing `Appointment` rows plus live (unexpired) `ShopSlotHold` rows. A slot is available only if that count is below the shop's stacking limit — `stackingLimit` is `1` unless the shop has "allow overlapping bookings" enabled, in which case its configured limit applies.
- Also marks a slot unavailable if the requested service's duration would push past closing time.

**Double-booking prevention** happens three times, all under a row lock on the shop's booking-settings record to serialize concurrent requests:

1. At slot-list time (as above, informational).
2. At hold-creation time (`POST /service-booking/hold`) — re-checks the same overlap count (excluding the caller's own hold) before creating a 15-minute `ShopSlotHold`. The hold is released via `DELETE` on the same route (triggered by the Back button or `beforeunload`/`sendBeacon`).
3. At final booking-creation time (`POST /service-booking`) — repeats the capacity check once more as the final race guard.

### Step 3 — Checkout (`Checkout.tsx`)

Composed of: a countdown timer (reflecting the slot hold), a booking summary card (cart + totals), a pending-deposit banner, a gift card section (§6 of the admin doc / §8 below), and a customer form (name, email, phone with lookup-by-phone, vehicle year/make/model, notes, terms checkbox). Totals (subtotal/tax/shop fee/deposit) are computed the same way documented in the admin doc's §6.3 (Financial tab).

**Note:** there is an unused legacy component, `CheckoutV1.tsx`, still imported (but never rendered) in `BookingContent.tsx` — dead code, not the active checkout implementation.

### Step 4 — Confirmation (`Confirmation.tsx`)

Success animation, appointment/customer/service summary, "Add to Calendar" (.ics download), and "Book Another" (resets the wizard). A commented-out "View Estimate" link (pointing at a public invoice page) exists but isn't currently active.

---

## 6. Deposit & payment flow

This is the part most worth understanding precisely, since booking-creation timing differs depending on whether a deposit is required.

1. `POST /api/virtual-shop/service-booking` computes the required deposit from the shop's `ShopBookingSetting` (enabled flag, percentage-or-fixed, amount).
2. **If a deposit is required and not fully covered by an applied gift card:** the booking is created immediately with **`status: PENDING`** — only the `ShopBooking` + its service line-item snapshots are written; **no invoice or appointment record is created yet.** The response returns the amount still payable.
3. **If no deposit is required, or a gift card fully covers it:** the booking is created directly as **`status: CONFIRMED`**, with the invoice and appointment created in the same step, and the customer confirmation message fires immediately.
4. For the PENDING case, the frontend stashes a booking snapshot in `sessionStorage` and opens the `PayNow` payment modal for the remaining payable amount.
5. `PayNow` creates a Stripe or AuthorizeNet payment link/session carrying the booking's id in its metadata, then redirects (or shows an embedded form) for card entry.
6. When the payment provider's webhook confirms success, it calls `confirmShopBooking()` — this is the real confirmation path: it builds the invoice line items, redeems any pending gift card code, creates the invoice/appointment, flips the booking's status to `CONFIRMED`, and fires the customer confirmation message (worded differently — "deposit received" — than the no-deposit case).
7. The customer is redirected back to the storefront; the page detects the success flag, restores the sessionStorage snapshot, polls a read-only confirm/status endpoint to pick up final totals, and transitions to the Confirmation step.

**In short:** deposit-required bookings are created as PENDING first, with invoice/appointment creation and CONFIRMED status deferred until the payment webhook actually fires — unlike the no-deposit path, where everything is created inline in one request.

There's also a separate legacy `deposit/route.ts` PUT endpoint that appears unused by any current frontend code (a candidate for cleanup — flagging for awareness, not urgency).

### Payment providers

Both **Stripe** and **AuthorizeNet** are integrated; which one(s) a shop's company has enabled is fetched via a gateway-info lookup. If both are available, the customer picks a provider from a dropdown in the payment modal.

---

## 7. Urgent / Emergency service requests

Opened via the "Urgent Request" button on the date/time step — this is a deliberately different, simpler flow with **no calendar/slot picker at all**.

The modal collects: phone (with auto-lookup), name, email, a free-text problem description, the current cart's services (read-only), vehicle info, and an _optional_ preferred date/time plus an "I'm flexible with timing" checkbox.

On submit (`POST /api/virtual-shop/emergency-requests`):

- Looks up or creates the customer's client/vehicle/lead records.
- Creates an `EmergencyBookingRequest` with a default priority and a 2-hour expiry window.
- Sends the customer a confirmation notification, including a public **tracking page** link (`/emergency-status/{id}`) and an "estimated review time" message.
- Notifies the shop's admin/manager/sales users (in-app, push, and email) — **but only if the shop's `urgentBookingNotificationsEnabled` flag is on**; if it's off, no admin notification fires at all for that shop. This lands in the admin dashboard's "Urgent Requests" tab (documented in the admin-side doc).

---

## 8. Confirmation & notifications

- **Customer-visible**: the Confirmation screen (appointment/customer/service summary, calendar download, "Book Another").
- **Customer message**: sent SMS-first (falling back to email only if no mobile number exists), fired either immediately (no-deposit/gift-card-covered bookings) or after the deposit payment webhook confirms (worded as "deposit received").
- **Admin notification**: only the urgent/emergency-request path notifies shop staff, and only if `urgentBookingNotificationsEnabled` is on. Ordinary scheduled bookings don't trigger an equivalent admin-facing push — staff see them by checking the dashboard (Calendar/Estimates tabs).

---

## 9. Cancellation / rescheduling

There is **no customer-facing cancel or reschedule action anywhere in the public flow.** The Confirmation screen only offers "Add to Calendar" and "Book Another" (which just resets the wizard for a new booking). The only status-mutation endpoint requires an authenticated admin session — it's the same endpoint backing the admin Estimates tab's status dropdown (documented in the admin-side doc, §6.4), not reachable from the storefront. Releasing a slot hold only applies during the datetime→checkout window of an in-progress booking, not to an already-completed one.

---

## 10. Gift cards (public side)

The live implementation is `pages/GiftCardsPage.tsx`, reached via the "Gift Cards" button in the storefront header. It has 3 tabs: **Buy**, **Reload**, **Check Balance**.

> Note: a second, unused prototype component (`components/giftcards/BuyGiftCardFlow.tsx`) exists in the codebase but isn't wired into any route — it's dead code, not the real flow.

### Buy flow (wizard steps)

`design → type → amount → discount → recipient → checkout → confirmation`

1. **Design** — pick from the shop's configured gift card templates (default-selected).
2. **Type** — individual / multiple / group options are shown, but **only "individual" is actually functional** — multi-recipient/group gifting is UI-stubbed and blocks progression.
3. **Amount** — up to 3 admin-configured presets, plus an optional custom amount (respecting the shop's configured min/max), if the shop allows custom amounts.
4. **Discount** — optional promo code entry.
5. **Recipient** — "send to myself" toggle, or choose email/SMS delivery (only for methods the shop has enabled), recipient name/contact, an optional personal message, and (for SMS) a required consent checkbox.
   - **Note:** a "When to Send" (instant vs. scheduled) control exists in the code but is currently **commented out of the UI** — even though the underlying scheduled-send data fields and settings still exist. In practice, delivery is always immediate regardless of the shop's "allow scheduled send" setting (see below).
6. **Checkout** — design/amount/discount summary, terms/privacy links, and a required consent checkbox before payment is enabled.
7. **Confirmation** — shows a confirmation number and masked gift card code.

### Payment mechanism

Gift card purchases reuse the **same Stripe/AuthorizeNet components** as booking deposits, tagged distinctly so they're not confused in payment records. The flow is "initiate → pay → confirm":

1. An initiate endpoint validates the whole purchase (amount vs. limits, template active, promo code validity/expiry/usage-limit, discount computation) and returns payment-gateway info — no gift card is issued yet.
2. The customer pays via the same payment modal used for bookings.
3. On return, the app polls a confirmation endpoint, which reconciles the payment and — once confirmed paid — actually issues the gift card (generates a unique code and order number, creates the gift card record at full face value, links/creates a purchaser client record, and logs an issuance transaction).

### Delivery

**Always immediate at issuance** — regardless of any scheduled-send setting, since nothing in the codebase currently reads/acts on a scheduled send time (no cron/queue job exists for it). This is consistent with the "When to Send" UI being commented out — the feature is partially built but not functioning end-to-end.

- SMS: plain text with amount, optional personal message, and the raw gift card code.
- Email: a branded HTML card showing the amount, shop name, optional message, and the raw, unmasked code, with instructions to present it at checkout.

### Redemption during a service booking

On the booking Checkout step, a customer can apply a gift card code (validated as active with a positive balance — no expiry check performed here, see below). **Gift cards apply to the deposit amount first**, not the full invoice total, unless no deposit is required at all:

- If the gift card doesn't fully cover the required deposit, the booking is created as `PENDING` and the remaining amount is collected via the normal deposit payment flow (§6); actual redemption happens later, once payment is confirmed, splitting the deposit between the customer's card payment and the gift card balance.
- If the gift card **fully covers** the deposit, redemption happens immediately and the booking is created directly as `CONFIRMED` — **no payment gateway step is needed at all** in that case.

### Balance & expiry

Balance tracking is stored-value with partial spend-down — each redemption decrements the card's current balance (using a guarded update to prevent race conditions on concurrent redemptions), and the card's status flips to "depleted" once the balance hits zero. Every issuance and redemption writes an immutable ledger entry.

**QA flag — expiry is configured but not enforced.** The shop's gift-card expiry-days setting computes and stores an expiration date on each issued card, but **no code path anywhere (balance check or redemption) actually reads or compares against that expiration date** — only whether the card is active with a positive balance is checked. Reinforcing this gap, the public UI itself hardcodes "Gift cards never expire" on both the balance-check and checkout screens, directly contradicting the admin-configurable expiry setting. This should be treated as a known product/engineering gap, not documented as working behavior.

### Balance-check page

Yes — the "Check Balance" tab is a standalone lookup requiring only a gift card code (the shop is resolved from the subdomain), with no purchase or booking required. It shows the masked code, current balance, original amount, and status.

---

## 11. Known gaps / QA & product follow-ups

1. **`isActive` gating is client-side only** — a brief SSR flash of an inactive shop's data is possible before the client swaps to the not-found screen (§3).
2. **`ShopNotFound` doesn't distinguish causes** — missing slug, deleted shop, and deactivated shop all render identically; QA needs network inspection to tell them apart.
3. **Theming has a FOUC** — branding colors/fonts apply after hydration via a `useEffect`, so there's a brief flash of default styling on load.
4. **Dead code exists in two places** — `CheckoutV1.tsx` (still imported but never rendered) and `BuyGiftCardFlow.tsx` (not wired into any route) — worth removing to avoid future confusion about which implementation is "real."
5. **A legacy `deposit/route.ts` PUT endpoint** appears to have no active caller in the current frontend — candidate for cleanup, but confirm before removing.
6. **Gift card group/multiple purchase type is a non-functional UI stub** — only "individual" can actually proceed through checkout.
7. **Gift card scheduled sending is not implemented** — the setting and data fields exist, but delivery is always immediate and the relevant UI control is commented out.
8. **Gift card expiry is computed but never enforced**, and the public UI actively tells customers cards never expire — a direct contradiction of the admin's configurable expiry setting that should be resolved (either enforce it, or remove the setting and align the copy).
9. **No customer-facing cancellation or rescheduling** exists anywhere in the public flow — if this is desired, it would need new endpoints and UI, not just permission changes.
