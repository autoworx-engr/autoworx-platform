# Payout & Commission Overhaul

**Branch:** `sundim-payout` (branched from `sundim`)

> `sundim/payout` is not a valid branch name here — a branch named `sundim` already
> exists, so git cannot also create `sundim` as a directory in the ref tree
> (`fatal: cannot lock ref 'refs/heads/sundim/payout'`). Hence `sundim-payout`.

**Typecheck:** `npx tsc --noEmit -p tsconfig.json` → **0 errors project-wide.**

**Nothing is committed.** 24 modified files, 6 new, 2 deleted.

**QA:** see `docs/PAYOUT_QA_TEST_PLAN.md` — the same work written for testers, with
no code references.

---

## Confirmed payroll rules

These came from the spec PDFs plus direct answers, and everything below is built
against them.

| Rule                                                                                                             | Source                                                           |
| ---------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| Commission is earned **once an invoice is delivered**, not on conversion                                         | FAQ Q2, Journey pp.4 & 8                                         |
| Commission applies to the **Sales role only**                                                                    | FAQ Q1                                                           |
| Technicians earn from the **service portion** only, not parts/materials                                          | FAQ Q6                                                           |
| Salary cycles are anchored to the employee's **join date** — join Sept 20, get the full monthly amount on Oct 20 | Direct answer                                                    |
| **No proration.** A cycle pays in full, and only when it **completes**                                           | Direct answer                                                    |
| Hourly is the exception — it accrues continuously as hours are worked                                            | Direct answer                                                    |
| Equally Distribute auto-fills each technician's amount, and the admin **can still override** any of them         | Direct answer (resolving the FAQ Q4 / Journey p.6 contradiction) |
| The **Delivered** pipeline column is fixed and static — it cannot be renamed or deleted                          | Direct answer                                                    |

---

# Phase 1 — Money math

| #   | Area                          | File                                    | What was wrong                                                     |
| --- | ----------------------------- | --------------------------------------- | ------------------------------------------------------------------ |
| 1   | Commission timing             | `getSalesReport.ts`                     | Commission earned on _conversion_, not _delivery_                  |
| 2   | Job earnings                  | `lib/payout.ts`                         | Total earnings counted non-complete jobs                           |
| 3   | Commission data               | `employee/add.ts`, `employee/update.ts` | Non-Sales roles stored a commission %                              |
| 4   | Monthly salary                | `lib/salaryPayout.ts`                   | Anchor day 29–31 overflowed and drifted forever                    |
| 5   | Salary history                | `lib/salaryHistoryManager.ts`           | Start date shifted by the UTC offset on write                      |
| 6   | Hourly salary                 | `getSalaryPayouts.ts`                   | Previous-month and total payout hardcoded to `0`                   |
| 7   | Early payment                 | `lib/salaryPayout.ts`                   | MONTHLY/BI_WEEKLY paid in full before the cycle closed             |
| 8   | Commission gate               | `getSalesReport.ts`                     | Gated on `deliveredAt` rather than the invoice's status            |
| 9   | **Double-pay**                | `lib/salaryPayout.ts`                   | A mid-cycle raise paid the same month twice                        |
| 10  | Payout composition            | `Payout.tsx` + callers                  | Sales saw no salary; Manager/Other saw an always-zero work section |
| 11  | Weekly/bi-weekly cycle length | `lib/salaryPayout.ts`                   | 8-day cycles across DST and on the first cycle                     |
| 12  | YTD scope mismatch            | `Payout.tsx`                            | "Year To Date" summed YTD salary with **all-time** job earnings    |

### 1. Commission is earned on delivery, not conversion

**File:** `src/app/(dashboard)/dashboard/reporting/salesreporting/getSalesReport.ts`

All 18 occurrences of `inv.convertedAt` (6 filter blocks × 3 lines) are now
`inv.deliveredAt`. Consequences, all intended:

