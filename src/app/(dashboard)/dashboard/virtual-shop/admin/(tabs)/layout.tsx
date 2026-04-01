import { authOptions } from "@/authOptions";
import { db } from "@/lib/db";
import { getServerSession } from "next-auth";
import ShopNotFound from "@/app/subdomain/[subdomain]/components/giftcards/ShopNotFound";
import VirtualShopTabs from "../components/VirtualShopTabs";

type VirtualShopTabsLayoutProps = {
  children: React.ReactNode;
};

export default async function VirtualShopTabsLayout({
  children,
}: VirtualShopTabsLayoutProps) {
  const session = await getServerSession(authOptions);
  const companyId = session?.user?.companyId;

  if (!companyId) {
    return <ShopNotFound />;
  }

  const shop = await db.shop.findUnique({
    where: { companyId },
    select: { id: true },
  });

  if (!shop) {
    return <ShopNotFound />;
  }

  return (
    <VirtualShopTabs>{children}</VirtualShopTabs>
  );
}
