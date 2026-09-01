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

type InvoiceItemLike = {
  service?: Pick<Service, "name"> | null;
  labor?: Pick<Labor, "name"> | null;
  materials?: Pick<Material, "name">[] | null;
};

/**
 * Pipeline "Services" column: service names as-is, labor and material names
 * behind a prefix so a row without a service still reads unambiguously. The
 * prefix is only printed when the kind changes, so a run of labors or
 * materials shares one label — `Labor: B, Material: Front Glass, 100 ml
 * Liquid Armor, wrap door`.
 */
export function getInvoiceItemsLabel(items?: InvoiceItemLike[] | null): string {
  const parts: string[] = [];
  let lastKind: "service" | "labor" | "material" | null = null;

  const push = (kind: "service" | "labor" | "material", name: string) => {
    const prefix =
      kind === "service" || kind === lastKind
        ? ""
        : `${kind === "labor" ? "Labor" : "Material"}: `;
    parts.push(prefix + name);
    lastKind = kind;
  };

  for (const item of items ?? []) {
    if (item.service?.name) {
      push("service", item.service.name);
      continue;
    }

    for (const material of item.materials ?? []) {
      if (material.name) push("material", material.name);
    }
    if (item.labor?.name) push("labor", item.labor.name);
  }

  return parts.join(", ");
}
