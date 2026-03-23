import { SyncLists } from "@/components/SyncLists";
import Title from "@/components/Title";
import { getCompanyId } from "@/lib/companyId";
import { db } from "@/lib/db";
import { Material, Tag } from "@prisma/client";
import ServiceCreateClient from "./ServiceCreateClient";

export default async function Page() {
  const companyId = await getCompanyId();

  const categories = await db.category.findMany({ where: { companyId } });
  const services = await db.service.findMany({
    where: { companyId, canned: true },
  });

  const tags = await db.tag.findMany({ where: { companyId, type: "GENERAL" } });
  const vendors = await db.vendor.findMany({ where: { companyId } });
  const statuses = await db.column.findMany({ where: { companyId } });
  const paymentMethods = await db.paymentMethod.findMany({
    where: { companyId },
  });

  const products = await db.inventoryProduct.findMany({
    where: { companyId, type: "Product" },
    include: {
      tags: {
        include: {
          tag: true,
        },
      },
    },
  });

  const labors = await db.labor.findMany({
    where: { companyId, cannedLabor: true },
    include: {
      tags: {
        include: {
          tag: true,
        },
      },
    },
  });

  labors.forEach((labor) => {
    (labor as unknown as { tags: Tag[] }).tags = labor.tags.map((tag) => tag.tag);
  });

  const materials: (Material & { tags: Tag[] })[] = products.map((product) => ({
    id: product.id,
    name: product.name,
    vendorId: product.vendorId,
    categoryId: product.categoryId,
    notes: product.description,
    quantity: product.quantity,
    cost: product.price,
    sell: product.price,
    discount: null,
    companyId: product.companyId,
    invoiceId: null,
    invoiceItemId: null,
    productId: product.id,
    createdAt: product.createdAt,
    updatedAt: product.updatedAt,
    invoiceTemplateId: null,
    tags: product.tags.map((item) => item.tag),
  }));

  return (
    <div className="w-full flex flex-col gap-3">
      <Title>Service</Title>

      <SyncLists
        customers={[]}
        vehicles={[]}
        categories={categories}
        services={services}
        materials={materials}
        labors={labors}
        tags={tags}
        vendors={vendors}
        statuses={statuses}
        paymentMethods={paymentMethods}
        client={null}
      />

      <ServiceCreateClient companyId={companyId} />
    </div>
  );
}
