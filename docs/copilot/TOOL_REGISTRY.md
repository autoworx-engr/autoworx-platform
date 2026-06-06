# Copilot Tool Registry

Current as of Phase 3g. **41 tools total.**

All tools share the same execution envelope:

1. `canUserDo(userId, action)` permission check — reject with user-facing error if denied
2. Zod validation of tool input — reject with field-level error if invalid
3. `companyId` injected from session — AI-provided `companyId` is ignored
4. Execute (direct Prisma or `callInternalApi`)
5. `writeAuditLog(...)` — always, including on failure

---

## Read / Search Tools (11)

These are direct Prisma reads. No API route call. `companyId` always from `ctx.companyId`.

| Tool                              | File                            | Permission       | Returns                                                                                             |
| --------------------------------- | ------------------------------- | ---------------- | --------------------------------------------------------------------------------------------------- |
| `get_client_by_name`              | getClientByName.ts              | client.read      | matchCount, clients with id, name, phoneLast4, vehicles [{id, description}]                         |
| `get_vehicle_by_client`           | getVehicleByClient.ts           | vehicle.read     | vehicles for a client (VIN, license, description, year/make/model)                                  |
| `get_estimates_for_client`        | getEstimatesForClient.ts        | estimate.read    | estimates/invoices for a client — id, type, status (column), grandTotal, vehicle, links             |
| `get_estimate_by_number`          | getEstimateByNumber.ts          | estimate.read    | full estimate with items[] (each item has id for serviceItemId use), client, vehicle, totals, links |
| `get_appointments_for_date_range` | getAppointmentsForDateRange.ts  | appointment.read | appointments in a date range — id, title, date, client, vehicle, assigned users                     |
| `get_tasks_for_user`              | getTasksForUser.ts              | task.read        | tasks for a user (or current user if none specified) — id, title, date, priority                    |
| `get_lead_tags`                   | getLeadTagsTool.ts              | lead.read        | company's lead tag list — id, name, color                                                           |
| `get_confirmation_templates`      | getConfirmationTemplatesTool.ts | appointment.read | email confirmation templates — id, name                                                             |
| `get_inventory_item_by_name`      | getInventoryItemByName.ts       | inventory.read   | word-by-word fuzzy search — id, name, type, quantity, costPrice, unit, description                  |
| `get_vendor_by_name`              | getVendorByName.ts              | inventory.read   | word-by-word search across companyName + name — id, companyName, name, email, phone                 |
| `get_team_members`                | getTeamMembers.ts               | team.read        | word-by-word name search on Users — id, firstName, lastName, role (employeeType)                    |

---

## Write Tools (17)

These call `callInternalApi` → Bearer JWT → API route → DB. All reversible (no external effects like SMS/email unless the underlying action triggers them).

| Tool                        | File                          | Permission             | Route                                                | Notes                                                                                     |
| --------------------------- | ----------------------------- | ---------------------- | ---------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `create_lead`               | createLeadTool.ts             | lead.create            | POST /api/lead/company/[companyId]/                  | 2-min idempotency guard (409 on near-duplicate)                                           |
| `create_appointment`        | createAppointmentTool.ts      | appointment.create     | POST /api/appointment/company/[companyId]/           | Sends confirmation email if template configured                                           |
| `update_appointment`        | updateAppointmentTool.ts      | appointment.update     | PATCH /api/appointment/company/[companyId]/[id]/     |                                                                                           |
| `create_task`               | createTaskTool.ts             | task.create            | POST /api/task/company/[companyId]/                  | DB-direct in route (skips Google Calendar triggers)                                       |
| `update_task`               | updateTaskTool.ts             | task.update            | PATCH /api/task/company/[companyId]/[id]/            |                                                                                           |
| `create_client`             | createClientTool.ts           | client.create          | POST /api/client/company/[companyId]/                | 409 → soft success (looks up existing by phone)                                           |
| `create_vehicle_for_client` | createVehicleForClientTool.ts | vehicle.create         | POST /api/vehicle/client/[clientId]/                 | Idempotent on (year+make+model+client)                                                    |
| `create_estimate`           | createEstimateTool.ts         | estimate.create        | POST /api/estimate/[companyId]/                      | Server-side money math in execute(); validates clientId/vehicleId ownership               |
| `add_materials_to_estimate` | addMaterialsToEstimateTool.ts | estimate.add_materials | Direct Prisma in execute()                           | Requires `serviceItemId` — attaches to existing service item, NOT new line item           |
| `add_lead_tag`              | addLeadTagTool.ts             | lead.update            | POST /api/pipeline/sales/leads/[id]/column/          |                                                                                           |
| `remove_lead_tag`           | removeLeadTagTool.ts          | lead.update            | PATCH /api/pipeline/sales/leads/[id]/column/         |                                                                                           |
| `create_tag`                | createTagTool.ts              | lead.update            | POST /api/pipeline/sales/leads/                      | Creates company-level tag, then prompts model to apply                                    |
| `create_inventory_product`  | createInventoryProductTool.ts | inventory.create       | POST /api/inventory/[companyId]/products/            | Name uniqueness per company (409). Writes InventoryProductHistory atomically              |
| `replenish_inventory`       | replenishInventoryTool.ts     | inventory.update       | POST /api/inventory/[companyId]/replenish/           | Weighted average cost: newPrice = (existingQty×oldPrice + addedQty×newPrice) / total      |
| `create_vendor`             | createVendorTool.ts           | vendor.create          | POST /api/vendor/[companyId]/                        | Case-insensitive name uniqueness per company (409)                                        |
| `create_work_order`         | createWorkOrderTool.ts        | workorder.create       | PATCH /api/work-order/[companyId]/[invoiceId]/       | Invoice must already exist; estimates rejected (400)                                      |
| `assign_technician`         | assignTechnicianTool.ts       | workorder.assign       | POST /api/work-order/[companyId]/[invoiceId]/assign/ | Auto-resolves serviceId via Service catalog match/create; backfills InvoiceItem.serviceId |

