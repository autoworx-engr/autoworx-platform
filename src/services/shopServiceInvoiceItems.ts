import { db } from "@/lib/db";

type ShopServiceLike = {
  title: string;
  description?: string | null;
  invoiceItems: any[];
};

/**
 * Resolves the company-level default Services for the given shop services
 * in bulk (one findMany, and if any are missing, one createMany + refetch —
 * at most 3 roundtrips regardless of service count). Uses the global db
 * client intentionally: createInvoice runs on its own connection, so a
 * Service created inside the caller's transaction would not be visible
 * to it. Returns a Map keyed by service title.
 */
async function resolveDefaultServices(
  shopServices: ShopServiceLike[],
  companyId: number,
) {
  const defaultsByTitle = new Map<string, any>();
  if (shopServices.length === 0) return defaultsByTitle;

  const titles = [...new Set(shopServices.map((srv) => srv.title))];
  const existing = await db.service.findMany({
    where: { companyId, name: { in: titles } },
    orderBy: { id: "asc" },
  });
  for (const service of existing) {
    if (!defaultsByTitle.has(service.name)) {
      defaultsByTitle.set(service.name, service);
    }
  }

  const missing = shopServices.filter(
    (srv, index, arr) =>
      !defaultsByTitle.has(srv.title) &&
      arr.findIndex((s) => s.title === srv.title) === index,
  );
  if (missing.length > 0) {
    await db.service.createMany({
      data: missing.map((srv) => ({
        name: srv.title,
        description: srv.description || srv.title,
        companyId,
      })),
    });
    const created = await db.service.findMany({
      where: { companyId, name: { in: missing.map((srv) => srv.title) } },
      orderBy: { id: "asc" },
    });
    for (const service of created) {
      if (!defaultsByTitle.has(service.name)) {
        defaultsByTitle.set(service.name, service);
      }
    }
  }

  return defaultsByTitle;
}

/**
 * Builds the invoice items for a set of shop services, guaranteeing every
 * item references a valid Service. Shop services with no invoice items get
 * a default Service (named after the shop service title); existing items
 * missing a service reference are backfilled the same way.
 */
export async function buildInvoiceItemsWithDefaults(
  shopServices: ShopServiceLike[],
  companyId: number,
) {
  const needsDefault = shopServices.filter(
    (srv) =>
      !srv.invoiceItems?.length ||
      srv.invoiceItems.some((item) => !item.service),
  );
  const defaultsByTitle = await resolveDefaultServices(needsDefault, companyId);

  const allInvoiceItems: any[] = [];
  for (const srv of shopServices) {
    if (!srv.invoiceItems || srv.invoiceItems.length === 0) {
      const defaultService = defaultsByTitle.get(srv.title);
      allInvoiceItems.push({
        id: 0,
        serviceId: defaultService.id,
        service: defaultService,
        materials: [],
        labor: null,
        tags: [],
      });
    } else {
      for (const item of srv.invoiceItems) {
        if (!item.service) {
          const defaultService = defaultsByTitle.get(srv.title);
          item.serviceId = defaultService.id;
          item.service = defaultService;
        }
        allInvoiceItems.push(item);
      }
    }
  }

  return allInvoiceItems;
}

/**
 * Normalizes raw invoice items (Prisma Decimal fields, nested tag join rows)
 * into the shape createInvoice expects.
 */
export function mapInvoiceItemsForCreate(allInvoiceItems: any[]) {
  return allInvoiceItems.map(({ id, ...item }) => ({
    ...item,
    materials: item.materials.map((material: any) => ({
      ...material,
      quantity: (Number(material.quantity) || 0) as any,
      cost: (Number(material.cost) || 0) as any,
      sell: (Number(material.sell) || 0) as any,
      discount: (Number(material.discount) || 0) as any,
      tags: material.tags.map((mt: any) => mt.tag),
    })),
    labor: item.labor
      ? {
          ...item.labor,
          hours: (Number(item.labor.hours) || 0) as any,
          charge: (Number(item.labor.charge) || 0) as any,
          discount: (Number(item.labor.discount) || 0) as any,
          tags: item.labor.tags.map((lt: any) => lt.tag),
        }
      : null,
    tags: item.tags.map((it: any) => it.tag),
  }));
}

/**
 * Material-only total (sell × quantity) across invoice items. Tax is charged
 * on materials only — labor is excluded — matching the estimate/invoice and
 * template bill summaries.
 */
export function calcMaterialSubtotal(invoiceItems: any[]) {
  return (invoiceItems || []).reduce((total: number, item: any) => {
    const materials = item?.materials || [];
    return (
      total +
      materials.reduce(
        (sum: number, material: any) =>
          sum + Number(material?.sell || 0) * Number(material?.quantity || 0),
        0,
      )
    );
  }, 0);
}