- Commission is gated on delivery.
- Commission is bucketed by the month it was _earned_, not the month it was converted.
- **Reversal is automatic.** `updateInvoiceStatus.ts` sets `deliveredAt = null` when an
  invoice leaves _Delivered_, so the commission disappears from the report on its own.
  Moving to _Completed_ leaves `deliveredAt` untouched, so commission is retained.

> Superseded by fix #8 below — the gate now tests the invoice's status.

### 2. Total job earnings counted incomplete jobs

**File:** `src/lib/payout.ts` → `calculateTotalEarnings`

```diff
- if (history.dateClosed) {
+ if (history.status === "Complete" && history.dateClosed) {
```

The three other earnings functions in that file already required
`status === "Complete"`. Only the all-time total didn't, so lifetime technician
earnings were inflated by jobs that had a close date but were never completed.

### 3. Commission stored on non-Sales employees

**Files:** `src/actions/employee/add.ts`, `src/actions/employee/update.ts`

```diff
- commission,
+ commission: type === "Sales" ? commission : 0,
```

Zeroed at the source, including when an employee is **switched** off Sales.

### 4. Monthly anchor-day overflow

**File:** `src/lib/salaryPayout.ts` → `calculateMonthlyForPeriod`

`new Date(2026, 1, 31)` does not throw — it silently rolls forward to March 3rd. For
any salary anchored to day 29–31 each cycle pushed the next one further out, and the
error **compounded and never self-corrected**. Added `clampDayToMonth`.

Before (anchor = Jan 31) — note the 31-day "February" and the drift:

```
Jan 31 → Mar 02    Mar 03 → Apr 02    ...
```

After — contiguous, one cycle per calendar month, recovering to the 31st where it exists:

```
Jan 31 → Feb 27    Feb 28 → Mar 30    Mar 31 → Apr 29    Apr 30 → May 30
```

Anchors of 1–28 are mathematically unchanged.

### 5. Salary start date corrupted on write

**File:** `src/lib/salaryHistoryManager.ts` → `manageSalaryHistory`

```diff
- const timezoneAdjustedDate = new Date(
-   effectiveStartDate.toLocaleString("en-US", { timeZone: timezone }),
- );
+ const timezoneAdjustedDate = startDate || new Date();
```

`new Date(d.toLocaleString("en-US", { timeZone }))` does **not** convert a timezone —
it formats the instant as a local-looking string and re-parses it as server-local time,
i.e. it _shifts the instant_ by the UTC offset. That can cross midnight and change the
recorded start **day**, which shifts every pay cycle derived from it.

