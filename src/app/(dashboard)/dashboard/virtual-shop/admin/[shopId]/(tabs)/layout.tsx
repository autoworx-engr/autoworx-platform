import { authOptions } from "@/authOptions";
import { db } from "@/lib/db";
import { getServerSession } from "next-auth";
import ShopNotFound from "@/app/subdomain/[subdomain]/components/giftcards/ShopNotFound";
import VirtualShopTabs from "../../components/VirtualShopTabs";

type VirtualShopTabsLayoutProps = {
  children: React.ReactNode;
  params: Promise<{
    shopId: string;
  }>;
};

export default async function VirtualShopTabsLayout({
  children,
  params,
}: VirtualShopTabsLayoutProps) {
  const { shopId: shopIdParam } = await params;
  const session = await getServerSession(authOptions);
  const companyId = session?.user?.companyId;
  const shopId = Number.parseInt(shopIdParam, 10);

  if (!companyId || !Number.isFinite(shopId)) {
    return <ShopNotFound />;
  }

  const shops = await db.shop.findMany({
    where: { companyId },
    select: {
      id: true,
      storeName: true,
    },
    orderBy: { createdAt: "asc" },
  });

  const activeShop = shops.find((shop) => shop.id === shopId);

  if (!activeShop) {
    return <ShopNotFound />;
  }

  return (
    <>
      <VirtualShopTabs shopId={activeShop.id}>{children}</VirtualShopTabs>
    </>
  );
}
