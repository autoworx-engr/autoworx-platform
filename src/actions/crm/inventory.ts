"use server";

import { requireCompanyId, str } from "@/lib/crm-actions-helpers";
import { activeProductWhere } from "@/lib/crm-scope";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

function revalidateInventory() {
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/inventory");
  revalidatePath("/dashboard/invoices");
}

export async function createProduct(formData: FormData) {
  const companyId = await requireCompanyId();
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;
  const priceRaw = String(formData.get("unitPrice") ?? "").trim();
  const unitPrice = priceRaw ? Number(priceRaw) : 0;
  const qtyRaw = String(formData.get("qtyOnHand") ?? "").trim();
  const qtyOnHand = qtyRaw ? Math.max(0, Math.trunc(Number(qtyRaw))) : 0;
  await db.product.create({
    data: {
      companyId,
      name,
      sku: str(formData, "sku"),
      description: str(formData, "description"),
      unitPrice: Number.isFinite(unitPrice) ? unitPrice : 0,
      qtyOnHand: Number.isFinite(qtyOnHand) ? qtyOnHand : 0,
    },
  });
  revalidateInventory();
}

export async function updateProduct(formData: FormData) {
  const companyId = await requireCompanyId();
  const id = Number(formData.get("id"));
  if (!Number.isFinite(id)) return;
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;
  const priceRaw = String(formData.get("unitPrice") ?? "").trim();
  const unitPrice = priceRaw ? Number(priceRaw) : 0;
  const qtyRaw = String(formData.get("qtyOnHand") ?? "").trim();
  const qtyOnHand = qtyRaw ? Math.max(0, Math.trunc(Number(qtyRaw))) : 0;
  await db.product.updateMany({
    where: { id, companyId, ...activeProductWhere },
    data: {
      name,
      sku: str(formData, "sku"),
      description: str(formData, "description"),
      unitPrice: Number.isFinite(unitPrice) ? unitPrice : 0,
      qtyOnHand: Number.isFinite(qtyOnHand) ? qtyOnHand : 0,
    },
  });
  revalidateInventory();
}

export async function archiveProduct(formData: FormData) {
  const companyId = await requireCompanyId();
  const id = Number(formData.get("id"));
  if (!Number.isFinite(id)) return;
  await db.product.updateMany({
    where: { id, companyId, ...activeProductWhere },
    data: { deletedAt: new Date() },
  });
  revalidateInventory();
  redirect("/dashboard/inventory");
}

export async function adjustProductStock(formData: FormData) {
  const companyId = await requireCompanyId();
  const id = Number(formData.get("id"));
  const delta = Math.trunc(Number(formData.get("delta")));
  if (!Number.isFinite(id) || !Number.isFinite(delta)) return;
  const p = await db.product.findFirst({
    where: { id, companyId, ...activeProductWhere },
  });
  if (!p) return;
  const next = p.qtyOnHand + delta;
  if (next < 0) {
    redirect("/dashboard/inventory?error=stock");
  }
  await db.product.update({
    where: { id },
    data: { qtyOnHand: next },
  });
  revalidateInventory();
}
