"use server";

import {
  activeAccountWhere,
  activeDealWhere,
  activeInvoiceWhere,
  activeProductWhere,
} from "@/lib/crm-scope";
import { requireCompanyId, str } from "@/lib/crm-actions-helpers";
import { db } from "@/lib/db";
import { InvoiceStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

function revalidateInvoices() {
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/invoices");
  revalidatePath("/dashboard/accounts");
  revalidatePath("/dashboard/deals");
  revalidatePath("/dashboard/inventory");
}

async function recalcInvoiceTotals(invoiceId: number, companyId: number) {
  const lines = await db.invoiceLineItem.findMany({ where: { invoiceId } });
  const subtotal =
    Math.round(lines.reduce((s, l) => s + Number(l.amount), 0) * 100) / 100;
  const inv = await db.invoice.findFirst({
    where: { id: invoiceId, companyId, ...activeInvoiceWhere },
  });
  if (!inv) return;
  const taxPercent = Math.min(100, Math.max(0, inv.taxPercent));
  const taxAmount = Math.round(subtotal * (taxPercent / 100) * 100) / 100;
  const total = Math.round((subtotal + taxAmount) * 100) / 100;
  await db.invoice.update({
    where: { id: invoiceId },
    data: { subtotal, taxAmount, total },
  });
}

function nextInvoiceNumber(companyId: number) {
  return `INV-${companyId}-${Date.now().toString(36).toUpperCase()}`;
}

const STATUS_FLOW: Record<InvoiceStatus, InvoiceStatus[]> = {
  [InvoiceStatus.DRAFT]: [
    InvoiceStatus.SENT,
    InvoiceStatus.PAID,
    InvoiceStatus.VOID,
  ],
  [InvoiceStatus.SENT]: [InvoiceStatus.PAID, InvoiceStatus.VOID],
  [InvoiceStatus.PAID]: [InvoiceStatus.VOID],
  [InvoiceStatus.VOID]: [],
};

export async function createInvoice(formData: FormData) {
  const companyId = await requireCompanyId();
  const accountId = Number(formData.get("accountId"));
  if (!Number.isFinite(accountId) || accountId <= 0) return;
  const account = await db.crmAccount.findFirst({
    where: { id: accountId, companyId, ...activeAccountWhere },
  });
  if (!account) return;
  const dealRaw = String(formData.get("dealId") ?? "").trim();
  const dealId = dealRaw ? Number(dealRaw) : null;
  if (dealId != null && (!Number.isFinite(dealId) || dealId <= 0)) return;

  const taxPercentRaw = String(formData.get("taxPercent") ?? "0").trim();
  let taxPercent = taxPercentRaw ? Math.trunc(Number(taxPercentRaw)) : 0;
  if (!Number.isFinite(taxPercent)) taxPercent = 0;
  taxPercent = Math.min(100, Math.max(0, taxPercent));

  const dueRaw = String(formData.get("dueDate") ?? "").trim();
  const dueDate = dueRaw ? new Date(dueRaw) : null;

  if (dealId) {
    const deal = await db.deal.findFirst({
      where: { id: dealId, companyId, ...activeDealWhere },
    });
    if (!deal || deal.accountId !== accountId) return;
  }

  const number = nextInvoiceNumber(companyId);
  const invoice = await db.invoice.create({
    data: {
      companyId,
      accountId,
      dealId: dealId && Number.isFinite(dealId) ? dealId : null,
      number,
      taxPercent,
      dueDate: dueDate && !Number.isNaN(dueDate.getTime()) ? dueDate : null,
      notes: str(formData, "notes"),
    },
  });

  const lineCountRaw = Number(formData.get("lineCount"));
  const lineCount = Number.isFinite(lineCountRaw) && lineCountRaw > 0
    ? Math.min(lineCountRaw, 50)
    : 12;

  for (let i = 0; i < lineCount; i++) {
    const desc = String(formData.get(`line_desc_${i}`) ?? "").trim();
    if (!desc) continue;
    const qty = Math.max(1, Math.trunc(Number(formData.get(`line_qty_${i}`)) || 1));
    let unitPrice = Number(formData.get(`line_price_${i}`)) || 0;
    const productRaw = String(formData.get(`line_product_${i}`) ?? "").trim();
    const productId = productRaw ? Number(productRaw) : null;
    if (productId != null && (!Number.isFinite(productId) || productId <= 0)) continue;
    if (productId && Number.isFinite(productId) && unitPrice === 0) {
      const p = await db.product.findFirst({
        where: { id: productId, companyId, ...activeProductWhere },
      });
      if (p) unitPrice = Number(p.unitPrice);
    }
    const amount = Math.round(qty * unitPrice * 100) / 100;
    await db.invoiceLineItem.create({
      data: {
        invoiceId: invoice.id,
        productId: productId && Number.isFinite(productId) ? productId : null,
        description: desc,
        quantity: qty,
        unitPrice,
        amount,
      },
    });
  }

  const createdLineCount = await db.invoiceLineItem.count({
    where: { invoiceId: invoice.id },
  });
  if (createdLineCount === 0) {
    await db.invoice.delete({ where: { id: invoice.id } });
    redirect("/dashboard/invoices?error=no_lines");
  }

  await recalcInvoiceTotals(invoice.id, companyId);
  revalidateInvoices();
  redirect(`/dashboard/invoices/${invoice.id}`);
}

export async function addInvoiceLine(formData: FormData) {
  const companyId = await requireCompanyId();
  const invoiceId = Number(formData.get("invoiceId"));
  if (!Number.isFinite(invoiceId)) return;
  const inv = await db.invoice.findFirst({
    where: { id: invoiceId, companyId, ...activeInvoiceWhere },
  });
  if (!inv || inv.status !== InvoiceStatus.DRAFT) return;
  const desc = String(formData.get("description") ?? "").trim();
  if (!desc) return;
  const qty = Math.max(1, Math.trunc(Number(formData.get("quantity")) || 1));
  let unitPrice = Number(formData.get("unitPrice")) || 0;
  const productRaw = String(formData.get("productId") ?? "").trim();
  const productId = productRaw ? Number(productRaw) : null;
  if (productId && Number.isFinite(productId) && unitPrice === 0) {
    const p = await db.product.findFirst({
      where: { id: productId, companyId, ...activeProductWhere },
    });
    if (p) unitPrice = Number(p.unitPrice);
  }
  const amount = Math.round(qty * unitPrice * 100) / 100;
  await db.invoiceLineItem.create({
    data: {
      invoiceId,
      productId: productId && Number.isFinite(productId) ? productId : null,
      description: desc,
      quantity: qty,
      unitPrice,
      amount,
    },
  });
  await recalcInvoiceTotals(invoiceId, companyId);
  revalidateInvoices();
  revalidatePath(`/dashboard/invoices/${invoiceId}`);
}

export async function removeInvoiceLine(formData: FormData) {
  const companyId = await requireCompanyId();
  const lineId = Number(formData.get("lineId"));
  const invoiceId = Number(formData.get("invoiceId"));
  if (!Number.isFinite(lineId) || !Number.isFinite(invoiceId)) return;
  const inv = await db.invoice.findFirst({
    where: { id: invoiceId, companyId, ...activeInvoiceWhere },
  });
  if (!inv || inv.status !== InvoiceStatus.DRAFT) return;
  await db.invoiceLineItem.deleteMany({
    where: { id: lineId, invoiceId },
  });
  await recalcInvoiceTotals(invoiceId, companyId);
  revalidateInvoices();
  revalidatePath(`/dashboard/invoices/${invoiceId}`);
}

export async function updateInvoiceDraft(formData: FormData) {
  const companyId = await requireCompanyId();
  const id = Number(formData.get("id"));
  if (!Number.isFinite(id)) return;
  const inv = await db.invoice.findFirst({
    where: { id, companyId, ...activeInvoiceWhere },
  });
  if (!inv || inv.status !== InvoiceStatus.DRAFT) return;
  const taxPercentRaw = String(formData.get("taxPercent") ?? "").trim();
  let taxPercent = taxPercentRaw ? Math.trunc(Number(taxPercentRaw)) : inv.taxPercent;
  if (!Number.isFinite(taxPercent)) taxPercent = 0;
  taxPercent = Math.min(100, Math.max(0, taxPercent));
  const dueRaw = String(formData.get("dueDate") ?? "").trim();
  const dueDate = dueRaw ? new Date(dueRaw) : null;
  await db.invoice.update({
    where: { id },
    data: {
      taxPercent,
      dueDate: dueDate && !Number.isNaN(dueDate.getTime()) ? dueDate : null,
      notes: str(formData, "notes"),
    },
  });
  await recalcInvoiceTotals(id, companyId);
  revalidateInvoices();
  revalidatePath(`/dashboard/invoices/${id}`);
}

export async function setInvoiceStatus(formData: FormData) {
  const companyId = await requireCompanyId();
  const id = Number(formData.get("id"));
  const next = String(formData.get("status") ?? "") as InvoiceStatus;
  if (!Number.isFinite(id) || !Object.values(InvoiceStatus).includes(next)) return;

  const inv = await db.invoice.findFirst({
    where: { id, companyId, ...activeInvoiceWhere },
    include: { lines: true },
  });
  if (!inv) return;
  if (inv.status === next) return;
  if (inv.status === InvoiceStatus.VOID) return;
  const allowed = STATUS_FLOW[inv.status];
  if (!allowed.includes(next)) return;

  try {
    await db.$transaction(async (tx) => {
      if (next === InvoiceStatus.PAID && inv.status !== InvoiceStatus.PAID) {
        for (const line of inv.lines) {
          if (line.productId) {
            const p = await tx.product.findFirst({
              where: {
                id: line.productId,
                companyId,
                ...activeProductWhere,
              },
            });
            if (!p || p.qtyOnHand < line.quantity) {
              throw new Error("INSUFFICIENT_STOCK");
            }
          }
        }
        for (const line of inv.lines) {
          if (line.productId) {
            await tx.product.update({
              where: { id: line.productId },
              data: { qtyOnHand: { decrement: line.quantity } },
            });
          }
        }
      }

      if (inv.status === InvoiceStatus.PAID && next === InvoiceStatus.VOID) {
        for (const line of inv.lines) {
          if (line.productId) {
            await tx.product.update({
              where: { id: line.productId },
              data: { qtyOnHand: { increment: line.quantity } },
            });
          }
        }
      }

      await tx.invoice.update({
        where: { id },
        data: { status: next },
      });
    });
  } catch (e) {
    if (e instanceof Error && e.message === "INSUFFICIENT_STOCK") {
      redirect(`/dashboard/invoices/${id}?error=stock`);
    }
    throw e;
  }

  revalidateInvoices();
  revalidatePath(`/dashboard/invoices/${id}`);
}

export async function archiveInvoice(formData: FormData) {
  const companyId = await requireCompanyId();
  const id = Number(formData.get("id"));
  if (!Number.isFinite(id)) return;
  const inv = await db.invoice.findFirst({
    where: { id, companyId, ...activeInvoiceWhere },
  });
  if (!inv) return;
  if (inv.status !== InvoiceStatus.DRAFT) {
    return;
  }
  await db.invoice.updateMany({
    where: { id, companyId, ...activeInvoiceWhere },
    data: { deletedAt: new Date() },
  });
  revalidateInvoices();
  redirect("/dashboard/invoices");
}
