import { redirect } from "next/navigation";
import { authOptions } from "@/authOptions";
import { db } from "@/lib/db";
import { getServerSession } from "next-auth";
import ShopNotFound from "@/app/subdomain/[subdomain]/components/giftcards/ShopNotFound";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Virtual Shop Admin",
  description: "Virtual shop admin",
};

const DEFAULT_TAB = "services";

const TAB_TO_ROUTE: Record<string, string> = {
  services: "services",
  deposits: "deposits",
  scheduling: "scheduling",
  financial: "financial",
  "gift-cards": "gift-cards",
  calendar: "calendar",
  estimates: "estimates",
};

type VirtualShopAdminPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

const resolveTabRoute = (tabParam: string | string[] | undefined): string => {
  const tabValue = Array.isArray(tabParam) ? tabParam[0] : tabParam;
  const resolvedTab =
    tabValue && TAB_TO_ROUTE[tabValue] ? tabValue : DEFAULT_TAB;

  return TAB_TO_ROUTE[resolvedTab];
};

export default async function VirtualShopAdminPage({
  searchParams,
}: VirtualShopAdminPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const session = await getServerSession(authOptions);
  const companyId = session?.user?.companyId;

  if (!companyId) {
    return <ShopNotFound />;
  }

  const shops = await db.shop.findMany({
    where: { companyId },
    select: { id: true },
    orderBy: { createdAt: "asc" },
  });

  if (shops.length === 0) {
    return <ShopNotFound />;
  }

  const routeSegment = resolveTabRoute(resolvedSearchParams?.tab);

  redirect(`/dashboard/virtual-shop/admin/${shops[0].id}/${routeSegment}`);
}
