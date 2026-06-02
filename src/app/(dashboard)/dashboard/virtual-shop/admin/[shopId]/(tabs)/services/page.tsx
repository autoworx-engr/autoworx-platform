import { authOptions } from "@/authOptions";
import { ShopData, ShopServicesResponse } from "@/service/virtual-shop/api";
import { getServerSession } from "next-auth";
import ServicesTab from "../../../components/ServicesTab";
import { Metadata } from "next";

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 10;
const PAGE_SIZE_OPTIONS = [10, 20, 50, 100] as const;

type VirtualShopServicesPageProps = {
  params: Promise<{
    shopId: string;
  }>;
  searchParams?: Promise<{
    page?: string;
    limit?: string;
    search?: string;
  }>;
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

export const metadata: Metadata = {
  title: "Virtual Shop Services",
  description: "View and manage your virtual shop services.",
};

export default async function VirtualShopServicesPage({
  params,
  searchParams,
}: VirtualShopServicesPageProps) {
  const resolvedParams = await params;
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const session = await getServerSession(authOptions);
  const accessToken = session?.accessToken;
  const search = resolvedSearchParams?.search?.trim() ?? "";
  const page = parsePositiveInt(resolvedSearchParams?.page, DEFAULT_PAGE);
  const limit = parsePositiveInt(
    resolvedSearchParams?.limit,
    DEFAULT_LIMIT,
    PAGE_SIZE_OPTIONS,
  );
  const shopId = Number.parseInt(resolvedParams.shopId, 10);

  let initialShopConfig: ShopData | null = null;
  let servicesResponse: ShopServicesResponse | undefined;

  if (accessToken && Number.isFinite(shopId)) {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL;

    if (baseUrl) {
      const [shopConfigResponse, servicesApiResponse] = await Promise.all([
        fetch(`${baseUrl}/api/virtual-shop/configure/${shopId}`, {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          cache: "no-store",
        }),
        fetch(
          `${baseUrl}/api/virtual-shop/shop-services?${new URLSearchParams({
            shopId: String(shopId),
            page: String(page),
            limit: String(limit),
            includeInactive: "true",
            ...(search ? { search } : {}),
          }).toString()}`,
          {
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${accessToken}`,
            },
            cache: "no-store",
          },
        ),
      ]);

      if (shopConfigResponse.ok) {
        const shopJson = (await shopConfigResponse.json()) as {
          success: boolean;
          data?: ShopData | null;
        };
        if (shopJson?.success) {
          initialShopConfig = shopJson.data ?? null;
        }
      }

      if (servicesApiResponse.ok) {
        const servicesJson =
          (await servicesApiResponse.json()) as ShopServicesResponse;
        if (servicesJson?.success) {
          servicesResponse = servicesJson;
        }
      }
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