> **Fixes new writes only.** See [Data caveats](#data-caveats).

### 6. Hourly previous-month and total payout hardcoded to zero

**File:** `src/actions/dashboard/data/getSalaryPayouts.ts`

The hourly branch returned literal placeholders (`previousMonthPayout: 0`,
`totalPayout: currentPeriodPayout`). `calculateSalaryForPeriod` already had a working
`case "HOURLY"` — the local `calculateHourlyPayout` was a redundant fork of the same
clock-in/break math. Collapsed it; a small `getHourlyPeriodStats` now returns only what
the shared path doesn't (hours worked, pay-period boundaries).

- Hourly employees get real previous-month and all-time figures.
- **Mid-history rate changes are applied.** The old code multiplied _all_ past hours by
  _today's_ rate.
- The `timezone` argument is now actually used; the old code accepted it and then
  computed month boundaries in server-local time.

Response shape unchanged. Also removed two pre-existing dead imports.

### 7. MONTHLY and BI_WEEKLY paid before the cycle closed

**File:** `src/lib/salaryPayout.ts` → `calculateSalaryCurrentMonthEarnings`

Two special-cases returned the full salary amount as soon as a period _started_:

```ts
// For monthly salary, always return the monthly amount for current month
// regardless of completion
if (activeSalary.salaryType === "MONTHLY") { ... }
```

That contradicts the "paid on completion" rule, and made MONTHLY/BI_WEEKLY figures
incomparable with HOURLY/WEEKLY, which built up through the period. Both removed — the
cycle loop already handled completion correctly via `if (monthEnd > new Date()) break`.

### 8. Commission gated on status, not the delivery timestamp

**File:** `src/app/(dashboard)/dashboard/reporting/salesreporting/getSalesReport.ts`

All six filter blocks now require the invoice to sit in the **Delivered** column;
`deliveredAt` is kept purely as the _date_ used to bucket commission by month,
because column membership carries no history. Both invoice queries pull the column
in via `include: { column: { select: { title: true } } }`.

Matching on the title is safe — _Delivered_ is a fixed, static column that cannot be
renamed or deleted. Note there is no server-side guard in `updateColumn`/`deleteColumn`
enforcing that; it currently rests on the UI.

Verified the relation is genuinely typed rather than silently `any` by introducing a
deliberate typo (`column?.titleTYPO`), confirming one TS error, then reverting.

### 9. A mid-cycle raise paid the month twice

**File:** `src/lib/salaryPayout.ts`

Each `SalaryHistory` row re-anchored its **own** cycle timeline, so a raise mid-month
produced two overlapping cycles and paid both:

```
$3000/mo, raised to $4000 on Mar 15
  period $3000 (from Jan 1)  -> $3000
  period $4000 (from Mar 15) -> $4000
  March total: $7000
```

Restructured to **one** timeline anchored to `User.joinDate`, with `SalaryHistory`
supplying only the **rate**. A cycle pays once, on completion, at the rate in force
when it **ended** (the agreed rule).

- `calculateSalaryForPeriodWithHistory` now splits HOURLY (accrues per rate span, from
  real clock records) from fixed types (one cycle walk).
- New `calculateFixedSalaryForPeriod`, `salaryActiveAt`, `cycleEndFor`.
- Removed `calculateSalaryForPeriod`, `calculateWeeklyForPeriod`,
  `calculateBiWeeklyForPeriod`, `calculateMonthlyForPeriod`. File: 476 → 343 lines.

**A second bug surfaced while verifying this one.** The first draft counted a cycle in
any period it _overlapped_. Since payment happens on completion, a cycle belongs to the
period containing its **end** — the overlap version paid a Sep-20 joiner in September
and double-paid month-end anchors. Corrected to `cycleEnd >= periodStart && cycleEnd <= periodEnd`.

Verified by simulating the logic against known cases:

```
PASS  March, $3000->$4000 raise on Mar 15 (was $7000): $4000
PASS  February, no change (exactly one cycle): $3000
PASS  September (joined Sep 20, cycle not finished): $0
PASS  October (cycle Sep20-Oct19 completes): $3000
PASS  12 months of $1000 = 12 cycles, none skipped/doubled
PASS  Jan-May with a Dec-31 anchor (5 cycles, no drift)
```

WEEKLY and BI_WEEKLY independently check out at 52 and 26 cycles per year.

**Limitation:** cycle _shape_ uses the salary type active at the cycle start, so a
mid-history change of salary **type** (not amount) reshapes subsequent cycles rather
than the current one. Amount changes — the common case — are exact.

### 10. One payout composition for every non-Admin role

**Files:** `Payout.tsx`, `UnifiedPayoutCard.tsx`, `EmployeeInformation.tsx`,
`technicianreporting/page.tsx`, new `src/lib/commissionPayout.ts`

`EmployeeInformation.tsx` forked on role, sending Sales to a separate
`PayoutSales.tsx` that showed **commission only** — a Sales employee's salary never
appeared. Everyone now renders `Payout`, which composes:

- Sales → salary + commission
- Technician → salary + job earnings
- Manager / Other → salary only

`UnifiedPayoutCard`'s breakdown gained `commission`, `showWorkBased` and
`showCommission`, so roles no longer render rows that are structurally always zero.
Deleted `PayoutSales.tsx` and `SalaryPayout.tsx` (the latter was already dead).

**`PayoutSales` held a third, divergent commission calculation** — leads in a
"Converted" column filtered by `assignedDate`, ignoring delivery _and_ the commission
rate. Rather than add a fourth, commission now lives in `src/lib/commissionPayout.ts`,
including the fallback-client merge (leads whose `Client` rows aren't nested under
them); without that merge those invoices silently drop out of commission.

> `getSalesReportData` still has its own inline copy because it is hardcoded to
> `getUser()`. Folding it onto `commissionPayout.ts` is worthwhile follow-up.

**Caught during review:** the first draft read the employee id off `workInfo[0]`, which
is empty for non-technicians — and `checkIfUserHasSalary` falls back to the **session**
user. An admin opening a Manager's payout page would have seen **their own salary**
rendered as the Manager's. `employeeId` is now passed explicitly.

### 11. Weekly and bi-weekly cycles ran 8 days across DST

**File:** `src/lib/salaryPayout.ts` → `cycleEndFor`

Found while auditing, after the cycle rewrite. The cycle end was computed by adding
`days * 24 * 60 * 60 * 1000` milliseconds. Two failures:

- **DST.** Adding 7×24h across a clock change lands an hour off; the subsequent
  `setHours(23,59,59,999)` then rounds it onto the _next_ day, producing an 8-day
  cycle. This happens **twice a year**, and each occurrence permanently shifts every
  later boundary.
- **Time-of-day on the anchor.** A `joinDate` of `Jan 15 10:30` made the very first
  cycle 8 days, shifting the whole timeline by a day.

```
before, TZ=America/New_York
  Thu Jan 15 -> Thu Jan 22   span=8d   <-- 10:30 join
  Sun Mar 08 -> Sun Mar 15   span=8d   <-- spring forward
```

Replaced with local-calendar arithmetic (`new Date(y, m, d + days - 1)`), which is
DST-safe and handles month/year rollover, and the anchor is now normalised to
midnight. Verified across both DST transitions, a year boundary, and bi-weekly:
all cycles are exactly 7 or 14 days, and a weekly salary pays 52 times in 2025.

### 12. "Year To Date" mixed year-scoped and all-time figures

**File:** `Payout.tsx`

`calculateTotalEarnings` has no date filter — it is **all-time**. Salary and
commission totals are both year-ranged, so the YTD card was summing YTD salary +
YTD commission + _lifetime_ job earnings. Technician job earnings are now filtered
to the same year window before summing.

---

# Phase 2 — Features from the spec

All were **missing entirely**, not broken.

| Feature                                   | Implementation                                                                                                                                                                                                                                        |
| ----------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Equally Distribute**                    | New `components/workorder-modal/EquallyDistribute.tsx` — one input with a **% / $** toggle, auto-splits across assigned technicians and auto-fills each amount, each still individually editable. % applies to the service portion (`hours × charge`) |
| **Clock-in restricted to hourly**         | `actions/dashboard/clockIn.ts` **and** `api/dashboard/clock-in/route.ts`                                                                                                                                                                              |
| **Duplicate same-day clock-in**           | Blocked; admin/manager notified; employee told approval is pending. Both web and mobile                                                                                                                                                               |
| **Break restricted to hourly**            | `actions/dashboard/break.ts` **and** `api/dashboard/break/start/route.ts`                                                                                                                                                                             |
| **Attendance edit notifies employee**     | `actions/employee/updateAttendanceTime.ts`                                                                                                                                                                                                            |
| **Role-switch warning**                   | New `employee/components/RoleChangeWarning.tsx`, states the consequence per direction                                                                                                                                                                 |
| **Commission field hidden for non-Sales** | Both the add (`Lists/NewEmployee.tsx`) and edit (`EditEmployeeModalBody.tsx`) forms                                                                                                                                                                   |

Supporting: new `src/lib/employeeSalaryType.ts` (`isHourlyEmployee`), and an optional
`onTypeChange` callback on the shared `SelectEmployeeType`.

### Three traps found while building these

1. **The mobile app bypasses the server actions.** `api/dashboard/clock-in/route.ts`
   calls `db.clockInOut.create` directly, so gating only the web action would have left
   mobile able to clock in non-hourly staff and create duplicates. Both routes gated.

2. **A new `NotificationType` enum value would have been dead on arrival.**
   `sendUserNotification.ts` looks up a settings row for the type; with no row,
   `setting` is null and **nothing sends, with no error**. Adding
   `DUPLICATE_CLOCK_IN`/`ATTENDANCE_EDITED` would need a migration _plus_ seeding
   settings for every existing user. Decision: **omit `type`**, taking the
   `push_enabled: true` path so these always send. Trade-off — they aren't toggleable
   in notification settings.

3. **Both attendance buttons swallowed failures.** They only handled `res.success`, so
   the new gates would have produced a dead button with no message. `errorToast` added
   to `AttendanceButtonsBox.tsx` and `BreakButton.tsx`.

### Known limit

The duplicate clock-in **notifies** an admin but there is no approve/reject queue —
that needs a new Prisma model and migration. In the meantime the admin can correct the
record through the existing attendance editor.

---

## Open bug — a mid-cycle raise double-pays

**Not introduced by this branch**, but now more visible: fix #7 removed the special-case
that was masking it for the current month. Previous-month and YTD figures have been
wrong all along.

```
$3000/mo employee, raised to $4000 on Mar 15
  period $3000 (from Jan 1)  -> $3000
  period $4000 (from Mar 15) -> $4000
  March total: $7000
```

Each `SalaryHistory` row re-anchors its **own** cycle timeline and counts a full cycle
overlapping March, so one month is paid twice.

**Root cause is the anchor.** The code anchors cycles to the salary-history start date;
the rule is that they follow the **join date**. Two consequences:

1. An employee who joined Sept 20 but was entered into the system on Oct 5 anchors to
   Oct 5 — first payment Nov 5 instead of Oct 20. (`addEmployee` calls
   `manageSalaryHistory` with no `startDate`, so it defaults to _now_, while `joinDate`
   is stored separately.)
2. Every raise creates a new anchor, producing the double-pay above.

**The fix:** one timeline anchored to `joinDate`, iterated once, with `SalaryHistory`
supplying only the **rate** for each cycle rather than its own boundaries.

**Blocked on one decision:** when a cycle spans a raise — cycle Mar 20 → Apr 19, raise
on Apr 1 from $3000 to $4000 — does that cycle pay **$3000** (rate at cycle start) or
**$4000** (rate at cycle end)? No proration, so it is one or the other. Recommendation:
**rate at cycle end**.

---

## How to test

### Setup

```bash
git checkout sundim-payout
npm install
npx tsc --noEmit -p tsconfig.json   # expect 0 errors
npm run dev
```

Use a **staging / non-production** database. Test with at least four employees — one
each of Sales, Technician, Manager, Other — and at least one hourly and one monthly
salary.

### T1 — Commission gates on delivery

_Reporting → Sales Reporting_, with a Sales employee assigned to an invoice.

1. Convert an estimate to an invoice, leave it in **In Progress**.
   → Commission does **not** appear.
2. Move it to **Delivered**. → Commission **appears**, in the delivery month's bucket.
3. Move it back to **In Progress**. → Commission **disappears** (reversal path).
4. Move to **Delivered**, then **Completed**. → Commission is **retained**.

### T2 — Month bucketing

Deliver an invoice, then set its `delivered_at` back to the previous month in the DB.

- Expect the amount in the **previous month** column.
- Expect the month-over-month growth percentage to change accordingly.

### T3 — Total job earnings exclude incomplete jobs

Find or create a technician job with `dateClosed` set but `status != "Complete"`.

- Expect it **excluded** from the all-time total.
- Expect current/previous-month figures **unchanged** — they already filtered on status,
  so this checks for a regression.

### T4 — Commission cleared for non-Sales roles

1. Add a **Technician** — the Commission field should now be **hidden**. Save.
   → `user.commission` is **0**.
2. Add a **Sales** employee with commission `10`. → stored as **10**.
3. Edit that employee, switch to **Manager**. → the warning banner appears, the
   Commission field disappears, and after save `user.commission` is **0**.
4. Switch back to Sales, set `10`. → stored as **10**.

### T5 — Monthly anchor-day overflow

Create a **MONTHLY** salary whose start date is the **31st**, then check several
consecutive months.

- One cycle per calendar month — none skipped, none doubled.
- Contiguous across a Feb / leap-year boundary.

Repeat with the **30th** and the **15th**. The 15th is the control and must match `main`.

The date math can be checked without the app:

```bash
npx tsx -e '
const clampDayToMonth = (y:number,m:number,d:number)=>Math.min(d,new Date(y,m+1,0).getDate());
let y=2026,m=0; const startDay=31; let prevEnd:Date|null=null;
for(let i=0;i<6;i++){
  const s=new Date(y,m,clampDayToMonth(y,m,startDay));
  const nm=m===11?0:m+1, ny=m===11?y+1:y;
  const e=new Date(ny,nm,clampDayToMonth(ny,nm,startDay)-1); e.setHours(23,59,59,999);
  console.log(s.toDateString(),"->",e.toDateString(),
    prevEnd?`gap ${(s.getTime()-prevEnd.getTime())/1000}s`:"");
  prevEnd=e; m=nm; y=ny;
}'
```

Every gap must print `gap 0.001s` — cycles are contiguous, `monthEnd` lands on
`23:59:59.999`, and the next starts 1ms later. Any other value means the cycles overlap
(a month paid twice) or leave a hole (a month unpaid).

### T6 — Salary start date is no longer shifted

1. Make the server timezone and the company timezone **different** — the bug is
   invisible when they match.
2. Add or edit an employee and set a salary.
3. Inspect the new `SalaryHistory.startDate` → equals the moment you saved, not offset
   by the UTC offset, and not on the adjacent day.

### T7 — Hourly previous-month and total

For an **HOURLY** employee with records spanning two months (_Dashboard → Monthly
Payout_, and the technician analytics API):

- `previousMonthPayout` is a real figure, no longer `0`.
- `totalPayout` covers all time.
- `totalHours` and the pay-period start/end still render; break time still deducted.

Rate-change check — the important one:

1. Rate `20`, clock hours in month A. 2. Change to `30`, clock hours in month B.
2. `totalPayout` must be `(hours_A × 20) + (hours_B × 30)`. The old code returned
   `(hours_A + hours_B) × 30`.

### T8 — Salary pays only on completed cycles

For a **MONTHLY** employee whose cycle has not yet closed:

- "Current Month" should **not** already show the full salary. It appears once the cycle
  completes. Same for **BI_WEEKLY**.
- HOURLY should still accrue continuously.

### T9 — Equally Distribute

On a work order with a service line and **2+ technicians assigned** (the control is
hidden below two):

1. Toggle **$**, enter `100`, Apply → each of 3 technicians gets `33.34 / 33.33 / 33.33`
   (the extra cent goes to the first — the shares must sum to exactly 100).
2. Toggle **%**, enter `60` on a service worth `$500` → total `$300`, split evenly.
3. Override one technician's amount manually → the override sticks and is not
   recalculated.
4. Enter `150` in **%** mode → rejected, "Percentage cannot exceed 100."
5. Use **%** on an item with no service amount → rejected with an explanation.
6. Enter a negative or non-numeric value → rejected.

### T10 — Clock-in and break restricted to hourly

1. As a **non-hourly** employee, click Clock In → **error toast**, no record created.
2. Same on the **mobile app** → HTTP 403 with the same message.
3. As an **hourly** employee → clock-in succeeds.
4. Try **Break** as non-hourly → error toast; hourly → succeeds.

### T11 — Duplicate same-day clock-in

1. Clock in as an hourly employee, clock out.
2. Try to clock in again the same day → blocked, with the approval message.
3. Admin and Manager both receive a **Duplicate Clock In Request** notification.
4. Repeat on the mobile app → HTTP 409, same notification.
5. Next calendar day (company timezone) → clock-in works normally.

### T12 — Attendance edit notifies the employee

Edit an employee's clock-in or clock-out time as an admin.
→ That employee receives an **Attendance Updated** notification naming the new time.

### T13 — Role-switch warning

Open an employee and change the role.
→ An amber banner appears naming the old and new role and the consequence. Sales→other
warns commission will be cleared; other→Sales says commission starts. No banner when
the role is unchanged.

### T14 — Regression sweep

These consume `getSalaryPayouts`:

- `src/app/(dashboard)/dashboard/components/box/MonthlyPayoutBox.tsx`
- `src/app/api/dashboard/technician/analytics/route.ts` (mobile reads this)
- `src/actions/dashboard/data/getTechnicianInfo.ts`

Also confirm in the **mobile app** that technician payout figures still render — the
analytics route passes the whole object through.

---

## Data caveats

Pre-existing data conditions the code does **not** retroactively repair.

1. **Invoices in _Delivered_ with a null `delivered_at`** — the release gate. Commission
   is now keyed off `deliveredAt`, so these silently lose it on deploy.

   ```sql
   SELECT COUNT(*) FROM "Invoice" i
   JOIN "Column" c ON c.id = i.column_id
   WHERE c.title = 'Delivered' AND i.delivered_at IS NULL;
   ```

   **Resolved by decision: no backfill.** Only invoices delivered from this release
   onward need to pay commission, so this no longer gates the release.

2. **`SalaryHistory.startDate` rows written before fix #5 are still shifted** by the
   company's UTC offset. Rows where the shift crossed midnight have the wrong start
   _day_, offsetting every derived cycle. Needs sizing before deciding on a correction.

3. **Non-Sales employees with a non-zero `commission` already stored.** Fix #3 prevents
   new ones; existing rows persist until next save.

4. **Employees with no `SalaryHistory` row can no longer clock in or take breaks.**
   `isHourlyEmployee` returns false when no active salary exists, so the new gate
   blocks them. This is spec-correct but is a **workflow break on deploy** if such
   employees exist. Count them first:

   ```sql
   SELECT u.id, u."firstName", u."lastName", u."employeeType"
   FROM "User" u
   LEFT JOIN "SalaryHistory" sh
     ON sh.user_id = u.id AND sh.is_active = true
   WHERE sh.id IS NULL AND u.role = 'employee';
   ```

   If anyone who clocks in daily appears here, give them a salary record before
   release — or the gate will lock them out on day one.

   ```sql
   SELECT id, "employeeType", commission FROM "User"
   WHERE "employeeType" != 'Sales' AND commission > 0;
   ```

---

## Open items

1. **Run a full `next build`.** `npx tsc --noEmit` is clean, but a build was not
   completed — it was started and killed because it clobbers `.next` and breaks a
   running dev server.

2. **Fold `getSalesReportData` onto `commissionPayout.ts`** so there is one commission
   implementation rather than two. It is hardcoded to `getUser()` today.

3. **`EditEmployeeModalBody.tsx` is 554 lines**, over the 250-line project limit. It was
   already 543 before this branch; the role-change banner was extracted rather than
   inlined, but the file still needs its own refactor.

4. **Optional — approve/reject queue for duplicate clock-ins.** Currently blocks and
   notifies; a real workflow needs a new Prisma model and migration.

5. **Optional — a server-side guard** preventing the _Delivered_ column from being
   renamed or deleted, since commission now keys off its title.
