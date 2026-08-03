# Virtual Shop — Admin Side Feature Documentation

> Scope: this document covers only the **admin-side** of the Virtual Shop feature (the dashboard experience where a business configures and manages its virtual shop). The **public storefront** served under the shop's subdomain (`src/app/subdomain/[subdomain]/page.tsx`) is documented separately.

## 1. What is the Virtual Shop feature?

Virtual Shop lets a company create a public-facing, branded mini storefront (reachable at `https://{slug}.{app-domain}`) where customers can browse services, book appointments, submit urgent service requests, and purchase gift cards — without needing an account on the main platform.

On the admin side, there are **two separate consoles**:

| Console                     | Route                                        | Purpose                                                                                                                                                                  |
| --------------------------- | -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Shop Configuration**      | `/dashboard/settings/virtual-shop-configure` | Create/edit/delete a shop's identity: name, subdomain slug, branding, legal text, active/inactive toggle.                                                                |
| **Shop Operations Console** | `/dashboard/virtual-shop/admin/[shopId]/...` | Day-to-day management of an existing shop: services offered, pricing, scheduling rules, deposits, financials, gift cards, bookings calendar, estimates, urgent requests. |

A shop must first be created in **Shop Configuration** before it appears in the **Operations Console**.

---

## 2. Access & Permissions

- The whole feature is gated behind a company-level feature flag/permission named **`virtual-shop`** ("Virtual Shop" in the permissions list), which defaults to **off** and must be enabled per-company/per-role — same pattern as other opt-in modules like Sales Agent or Automation.
  - `src/constants/static-permissions.ts` — permission definition.
  - `src/lib/routePermissionsMap.ts` — maps the `/dashboard/settings/virtual-shop-configure` route to this permission.
- Separately, the **Operations Console's shop switcher** (top navbar) is hard-restricted to users whose `employeeType === "Admin"` — non-admin employees never see it regardless of the permission flag.
  - `src/components/top-navbar/ShopList.tsx`
- The main sidebar previously had a direct "Virtual Shop" link (`src/components/Layout.tsx`), but it is currently **commented out**. Today, admins reach the Operations Console only via the top-navbar shop switcher, and reach Shop Configuration via **Settings**.

### How to find it (as an admin user)

1. **Settings → Virtual Shop Configure** (sidebar item with a Store icon) → `src/app/(dashboard)/dashboard/settings/Sidebar.tsx`.
2. **Top navbar → "Your Shops" dropdown** (visible only to Admin employee type, only if the company has ≥1 shop already configured) → opens the Operations Console for the selected shop, landing on its **Services** tab.

---

## 3. Shop Configuration (Settings → Virtual Shop Configure)

### 3.1 List page

Route: `/dashboard/settings/virtual-shop-configure`

Shows a grid of shop cards, one per shop the company has created, plus a **"Configure New Shop"** button.

Each shop card displays:

- Banner image, logo, store name, description
- **Edit** button → goes to the edit form
- **Preview** (external-link icon) → opens the live public storefront in a new tab at `https://{slug}.{domain}`
- **Delete** button, guarded by a confirmation popover

### 3.2 Create / Edit form

Routes: `.../shops/create` (new) and `.../shops/[id]` (edit) — both render the same `ShopForm` component.

**Step-by-step flow for a new admin setting up a shop:**

1. Enter **Store Name** (required). As the admin types, a **slug preview** auto-generates below in real time (lowercased, spaces → hyphens, non-alphanumerics stripped), shown as `https://{slug}.{domain}`.
   - Note: the slug field is editable in the UI, but on save the **server always re-derives the slug from Store Name** — any manual slug edit is effectively discarded. (Worth flagging to QA/new devs, since it can be a source of confusion — "I changed the slug but it reverted.")
