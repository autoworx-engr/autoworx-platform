import { authOptions } from "@/authOptions";
import { db } from "@/lib/db";
import {
  ShopData,
  ShopServiceApi,
  ShopServicesResponse,
} from "@/service/virtual-shop/api";
import { getServerSession } from "next-auth";
import ServicesTab from "../../components/ServicesTab";

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 10;

export default async function VirtualShopServicesPage() {
  const session = await getServerSession(authOptions);
  const companyId = session?.user?.companyId;

  let initialShopConfig: ShopData | null = null;
  let initialServicesResponse: ShopServicesResponse | undefined;

  if (companyId) {
    const shop = await db.shop.findUnique({
      where: { companyId },
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
    }

    if (shop?.id) {
      const whereClause = {
        shopId: shop.id,
        isActive: true,
      };

      const [totalRecords, services] = await Promise.all([
        db.shopService.count({ where: whereClause }),
        db.shopService.findMany({
          where: whereClause,
          orderBy: {
            createdAt: "desc",
          },
          skip: (DEFAULT_PAGE - 1) * DEFAULT_LIMIT,
          take: DEFAULT_LIMIT,
        }),
      ]);

      const totalPages = Math.ceil(totalRecords / DEFAULT_LIMIT);
      const mappedServices: ShopServiceApi[] = services.map((service) => ({
        id: service.id,
        title: service.title,
        category: service.category,
        price: Number(service.price),
        duration: service.duration,
        description: service.description,
        imageUrl: service.imageUrl,
        modifierCoupe: Number(service.modifierCoupe),
        modifierSedan: Number(service.modifierSedan),
        modifierSUV: Number(service.modifierSUV),
        modifierTruck: Number(service.modifierTruck),
      }));

      initialServicesResponse = {
        success: true,
        meta: {
          totalRecords,
          totalPages,
          page: DEFAULT_PAGE,
          limit: DEFAULT_LIMIT,
          hasNextPage: DEFAULT_PAGE < totalPages,
          hasPrevPage: false,
        },
        data: mappedServices,
      };
    }
  }

  return (
    <ServicesTab
      initialShopConfig={initialShopConfig}
      initialServicesResponse={initialServicesResponse}
    />
  );
}
