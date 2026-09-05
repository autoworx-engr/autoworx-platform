# Payout & Commission — QA Test Plan

**For:** QA team. No coding knowledge needed.
**Feature branch:** `sundim-payout`

This covers **everything** that changed in the payout, commission, salary,
attendance and work-order areas. Please run every section — several of these
changes affect how much money the system says an employee is owed, so a missed
bug here means someone gets paid the wrong amount.

---

## 1. What changed, in plain English

The system decides how much each employee earns. It was doing several things
wrong. Here is what was fixed:

**Commission (Sales staff only)**

1. Sales staff used to earn commission the moment a quote became an invoice.
   Now they earn it **only once the job is actually delivered** to the customer.
2. If a delivered job is moved back out of _Delivered_, the commission is **taken
   away again** automatically.
3. Commission is counted in the **month the job was delivered**, not the month it
   was quoted.
4. Only the **Sales** role can have a commission rate. Technicians, Managers and
   "Other" can no longer be given one.

**Salary (all roles except Admin)**

5. Salary periods now run from the employee's **joining date**. Join on the 20th,
   get paid on the 20th of each following month.
6. Salary is paid **only when a full period finishes**. It no longer appears at
   the start of the period before it has been worked.
7. **There is no half-payment.** A period pays its full amount or nothing.
8. If someone gets a **raise in the middle of a period**, that period is now paid
   **once**, at the **new** rate. Previously it was paid **twice** — once at the
   old rate and once at the new one.
9. Employees paid **hourly** now correctly show their previous month and their
   lifetime totals. These used to always show **zero**.
10. If an hourly employee's rate changes, past hours stay at the **old** rate.
    Previously the new rate was wrongly applied to all their past work.
11. Salary periods for people who start on the **29th, 30th or 31st** no longer
    slide later and later every month.

**The payout screen**

12. Everyone now sees **one** payout screen showing what applies to their role:
    - **Sales** — salary + commission
    - **Technician** — salary + job earnings
    - **Manager / Other** — salary only
13. Sales staff previously saw **no salary at all** on this screen — only
    commission. That is fixed.
14. Managers and "Other" no longer see an empty job-earnings section that was
    always zero.

**Clock in / breaks / attendance**

15. Only **hourly** employees can clock in or take breaks. Everyone else is
    blocked with a message.
16. Clocking in **twice on the same day** is blocked, and an admin/manager gets a
    notification asking them to review it.
17. When an admin edits someone's attendance times, **that employee is notified**.
18. The Clock In and Break buttons now show an **error message** when something is
    refused. They used to fail silently and look broken.

**Work orders**

19. New **Equally Distribute** control — set one total (as a **%** of the service
    price or a **fixed $ amount**) and it fills in each assigned technician's
    amount automatically. Every amount can still be edited by hand afterwards.

---

## 2. Before you start

Use a **staging / test environment**. Do not test this on live data.

You will need:

| What                                                             | Why                                          |
| ---------------------------------------------------------------- | -------------------------------------------- |
| One **Sales** employee with a commission rate (e.g. 10%)         | Commission tests                             |
| One **Technician** with an **hourly** salary                     | Clock-in, break, hourly tests                |
| One **Technician** with a **monthly** salary                     | Salary period tests                          |
| One **Manager** and one **"Other"** employee, both with a salary | Payout screen tests                          |
| A second Technician                                              | Equally Distribute splitting tests           |
| At least one work order with a service that has a price          | Equally Distribute tests                     |
| Admin access                                                     | To edit attendance and receive notifications |

**Ask a developer to help with:** setting an employee's joining date to a past
date, and changing a delivery date to a previous month. Some tests need these and
they cannot be done from the normal screens.

---

## 3. Commission tests

### TC-1 — Commission only counts after delivery

1. Create a quote for a customer assigned to your Sales employee. Convert it to an
   invoice. Leave it in **In Progress**.
2. Open Sales Reporting for that Sales employee.

**Expected:** no commission for this invoice. The total does **not** increase.

3. Move the invoice into the **Delivered** column.
4. Reload Sales Reporting.

**Expected:** commission now appears. It equals the invoice total × the
employee's commission rate. Example: a $1,000 invoice at 10% = **$100**.

### TC-2 — Commission is removed if the job leaves Delivered

1. Continue from TC-1 with the invoice in **Delivered** and commission showing.
2. Drag the invoice back to **In Progress**.
3. Reload Sales Reporting.