2. Enter a **Description** (optional, max 150 characters, with a live character counter; exceeding the limit blocks submission with an inline error).
3. Upload a **Logo** and a **Banner** image:
   - Only `.jpg`, `.png`, `.webp` accepted; max 5 MB; otherwise a toast error is shown.
   - Selecting a file opens an **image crop modal** (zoom + rotate) before it's accepted — logo crops to a 1:1 circle (400×400 output), banner crops to a 16:6 rectangle (1600×600 output).
   - Cropped images are only actually uploaded to storage when the form is submitted (see §3.4).
4. Choose a **brand color** (color picker with 10 preset swatches + custom hex) and a **font family** (choice of Inter, Roboto, or Playfair Display). Together these form the shop's `themeConfig`.
5. Toggle **Active** — "Toggle whether this shop is visible to customers." This is the publish/unpublish switch (see §5).
6. Toggle **Urgent Booking Notifications** — "Receive platform notifications when a customer submits an urgent service request."
7. Enter **Terms & Conditions** and **Privacy Policy** text (each optional, max 1500 characters, plain textareas — no rich text editor).
8. Click **Save**. On success, the admin is returned to the shop list (or stays on edit) with a confirmation toast; on a duplicate slug the server responds with **"The shop already exist!"**, shown as a toast.

### 3.3 Validation rules

| Field              | Rule                                                                                                                                                                                                        |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Store Name         | Required, non-empty                                                                                                                                                                                         |
| Slug               | Required (auto-derived), must be unique across all shops — enforced **server-side only** on create; there is no live "check availability" call, so the admin only discovers a collision after clicking Save |
| Description        | ≤ 150 characters                                                                                                                                                                                            |
| Terms & Conditions | ≤ 1500 characters                                                                                                                                                                                           |
| Privacy Policy     | ≤ 1500 characters                                                                                                                                                                                           |
| Logo / Banner      | image/jpeg, image/png, or image/webp only; ≤ 5 MB                                                                                                                                                           |

### 3.4 Image upload mechanics

