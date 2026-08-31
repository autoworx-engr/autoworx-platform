# AutoWorx Pipeline Stages

A high-level guide to what each pipeline stage means and what makes a card move.

---

## The two pipelines

|             | **Sales Pipeline**                        | **Shop Pipeline**              |
| ----------- | ----------------------------------------- | ------------------------------ |
| Tracks      | People who enquired but haven't committed | Work the shop agreed to do     |
| One card is | A **Lead**                                | An **Estimate / Work Order**   |
| Answers     | "Will we win this job?"                   | "Where is this car right now?" |
| Owner       | Sales / front desk                        | Service advisors, technicians  |

_(A third board, **Team Pipeline**, groups the same shop jobs by technician. It has no stages of its own.)_

Stages are **not fixed** — each company gets the default set at signup and can add more. But the default stage names carry real logic, so **renaming or deleting them breaks things**.

---

## Sales Pipeline

| Stage           | What it means                            | How it gets there                            | When to move on                                    |
| --------------- | ---------------------------------------- | -------------------------------------------- | -------------------------------------------------- |
| **New Leads**   | Nobody has touched this enquiry yet      | **Automatic** — every new enquiry lands here | Once someone has actually contacted the customer   |
| **Ongoing**     | A salesperson is talking to the customer | Manual                                       | Once a quote is out and the customer is interested |
| **Opportunity** | Quoted, likely to win                    | Manual                                       | When the customer commits — or walks away          |
| **Converted**   | **Deal won**                             | **Automatic** — see below                    | Finished. Work now lives on the Shop board         |
| **Lead Lost**   | Customer declined or went silent         | Manual                                       | Finished                                           |
| **Follow Up**   | Not lost, just stalled — call back later | Manual                                       | When the customer re-engages                       |

**Converted is the only sales stage the system fills in by itself.** A lead moves there automatically when the customer **signs or authorises the estimate**, when a **payment is taken**, or when the **estimate is converted to an invoice**. Nobody has to drag it.

Everything else is a human decision.

There is also **"Remove from pipeline"**, which hides a junk lead from the board. ⚠️ **This cannot be undone** — train users accordingly.

---

## Shop Pipeline

| Stage           | What it means                        | How it gets there                             | When to move on                     |
| --------------- | ------------------------------------ | --------------------------------------------- | ----------------------------------- |
| **Pending**     | Quoted, work not started             | **Automatic** — every new estimate lands here | Once the customer approves the work |
| **In Progress** | Work is happening in the bay         | Manual                                        | When the bay work is finished       |
| **Completed**   | Work done, customer hasn't collected | Manual                                        | Once paid and the customer collects |
| **Delivered**   | Car handed back, job closed          | Manual — **blocked unless conditions pass**   | Finished                            |
| **Re-Dos**      | Job came back for rework             | Manual                                        | When the rework starts              |
| **Cancelled**   | Job called off                       | Manual                                        | Finished                            |

**Two things to understand about this board:**

**1. "In Progress" is the commitment point.** Moving a card there does a lot at once — the estimate becomes a **real invoice**, materials are **deducted from inventory**, and the card **appears on the board for the first time**. Draft estimates sitting in _Pending_ are not visible on the board; they only show in the Estimates list. None of this reverses if you drag the card back.

**2. "Delivered" is the only stage with a gate.** The move is refused unless:

- the outstanding balance is **zero**, and
- **all services are marked complete** by the technicians.

When it succeeds, all technicians are closed off, a delivery notification goes out, and follow-up / review automations start.

---

## The flow

```
SALES     New Leads → Ongoing → Opportunity → Converted
                                              (automatic)
          any stage → Follow Up / Lead Lost


SHOP      Pending → In Progress → Completed → Delivered
                    ↑  card becomes             (needs: paid +
                    |  visible here              work done)
                 Re-Dos ← customer returns
```

**How the two boards connect** — three links, all running from Shop back to Sales:

1. Creating a draft estimate from a lead puts it in **Shop / Pending** — the lead's own stage does not change
2. The estimate being **signed or authorised** moves the lead to **Sales / Converted**
3. A **payment**, or converting the estimate to an invoice, moves the lead to **Sales / Converted**

Nothing on the Sales board moves anything on the Shop board.

---

## A typical job

1. Maria enquires through the website → lands in **New Leads**, the team is notified
2. A salesperson calls her and books an inspection → drags to **Ongoing**
3. He creates a draft estimate (lands in **Shop / Pending**) and moves her lead to **Opportunity** by hand
4. Maria signs → the lead moves to **Converted** on its own
5. The advisor moves the estimate to **In Progress** → it becomes an invoice, paint comes out of stock, the card appears on the shop board
6. Technicians finish → the advisor drags it to **Completed**
7. He tries **Delivered** and is blocked: _"Please clear due balance"_ → takes the payment, then it goes through
8. Three days later she returns with a blemish → **Re-Dos**, then back around the loop

---

## Things everyone should know

|                                              |                                                                                                                                                                                                                      |
| -------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Cards don't move by themselves**           | Apart from Converted (sales) and the default landing stages, **every move is manual**. Technicians finishing their work does **not** move a card — that automation exists in the code but is currently switched off. |
| **Backwards moves are allowed but lossy**    | You can drag any card anywhere. But moving forward converts records, deducts stock and stamps dates — moving back only clears the dates. Dragging out of _Delivered_ **wipes the delivery date permanently**.        |
| **Cancelled undoes nothing**                 | Inventory stays deducted, payments stay unrefunded, and the job still counts as revenue. Refunds and stock corrections are manual.                                                                                   |
| **Deleting a sales stage deletes its leads** | Shop stages just detach their jobs, but sales stages take the leads with them.                                                                                                                                       |
| **Stage names are load-bearing**             | All the behaviour above is matched on the exact default stage names. Renaming _New Leads_, _Pending_, _In Progress_, _Converted_ or _Delivered_ silently breaks intake, conversion and reporting.                    |
| **Some stages are labels only**              | _Opportunity_, _Follow Up_, _Re-Dos_ and _Cancelled_ have no logic behind them — they exist purely so the team can see where things stand.                                                                           |

---

_For the field-level detail — exact triggers, side effects, API routes and known discrepancies — trace the pipeline actions under `src/actions/pipelines/` and `src/actions/estimate/invoice/updateInvoiceStatus.ts`._