**Expected:** the commission **disappears**. The total drops back down.

### TC-3 — Commission survives moving to Completed

1. Move the invoice to **Delivered**, then to **Completed**.

**Expected:** commission is still there. Completed is a normal next step after
delivery and must not remove the money.

### TC-4 — Commission lands in the right month

1. Deliver an invoice. Ask a developer to set its **delivery date** to last month.
2. Reload Sales Reporting.

**Expected:** the commission shows under **Previous Month**, not Current Month.
The growth percentage between the months changes to match.

### TC-5 — Commission rate is Sales-only

1. Go to Add Employee. Choose role **Technician**.

**Expected:** there is **no Commission field** on the form at all.

2. Change the role to **Sales**.

**Expected:** the Commission field **appears**.

3. Enter 10, save. Reopen the employee.

**Expected:** commission is saved as 10.

4. Edit that employee and change the role to **Manager**. Save. Reopen.

**Expected:** the Commission field is hidden while Manager is selected, and the
stored commission is now **0**.

**Edge case:** switch back to Sales and set 10 again — it should save as 10 again.

---

## 4. Payout screen tests

Open an employee's profile page and look at the payout section (Previous Month,
Current Month, Year To Date).

### TC-6 — Sales sees salary AND commission

**Expected:** the breakdown lists **Salary** and **Commission**. There is **no**
"Job earnings" row. The headline figure equals salary + commission.

> This is the biggest visible change. Previously a Sales employee's salary was
> completely missing from this screen.

### TC-7 — Technician sees salary AND job earnings

**Expected:** breakdown lists **Salary** and **Job earnings**. There is **no**
Commission row. Headline = salary + job earnings.

### TC-8 — Manager and Other see salary only

**Expected:** breakdown lists **Salary** only. **No** Commission row and **no**
Job earnings row. Headline = salary.

> Previously these roles saw a job-earnings section that was permanently $0.

### TC-9 — Viewing someone else's payout shows THEIR figures

1. Log in as **Admin**.
2. Open a **Manager's** profile and note their salary figures.
3. Open a **different** employee's profile with a **different** salary amount.

**Expected:** each page shows that employee's own numbers. **Critical:** the
admin must never see their own salary displayed on someone else's page. If two
different employees show identical figures matching the admin's salary, **this is
a serious bug — report it immediately.**

### TC-10 — Percentages make sense

**Expected:** the "vs last month" percentage compares this month to last month
and points the right way (up arrow when higher, down when lower). When last month
was zero, no percentage is shown rather than a broken or infinite value.

---

## 5. Salary period tests

These are the money-critical ones. Take your time.

### TC-11 — Salary is not paid until the period ends

1. Set up an employee with a **monthly** salary whose period has **not** finished.

**Expected:** Current Month does **not** already show the full monthly salary. It
appears only once the period completes.

2. Repeat for a **bi-weekly** employee.

**Expected:** same — nothing until the two weeks are up.

> Previously monthly and bi-weekly showed the full amount immediately, on day one.

### TC-12 — Hourly builds up as hours are worked

**Expected:** an hourly employee's current figure grows as they clock hours. It
does **not** wait for a period to end. Hourly is deliberately different from the
others.

### TC-13 — Joining date drives the period

1. Ask a developer to set an employee's joining date to the **20th of last month**,
   with a monthly salary of a known amount (say $3,000).

**Expected:**

- The period runs from the **20th to the 19th** of the following month.
- Nothing is paid in the joining month — that period has not finished yet.
- The full $3,000 appears in the month the period **ends**.

**Edge case:** an employee joining on the **31st**. Their period must still run
once per month with no month skipped and no month paid twice, even through
February. Check several months in a row.

### TC-14 — A raise mid-period pays ONCE, at the new rate

**This was the worst bug. Please test it carefully.**

1. Employee on a monthly salary of **$3,000**.
2. Part-way through a period, change their salary to **$4,000**. Save.
3. Wait for / look at the month that period ends in.

**Expected:** that month shows **$4,000** — paid **once**, at the **new** rate.

**Must NOT happen:** **$7,000** (both amounts added together). That was the old
behaviour. If you see the two amounts summed, the bug has come back.

**Also check:** Year To Date does not double-count either.

### TC-15 — Hourly rate changes don't rewrite history

1. Hourly employee at **$20/hour**. Log some hours. Note the total.
2. Change their rate to **$30/hour**. Log some more hours in a later period.