1. Admin selects a file → validated client-side → cropped in-browser via the crop modal → staged locally as a `File` + preview thumbnail (not yet uploaded).
2. On form submit, each staged file is POSTed to `/api/upload`, which requests an S3 pre-signed URL, uploads the file directly to S3, and returns the public URL.
3. That returned URL is what gets saved as `logoUrl` / `bannerUrl` on the shop record.
4. Removing an image from the form only clears it client-side — it does **not** delete the object from S3 (an `/api/upload` DELETE endpoint exists for this but isn't currently wired up to the remove button). Not a blocker, but worth noting for QA/storage-hygiene awareness.

---

## 4. Backend API reference (Shop Configuration)

| Method                     | Route                                             | Purpose                                                                                                                                                                                                                                                                                                                           |
| -------------------------- | ------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `POST`                     | `/api/virtual-shop/configure`                     | Create a shop. Re-derives slug from `storeName`, rejects duplicate slugs (400), and — in the same transaction — seeds default `ShopBookingSetting` (deposit off, 30-min slots, hours copied from company Calendar Settings) and default `GiftCardSetting` (presets $25/$50/$100/$200, custom range $10–$1000, email delivery on). |
| `GET` / `PATCH` / `DELETE` | `/api/virtual-shop/configure/{id}`                | Fetch, update, or delete a single shop by its own id. PATCH re-derives the slug from the submitted name but does **not** re-check uniqueness (a theoretical edge case if two edits race).                                                                                                                                         |
| `GET`                      | `/api/virtual-shop/configure/company/{companyId}` | Paginated list of a company's shops (used by the list page).                                                                                                                                                                                                                                                                      |
| `GET`                      | `/api/virtual-shop/configure/subdomain/{slug}`    | Public lookup used by the storefront itself. **Does not filter on `isActive`** — see §5 note.                                                                                                                                                                                                                                     |

Client-side wrappers: `src/service/virtual-shop/api.ts`. React Query hooks: `src/hooks/virtual-shop/configure/useVirtualShopConfigure.ts` (handle toasts + cache invalidation automatically).

### Data model — `Shop` (Prisma)

Key fields: `id, companyId, slug (unique), storeName, description?, logoUrl?, bannerUrl?, themeConfig (json), isActive (default true), urgentBookingNotificationsEnabled (default true), termsConditions? (≤1500 chars), privacyPolicy? (≤1500 chars), createdAt, updatedAt`, plus relations to `Company`, `ShopService[]`, `ShopBookingSetting`, `ShopBooking[]`, `EmergencyBookingRequest[]`, `GiftCardSetting`, `GiftCardTemplate[]`, `GiftCardPromo[]`, `IssuedGiftCard[]`.

---

## 5. Publish / Unpublish behavior

- The single source of truth for whether a shop is publicly visible is the **`isActive`** boolean on the `Shop` record, controlled by the "Active" switch in the config form.
- **QA flag:** the public subdomain-lookup endpoint (`GET /api/virtual-shop/configure/subdomain/{slug}`) does not itself filter by `isActive`. Any enforcement of "inactive shop shows a not-found/coming-soon page" must be happening in the subdomain page component itself, not the API. This should be explicitly verified when documenting/testing the public side, and is a good candidate for a regression test (toggle a shop inactive, confirm the public URL no longer serves content).

---

## 6. Shop Operations Console

Route: `/dashboard/virtual-shop/admin/[shopId]/...` — a tabbed interface (`VirtualShopTabs.tsx`). Visiting `/dashboard/virtual-shop/admin` with no shop selected redirects to the first shop's Services tab, or shows a "Shop Not Found" state if the company has zero shops configured yet.

| Tab                 | What it manages                                                                                                                                                                                                                               |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Services**        | The services shown on the storefront: title, short/long description, image, category tags, duration, and price modifiers per vehicle type (coupe/sedan/SUV/truck). Backed by `ShopService`.                                                   |
| **Deposits**        | Whether a deposit is required to book, and whether it's a percentage or fixed dollar amount.                                                                                                                                                  |
| **Scheduling**      | Per-day (Mon–Sun) open/closed + open/close times, booking slot interval, and "stacking" (allow overlapping bookings) + stacking limit. Defaults inherit from the company's Calendar Settings.                                                 |
| **Financial**       | Enable/disable tax and a "shop fee" surcharge on bookings. The actual tax/fee percentages are read-only here — they come from the company record, not per-shop.                                                                               |
| **Gift Cards**      | Gift card template/design management, custom-amount min/max, preset amounts, delivery method (email/SMS), scheduled sending, expiry, and gift-card-specific terms/privacy text, plus promo codes (percentage/fixed, date range, usage limit). |
| **GC Purchases**    | View history of gift card purchases (operational, read-mostly).                                                                                                                                                                               |
| **Calendar**        | View/manage the shop's bookings calendar.                                                                                                                                                                                                     |
| **Estimates**       | View generated estimates from the shop.                                                                                                                                                                                                       |
| **Urgent Requests** | Manage emergency/urgent service requests submitted by customers, with a status workflow.                                                                                                                                                      |

### 6.1 `ShopService` vs. the invoice-side `Service` — they are NOT the same thing

A common point of confusion for new devs/QA: the platform has **two separate, unrelated "service" models**. Don't assume the Services tab in Virtual Shop is just a filtered view of the regular invoice service catalog — it isn't.

|                       | `Service` (invoice/estimate catalog)                                                                                                                                                                                                                                                                 | `ShopService` (Virtual Shop catalog)                                                      |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| Prisma model          | `prisma/schema.prisma:1306-1329`                                                                                                                                                                                                                                                                     | `prisma/schema.prisma:3068-3103`                                                          |
| Used for              | Invoice/estimate line items, technician assignment, leads, maintenance stages                                                                                                                                                                                                                        | The public storefront's service listing for one shop                                      |
| `category` field      | `categoryId Int?` — a relation to the shared `Category` model (same taxonomy used across services/materials/labor/inventory)                                                                                                                                                                         | `category String[]` — a plain free-text tag list, no relation at all                      |
| Is category required? | Not at the DB or schema level (`categoryId` is nullable; the Zod schema marks it `.nullable().optional()`) — it's only enforced as a **client-side check** in the New Service form (`NewService.tsx`), which blocks submission with "Category is required" if nothing is selected                    | Fully optional everywhere — DB, Zod schema, and the create form all allow zero categories |
| Link between the two  | **None.** There is no FK from one to the other. The only shared touchpoint is `InvoiceItem`, which has two independent optional FKs: `serviceId` → `Service` and `shopServiceId` → `ShopService`. A line item can reference one or the other, but the two catalogs never cross-reference each other. |

**Why the category requirement differs:** `Service.category` drives internal reporting/filtering via the shared `Category` taxonomy (services, materials, labor, inventory all share it), so there was a real intent to require it — but that intent was only ever implemented as a soft UI rule, not a schema/DB constraint. `ShopService.category` is just customer-facing display tags for the storefront, with no reporting/accounting purpose, so there was never a design reason to require it. Net effect: same word "category," two different underlying concepts, and the invoice side's "required" behavior is itself weaker than it looks (UI-only, not schema-enforced).

### 6.2 Create Service flow — "Service Info" tab vs. "Create" tab

The Create Service page (`src/app/(dashboard)/dashboard/virtual-shop/admin/service/create/ServiceCreateClient.tsx`) has exactly **two tabs**, answering two different questions. This is a second common point of confusion, distinct from §6.1, because both tabs involve fields called "Service" and "category" — but at different levels.

- **"Service Info"** tab (`ServiceInfo.tsx`) — "what is this service, how does it appear on the storefront." Fields: Title, short description, description, category tags (`CategoryInput.tsx`), image, custom duration, per-vehicle-type price modifiers. These map directly onto the `ShopService` row's own columns (`title`, `category: String[]`, etc.) — this is the same `category` discussed in §6.1.
- **"Create"** tab (`CreateTab.tsx`) — "what does this service actually cost to deliver." A table with columns **Services / Materials-Parts / Labor / Tags**. This tab is **not shop-specific code** — it's imported unmodified from the invoice/estimate builder (`src/app/(dashboard)/dashboard/estimate/create/tabs/CreateTab.tsx`), reusing the same `useEstimateCreateStore` state that powers invoice/estimate creation elsewhere in the app.

**The "Service" picked inside the Create tab is a different object than the Service Info tab's title.** It's an existing **canned `Service` catalog record** (the invoice-side `Service` model from §6.1, with its own `name` and a `categoryId` FK to `Category`) — you're selecting from the existing service catalog to build a cost breakdown, not naming the storefront listing. Materials in this tab come from `InventoryProduct` records; Labor comes from `db.labor` (canned labor records); Tags come from `db.tag`.

**How the two "category" concepts relate:** they live on separate rows and mostly don't interact, with one one-way side effect:

- Service Info's category tags → `ShopService.category` (free-text array, storefront display only).
- Create tab's "Service" picks → the selected `Service.categoryId` (FK to `Category`, internal catalog taxonomy) — unrelated storage.
- **Side effect at save time**: the server takes the category _names_ of whatever canned `Service`s were selected in the Create tab and merges them into `ShopService.category`, on top of whatever tags were typed in Service Info (`src/app/api/virtual-shop/shop-services/route.ts`). So they do end up combined in the same array, but only one-way, only computed on submit — never shared storage.

**Data flow on Save** (`POST /api/virtual-shop/shop-services`):

1. Client assembles one payload: the Service Info fields, plus an `items[]` array — one entry per Create-tab row, each optionally holding `{ service, materials[], labor, tags[] }`.
2. The server runs a single `$transaction` that creates:
   - **One `ShopService` row** (title/description/category/modifiers/`isActive`).
   - For each `items[]` row: a new `Labor` row if present, **one `InvoiceItem` row** linked via its `shopServiceId` FK (referencing the _existing_ canned `Service` by id — never duplicating it), new `Material` rows linked to that `InvoiceItem`, and `ItemTag`/`MaterialTag`/`LaborTag` join rows for any tags.
   - `ShopService.price` and `.duration` are **computed server-side** by summing all items' labor charges and material sell prices — Service Info has no raw price field, so this computed total is the actual price shown on the storefront.

There is no dedicated `ShopServiceItem`/`ShopServiceMaterial` table — `InvoiceItem` (normally an invoice's line item) is repurposed as the shop service's cost-breakdown table via its nullable `shopServiceId` FK. In short: **the Virtual Shop "Create Service" flow is the invoice/estimate line-item builder UI and state, reused as-is, to define a service's underlying cost structure — with `ServiceInfo.tsx` as the only shop-specific wrapper around it.**

### 6.3 Financial tab's "Tax"/"Shop Fee" vs. Settings → Estimates "Tax Rate"/"Shop Supplies" — same values, different labels

A third point of confusion: these are **not** two separate configs — they read/write the exact same `Company` columns, just under different UI labels and with different edit permissions.

|                               | Settings → Estimates (`EstimateAndInvoicePage.tsx`)                                                   | Virtual Shop → Financial tab (`FinancialTab.tsx`)                                                                            |
| ----------------------------- | ----------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| "Tax Rate" / "Tax"            | Editable input, `name="taxAmount"`, saves to `Company.tax`                                            | Read-only display, `Tax ({taxRate}%)`, reads the same `Company.tax`                                                          |
| "Shop Supplies" / "Shop Fee"  | Editable input, `name="serviceFee"`, saves to `Company.serviceFee`                                    | Read-only display, `Shop Fee ({shopFeeRate}%)`, reads the same `Company.serviceFee`                                          |
| What's actually editable here | The rate itself, via the `updateTaxCurrency` server action → `db.company.update({ tax, serviceFee })` | Only two booleans on `ShopBookingSetting`: `isTaxEnabled` / `isServiceFeeEnabled` — an on/off switch per shop, no rate value |

**Mechanism:** `Company.tax` and `Company.serviceFee` (`prisma/schema.prisma:636-657`) are single scalar columns — one value per company, not per shop. "Shop Supplies" is purely a display label for `serviceFee`; there is no separate `shopFee` column anywhere in the schema. The Financial tab never lets an admin type in a different rate for an individual shop — it only lets them toggle whether that one company-wide rate gets applied to that shop's bookings at all.

This is confirmed at checkout time in three places, all following the identical pattern `rate = isEnabled ? Number(company.tax_or_serviceFee) : 0`, then `amount = subtotal * rate / 100`:

- Live checkout preview: `src/app/subdomain/[subdomain]/components/booking/checkout/useCheckoutTotals.ts`
- Authoritative server calculation: `src/app/api/virtual-shop/service-booking/route.ts`
- Booking confirmation (Stripe/AuthorizeNet webhook, gift-card application): `src/services/confirmShopBooking.ts`

**Practical implication for QA/support:** changing "Tax Rate" or "Shop Supplies" in Settings → Estimates changes the rate for **every** virtual shop under that company simultaneously — there's no way to give two shops of the same company different tax/shop-fee percentages, only different on/off states.

### 6.4 Estimates tab's 5 statuses vs. the main dashboard Estimate's statuses — different concepts, coincidentally overlapping words

A fourth point of confusion: the Virtual Shop **Estimates** tab (All / Confirmed / Pending / Completed / Cancelled) is not the same thing as an Estimate's status under `/dashboard/estimate`, even though the label "Estimate" and a couple of status words are shared.

**What the Virtual Shop Estimates tab actually shows:** `ShopBooking` records (`EstimatesTab.tsx`, `EstimateCard.tsx`) — i.e., appointments/bookings made through the public storefront — filtered by a fixed, global Prisma enum:

```prisma
enum ShopBookingStatus { PENDING  CONFIRMED  COMPLETED  CANCELLED }
```

("All" is a UI-only aggregate, not a real enum value.) It's labeled "Estimate" only because every `ShopBooking` carries an attached `Invoice` of `type: "Estimate"` for the price breakdown shown on the card — the tab does not read that Invoice's own status/pipeline at all.

Trigger logic (`src/app/api/virtual-shop/service-booking/route.ts`, `.../deposit/route.ts`, `.../[id]/status/route.ts`):

- **Pending** — default at creation, when the shop requires a deposit and it hasn't been fully paid yet.
- **Confirmed** — set automatically when no deposit is required (or a gift card fully covers it), or once the customer completes deposit payment. Can also be set manually by shop staff.
- **Completed** / **Cancelled** — **manual only**, set by shop staff via the status dropdown on the card. Nothing in the codebase sets these automatically — there's no job-completion, no-show, or expiry logic driving them.

**What the main dashboard Estimate's "status" actually is:** there is **no fixed status enum** for Estimates at all. An Estimate is just an `Invoice` with `type: Estimate`, and its "status" is really its **pipeline column** (`Invoice.columnId → Column.title`) — a per-company, fully editable, free-text kanban stage (renameable/addable/removable via Manage Pipelines). The default seeded stages for this pipeline are:

```
Pending → In Progress → Completed → Delivered → Re-Dos → Cancelled
```

Note there's no "Confirmed" stage here (this pipeline tracks work progress, not deposit payment), and "In Progress"/"Delivered"/"Re-Dos" don't exist in the Virtual Shop's set — and since these are per-company editable rows rather than an enum, any company could rename or delete them entirely.

|                | Virtual Shop Estimates tab                         | Dashboard Estimate                                            |
| -------------- | -------------------------------------------------- | ------------------------------------------------------------- |
| Backing field  | `ShopBooking.status`                               | `Invoice.columnId → Column.title`                             |
| Type           | Fixed 4-value enum, identical across all companies | Per-company customizable text rows                            |
| Represents     | Deposit/payment + appointment lifecycle            | Work/sales pipeline stage                                     |
| Default values | Pending, Confirmed, Completed, Cancelled           | Pending, In Progress, Completed, Delivered, Re-Dos, Cancelled |

**Conclusion:** these are two unrelated fields on two different models that happen to share a couple of default status words ("Pending", "Completed", "Cancelled") by coincidence of seed text — not because either reads or derives from the other.

---

## 7. Notable implementation details for new developers

- There is an **orphaned duplicate component**, `VirtualShopConfigureList.tsx`, which reimplements much of the same create/edit form logic (including its own preview link and crop modal) but is **not wired into any route** — only `ShopForm.tsx` is live. Don't edit `VirtualShopConfigureList.tsx` expecting it to affect the real UI; it's dead code and a candidate for cleanup.
- Shared low-level components reused specifically for this feature: `ImageCropModal.tsx` (react-easy-crop wrapper), `ColorPicker.tsx`, a local `Select.tsx`, `FileUpload.tsx`, and the shared `SlimInput`/`SlimTextarea` controls. There is no WYSIWYG/rich-text editor anywhere in this feature — all long text fields are plain textareas with character limits.
- Domain for preview/live links is computed as `new URL(process.env.NEXT_PUBLIC_APP_URL).hostname` everywhere it's needed (list card, navbar dropdown) — there's no separate config value to keep in sync.

---

## 8. Open items worth confirming with product/QA

1. Should slug be truly editable independent of Store Name? Currently any manual slug edit is silently discarded on save.
2. Should the public subdomain API filter by `isActive` itself (defense in depth), rather than relying solely on the subdomain page component to enforce it?
3. Should removing a logo/banner in the form also delete the old S3 object, to avoid orphaned storage?
4. Is `VirtualShopConfigureList.tsx` safe to delete, or does it serve some other entry point not yet found?
