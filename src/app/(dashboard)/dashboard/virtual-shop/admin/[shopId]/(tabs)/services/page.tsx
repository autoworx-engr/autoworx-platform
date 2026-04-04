import { authOptions } from "@/authOptions";
import { db } from "@/lib/db";
import {
  ShopData,
  ShopServiceApi,
  ShopServicesResponse,
} from "@/service/virtual-shop/api";
import { getServerSession } from "next-auth";
import ServicesTab from "../../../components/ServicesTab";

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 10;
const PAGE_SIZE_OPTIONS = [10, 20, 50, 100] as const;

type VirtualShopServicesPageProps = {
  params: {
    shopId: string;
  };
  searchParams?: {
    page?: string;
    limit?: string;
    search?: string;
  };
};

function parsePositiveInt(
  value: string | undefined,
  fallback: number,
  allowedValues?: readonly number[],
) {
  const parsed = Number.parseInt(value ?? "", 10);

  if (!Number.isFinite(parsed) || parsed < 1) {
    return fallback;
  }

  if (allowedValues && !allowedValues.includes(parsed)) {
    return fallback;
  }

  return parsed;
}

export default async function VirtualShopServicesPage({
  params,
  searchParams,
}: VirtualShopServicesPageProps) {
  const session = await getServerSession(authOptions);
  const companyId = session?.user?.companyId;
  const search = searchParams?.search?.trim() ?? "";
  const page = parsePositiveInt(searchParams?.page, DEFAULT_PAGE);
  const limit = parsePositiveInt(
    searchParams?.limit,
    DEFAULT_LIMIT,
    PAGE_SIZE_OPTIONS,
  );
  const shopId = Number.parseInt(params.shopId, 10);

  let initialShopConfig: ShopData | null = null;
  let servicesResponse: ShopServicesResponse | undefined;

  if (companyId && Number.isFinite(shopId)) {
    const shop = await db.shop.findFirst({
      where: {
        id: shopId,
        companyId,
      },
    });

    if (shop) {
      const mappedThemeConfig =
        typeof shop.themeConfig === "object" && shop.themeConfig !== null
          ? (shop.themeConfig as unknown as ShopData["themeConfig"])
          : undefined;

      initialShopConfig = {
        id: shop.id,
        companyId: shop.companyId,
        slug: shop.slug,
        storeName: shop.storeName,
        description: shop.description ?? undefined,
        logoUrl: shop.logoUrl ?? undefined,
        bannerUrl: shop.bannerUrl ?? undefined,
        themeConfig: mappedThemeConfig,
        isActive: shop.isActive,
      };

      const whereClause = {
        shopId: shop.id,
        ...(search
          ? {
            OR: [
              {
                title: {
                  contains: search,
                  mode: "insensitive" as const,
                },
              },
              {
                description: {
                  contains: search,
                  mode: "insensitive" as const,
                },
              },
            ],
          }
          : {}),
      };

      const [totalRecords, services] = await Promise.all([
        db.shopService.count({ where: whereClause }),
        db.shopService.findMany({
          where: whereClause,
          orderBy: {
            createdAt: "desc",
          },
          skip: (page - 1) * limit,
          take: limit,
        }),
      ]);

      const totalPages = Math.ceil(totalRecords / limit);
      const mappedServices: ShopServiceApi[] = services.map((service) => ({
        id: service.id,
        title: service.title,
        category: service.category,
        price: Number(service.price),
        duration: service.duration,
        description: service.description,
        imageUrl: service.imageUrl,
        isActive: service.isActive,
        modifierCoupe: Number(service.modifierCoupe),
        modifierSedan: Number(service.modifierSedan),
        modifierSUV: Number(service.modifierSUV),
        modifierTruck: Number(service.modifierTruck),
      }));

      servicesResponse = {
        success: true,
        meta: {
          totalRecords,
          totalPages,
          page,
          limit,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1,
        },
        data: mappedServices,
      };
    }
  }

  return (
    <ServicesTab
      shopConfig={initialShopConfig}
      servicesResponse={servicesResponse}
      currentSearch={search}
    />
  );
}