---

## Analytics / Reporting Tools (13)

All direct Prisma reads. All optional date range. All `companyId`-scoped. Do NOT use `createdAt` for filtering — each tool uses a domain-specific date field.

| Tool                      | File                     | Permission           | Date field                                              | Key output                                                                                                              |
| ------------------------- | ------------------------ | -------------------- | ------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `get_revenue_summary`     | getRevenueSummary.ts     | report.revenue.read  | Invoice.deliveredAt                                     | totalRevenue, invoiceCount, avgValue; opt. profit/cost/margin (includeProfit); opt. clientId/vehicleId filter           |
| `get_payments_summary`    | getPaymentsSummary.ts    | report.payments.read | Payment.date                                            | totalCollected, outstandingBalance, refundCount, avgPayment, byMethod, byCardType; opt. paymentType/cardLastFour filter |
| `get_inventory_summary`   | getInventorySummary.ts   | inventory.read       | InventoryProductHistory.date                            | totalStockValue, purchaseValueProducts, purchaseValueSupplies, lowStockItems; opt. lowStockOnly                         |
| `get_team_summary`        | getTeamSummary.ts        | team.read            | Technician.dateClosed                                   | per-member: completedJobs, totalPayout; opt. hoursWorked (ClockInOut), redoCount+rate (InvoiceRedo)                     |
| `get_lead_summary`        | getLeadSummary.ts        | lead.read            | Lead.createdAt (counts) / columnChangedAt (conversions) | total/qualified/converted/lost, conversionRate%, avgDealSize, bySource                                                  |
| `get_work_order_summary`  | getWorkOrderSummary.ts   | estimate.read        | Invoice.workOrderCreatedAt                              | total, byStatus (inProgress/completed/delivered/reDos/cancelled), avgCompletionHours                                    |
| `get_task_summary`        | getTaskSummary.ts        | task.read            | Task.date                                               | total, overdue (date < today), byPriority; opt. userId/priority filter                                                  |
| `get_appointment_summary` | getAppointmentSummary.ts | appointment.read     | Appointment.date                                        | total, upcoming, past, byUserId                                                                                         |
| `get_client_stats`        | getClientStats.ts        | client.read          | Client.createdAt (new clients)                          | totalClients, newClients, topN by delivered revenue, bySource                                                           |
| `get_profit_analysis`     | getProfitAnalysis.ts     | estimate.read        | Invoice.deliveredAt                                     | totalRevenue, totalCost, totalProfit, profitMargin%; groupBy client/service/material for breakdown                      |
| `get_material_usage`      | getMaterialUsage.ts      | inventory.read       | Material.createdAt                                      | totalMaterialCost, totalSell, totalMargin; groupBy material (per-name avg) or vendor (spending)                         |
| `get_service_performance` | getServicePerformance.ts | estimate.read        | Invoice.deliveredAt                                     | per service: count, totalRevenue, avgLaborRate, avgHours, materialMargin; sorted by count                               |
| `get_clock_report`        | getClockReport.ts        | team.read            | ClockInOut.clockIn                                      | per employee: grossHours, breakHours, netHours, daysWorked; totalNetHours                                               |

---

## `CopilotAction` Enum (complete list)

```ts
// src/lib/copilot/canUserDo.ts
"lead.create"; // salesPipeline
"lead.update"; // salesPipeline
"lead.read"; // salesPipeline
"appointment.create"; // calendarTask
"appointment.update"; // calendarTask
"appointment.read"; // calendarTask
"task.create"; // calendarTask
"task.update"; // calendarTask
"task.read"; // calendarTask
"estimate.create"; // estimatesInvoices
"estimate.add_materials"; // estimatesInvoices
"estimate.read"; // estimatesInvoices
"estimate.send"; // estimatesInvoices
"invoice.send"; // estimatesInvoices
"invoice.read"; // estimatesInvoices
"inventory.create"; // inventoryAll
"inventory.update"; // inventoryAll
"inventory.read"; // inventoryAll
"vendor.create"; // inventoryAll
"team.read"; // open (all authenticated roles)
"workorder.create"; // estimatesInvoices
"workorder.assign"; // estimatesInvoices
"report.revenue.read"; // reporting (defaults true)
"report.payments.read"; // payments (defaults true)
"client.read"; // open
"client.create"; // salesPipeline
"vehicle.read"; // open
"vehicle.create"; // salesPipeline
```
