import { SyncLists } from "@/components/SyncLists";
import Title from "@/components/Title";
import { getCompanyId } from "@/lib/companyId";
import { db } from "@/lib/db";
import { Material, Tag } from "@prisma/client";
import { Metadata } from "next";
import { notFound } from "next/navigation";
import ServiceCreateClient from "./ServiceCreateClient";

export const metadata = {
  title: "Virtual Shop - Create Service",
  description: "Create or edit a virtual shop service",
};

type InitialServiceData = {
  id: number;
  serviceInfo: {
    serviceTitle: string;
    shortDescription: string;
    description: string;
    customDuration: string;
    imageName: string;
    imageUrl: string;
    category: string[];
    vehicleTypeModifiers: {
      coupe: string;
      sedan: string;
      suv: string;
      truck: string;
    };
  };
  items: any[];
};

export default async function Page({
  searchParams,
}: {
  searchParams?: Promise<{ serviceId?: string; shopId?: string }>;
}) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const companyId = await getCompanyId();
  const parsedServiceId = resolvedSearchParams?.serviceId
    ? Number(resolvedSearchParams.serviceId)
    : Number.NaN;
  const serviceId =
    Number.isInteger(parsedServiceId) && parsedServiceId > 0
      ? parsedServiceId
      : null;

  const parsedShopId = resolvedSearchParams?.shopId
    ? Number.parseInt(resolvedSearchParams.shopId, 10)
    : Number.NaN;
  const selectedShopId =
    Number.isInteger(parsedShopId) && parsedShopId > 0 ? parsedShopId : null;

  let initialServiceData: InitialServiceData | null = null;

  if (serviceId !== null) {
    const shopService = await db.shopService.findFirst({
      where: {
        id: serviceId,
        ...(selectedShopId && Number.isFinite(selectedShopId)
          ? { shopId: selectedShopId }
          : {}),
        shop: {
          companyId,
        },
      },
      include: {
        invoiceItems: {
          include: {
            service: true,
            labor: {
              include: {
                tags: {
                  include: {
                    tag: true,
                  },
                },
              },
            },
            materials: {
              include: {
                tags: {
                  include: {
                    tag: true,
                  },
                },
              },
            },
            tags: {
              include: {
                tag: true,
              },
            },
          },
        },
      },
    });

    if (!shopService) {
      return notFound();
    }

    initialServiceData = {
      id: shopService.id,
      serviceInfo: {
        serviceTitle: shopService.title || "",
        shortDescription: shopService.shortDescription || "",
        description: shopService.description || "",
        customDuration: String(shopService.duration ?? ""),
        imageName: "",
        imageUrl: shopService.imageUrl || "",
        category: Array.isArray(shopService.category)
          ? shopService.category
          : [],
        vehicleTypeModifiers: {
          coupe: String(shopService.modifierCoupe ?? 0),
          sedan: String(shopService.modifierSedan ?? 0),
          suv: String(shopService.modifierSUV ?? 0),
          truck: String(shopService.modifierTruck ?? 0),
        },
      },
      items: shopService.invoiceItems.map((item) => ({
        id: item.id,
        service: item.service,
        materials: item.materials.map((material) => ({
          ...material,
          tags: material.tags.map((tag) => tag.tag),
        })),
        labor: item.labor
          ? {
              ...item.labor,
              tags: item.labor.tags.map((tag) => tag.tag),
            }
          : null,
        tags: item.tags.map((tag) => tag.tag),
        serviceDesc: item.serviceDesc || "",
      })),
    };
  }

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
    (labor as unknown as { tags: Tag[] }).tags = labor.tags.map(
      (tag) => tag.tag,
    );
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
      <Title>{initialServiceData ? "Edit Service" : "Service"}</Title>

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

      <ServiceCreateClient
        companyId={companyId}
        selectedShopId={selectedShopId}
        initialServiceData={initialServiceData}
      />
    </div>
  );
}
