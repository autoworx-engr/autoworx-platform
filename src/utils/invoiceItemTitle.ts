import type { Labor, Material, Service } from "@prisma/client";

/**
 * Row title for an invoice item.
 *
 * `InvoiceItem.serviceId` is optional, so an item can be labor-only or
 * material-only. Those rows borrow their title from the labor name, and failing
 * that from their first material's name — the generic "Materials" label is only
 * reached when an item has no service, no labor and no materials at all.
 *
 * Uses `||` rather than `??` on purpose: labor rows are saved with
 * `name: item.labor.name ?? ""`, so an empty string must fall through too.
 */
export function getInvoiceItemTitle(item: {
  service?: Pick<Service, "name"> | null;
  labor?: Pick<Labor, "name"> | null;
  materials?: Pick<Material, "name">[] | null;
}): string {
  return (
    item.service?.name ||
    item.labor?.name ||
    item.materials?.[0]?.name ||
    "Materials"
  );
}
