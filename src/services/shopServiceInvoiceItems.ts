import { db } from "@/lib/db";

type ShopServiceLike = {
  title: string;
  description?: string | null;
  invoiceItems: any[];
};

/**
 * Finds (or creates) the company-level default Service matching a
 * ShopService title. Uses the global db client intentionally: createInvoice
 * runs on its own connection, so a Service created inside the caller's
 * transaction would not be visible to it.
 */
async function findOrCreateDefaultService(
  title: string,
  description: string | null | undefined,
  companyId: number,
) {
  const existing = await db.service.findFirst({
    where: { name: title, companyId },
  });
  if (existing) return existing;

  return db.service.create({
    data: {
      name: title,
      description: description || title,
      companyId,
    },
  });
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
  const allInvoiceItems: any[] = [];

  for (const srv of shopServices) {
    let cachedDefaultService: any = null;
    const getDefaultService = async () => {
      if (!cachedDefaultService) {
        cachedDefaultService = await findOrCreateDefaultService(
          srv.title,
          srv.description,
          companyId,
        );
      }
      return cachedDefaultService;
    };

    if (!srv.invoiceItems || srv.invoiceItems.length === 0) {
      const defaultService = await getDefaultService();
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
          const defaultService = await getDefaultService();
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