**Expected:** the lifetime total = (old hours × $20) + (new hours × $30).

**Must NOT happen:** all hours valued at $30. The earlier work must stay at the
rate that applied when it was done.

### TC-16 — Hourly previous month and lifetime totals are real

For an hourly employee with hours in more than one month:

**Expected:**

- **Previous Month** shows a real figure — **not $0**.
- **Year To Date** covers all their history, not just this month.
- Break time is still deducted from paid hours.

> Both of these used to be hardcoded to zero.

### TC-17 — Timezone does not shift the salary start date

1. Make sure the company timezone is **different** from the server's timezone —
   this bug is invisible when they match. Ask a developer to confirm.
2. Add or change an employee's salary.

**Expected:** the salary starts on the date you actually chose — not the day
before or after.

### TC-18a — Weekly / bi-weekly periods are always the same length

1. Employee on a **weekly** salary. Check their pay periods across a stretch of
   several months, especially **March** and **November** (when the clocks change).

**Expected:** every period is exactly **7 days**. None is 8 days, and the pay day
does not drift to a later weekday over time.

2. Repeat with a **bi-weekly** employee — every period exactly **14 days**.
3. Also check an employee whose joining date was recorded with a **time of day**
   (not midnight). Their first period must still be 7 days, not 8.

**Why this matters:** an 8-day period shifts every following pay date by a day, and
it happened twice a year. Over time the pay day slides away from where it should be.

### TC-18b — "Year To Date" only counts this year

For a **Technician** who has job earnings from a **previous** year:

**Expected:** the Year To Date figure covers **this calendar year only**. Work from
last year must **not** be included. Compare against salary in the same card — both
must cover the same span.

### TC-18 — Job earnings exclude unfinished work

1. Find or create a technician job that has a closing date but is **not** marked
   Complete.

**Expected:** it is **excluded** from the technician's lifetime job earnings.
Monthly figures should be unchanged by this — they already excluded it.

---

## 6. Clock in, break and attendance tests

Test each of these on **both** the web app and the **mobile app**. The mobile app
used to skip these rules entirely, so it must be checked separately.

### TC-19a — Employees with no salary set up (IMPORTANT)

**Check this before sign-off — it can lock people out of the system.**

1. Find an employee who has **no salary configured at all** (no salary type or
   amount saved), and who normally clocks in.
2. Try to Clock In as them.

**Expected:** they are blocked, because the system can only tell hourly staff apart
by their salary record.

**Report this as a release blocker if it affects real staff.** Anyone who clocks in
daily but has no salary set up will be unable to clock in the day this ships. Ask a
developer to list these employees before release so salaries can be added first.

### TC-19 — Only hourly staff can clock in

1. As a **non-hourly** employee (monthly/weekly salary), tap Clock In.

**Expected:** clock-in is refused with a clear message saying it is for hourly
employees only. **No attendance record is created.**

2. As an **hourly** employee, Clock In.

**Expected:** works normally.

3. Repeat both on **mobile**.

**Expected:** same behaviour and a clear message.

### TC-20 — Only hourly staff can take breaks

Same as TC-19 but using the Break button, web and mobile.

### TC-21 — Cannot clock in twice in one day

1. As an hourly employee, clock in, then clock out.
2. Try to clock in again the **same day**.

**Expected:**

- Blocked, with a message saying an admin has been notified to approve it.
- The **Admin** and **Manager** both receive a **"Duplicate Clock In Request"**
  notification naming the employee.

3. Repeat on **mobile** — same block, same notification.

**Edge case:** the next calendar day, clock-in works normally again. Use the
**company's** timezone to decide when "the next day" starts, not your own.

### TC-22 — Employee is told when their attendance is edited

1. As Admin, edit an employee's clock-in or clock-out time.

**Expected:** that employee receives an **"Attendance Updated"** notification
stating the new time.

### TC-23 — Buttons show errors instead of doing nothing

**Expected:** whenever a clock-in or break is refused, a visible error message
appears. The button must never look like it silently did nothing.

> This was a real problem — the buttons previously swallowed all failures.

---

## 7. Equally Distribute (work orders)

Open a work order, expand a service, and find the **Equally Distribute** bar above
the technician names.

### TC-24 — Splitting a fixed amount

1. Assign **3** technicians to the service.
2. Choose the **$** mode, enter **100**, press **Apply**.

**Expected:**

- A green **"✓ Applied to 3 technicians"** confirmation.
- The three amounts are **33.34, 33.33, 33.33** — they add up to **exactly
  $100.00**, not $99.99.

### TC-25 — Splitting a percentage

1. On a service priced at **$500**, choose **%** mode, enter **60**, press Apply.

**Expected:** total distributed is **$300** (60% of 500), split evenly between the
assigned technicians.

**Important:** the percentage applies to the **service** price only — never to
parts or materials. If the job has $500 service + $200 parts, 60% must be **$300**,
not $420.

### TC-26 — Amounts can still be edited by hand

1. After applying a split, open one technician and change their amount manually.

**Expected:** your manual amount sticks. It is not overwritten unless you press
Apply again.

### TC-27 — Single technician

With only **one** technician assigned:

**Expected:** the control still works and gives them the whole amount. The
message should read naturally (e.g. "$300.00 to [name]"), not "÷ 1 each".

### TC-28 — Validation

Try each of these and confirm a clear error appears and **nothing is saved**:

| Input                                     | Expected message                    |
| ----------------------------------------- | ----------------------------------- |
| **%** mode, enter **150**                 | Percentage cannot exceed 100        |
| **%** mode on a service with **no price** | Explains there is no service amount |
| A **negative** number                     | Value cannot be negative            |
| Letters / empty                           | Asks for a number                   |

### TC-28a — Interrupted distribution

1. Assign 3 technicians and apply a split. While it is saving, drop the connection
   (turn off wifi) or otherwise interrupt it.

**Expected:** a red error appears — **not** a green tick.

**Known behaviour:** technicians are saved one at a time, so an interruption
part-way can leave **some** amounts updated and others not. Re-open the work order,
check the amounts, and press Apply again to correct them. Please report the amounts
you saw if they look wrong, but this partial state is a known limitation.

### TC-29 — Confirmation behaves correctly

**Expected:**

- The confirmation appears **only after a successful save**.
- It disappears after a few seconds, and immediately if you change the value or
  switch between % and $.
- If the save fails, you see a **red error** instead — never a green tick.

---

## 8. Role switching

### TC-30 — Warning when changing an employee's role

1. Edit an employee and change their role.

**Expected:** a yellow/amber warning appears naming the old and new role and
explaining the consequence:

- Sales → anything else: warns commission will be cleared.
- Anything else → Sales: says commission will start.

2. Change the role back to the original.

**Expected:** the warning disappears.

---

## 9. Regression checks — must still work

These were not meant to change. Confirm they did not break.

- [ ] The technician dashboard payout figures still load — **including on mobile**.
- [ ] The Monthly Payout box on the main dashboard still shows hours worked and
      the pay period dates.
- [ ] Technician Reporting page still loads and shows payouts.
- [ ] Adding, editing and deleting technicians on a work order still works.
- [ ] Clock out still works normally for hourly staff.
- [ ] Existing notifications (other than the two new ones) still arrive.
- [ ] The employee list, add and edit forms all still save correctly.

---

## 10. Known limitations — not bugs

Please do **not** raise these as defects:

1. **Duplicate clock-in has no approve/reject queue.** The admin is notified and
   can correct the record manually through the attendance editor, but there is no
   Approve button yet. This was agreed.
2. **The two new notifications cannot be switched off** in notification settings.
   They always send. This was a deliberate decision — the alternative would have
   made them silently never arrive.
3. **Old invoices delivered before this release** may have no delivery date
   recorded, so they will not pay commission. It was agreed that only new invoices
   need to work.
4. **Salary start dates recorded before this release** may be off by a few hours
   from the timezone bug. Only newly saved salaries are guaranteed correct.
5. **Applying a split saves technicians one at a time.** An interruption mid-save
   can leave some updated and some not — see TC-28a.
6. **Admin users also see a salary-only payout card.** Payout is aimed at non-Admin
   roles; showing Admins their own salary is harmless and not a defect.

---

## 11. How to report a problem

For anything that fails, please include:

- The test case number (e.g. TC-14)
- The employee's **role** and **salary type** (hourly / weekly / bi-weekly / monthly)
- Their **joining date** and **salary amount**
- What number you **expected** vs what you **saw**
- Web or mobile
- A screenshot of the payout screen or the error

**Treat any wrong money figure as high priority**, even if it looks small — the
same mistake usually repeats across every employee.
