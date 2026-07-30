import GiftCardsTab from "../../../components/GiftCardsTab";
import { Metadata } from "next";

type VirtualShopGiftCardsPageProps = {
  params: Promise<{
    shopId: string;
  }>;
};

export const metadata: Metadata = {
  title: "Virtual Shop Gift Cards",
  description: "View and manage your virtual shop gift cards.",
};

export default async function VirtualShopGiftCardsPage({
  params,
}: VirtualShopGiftCardsPageProps) {
  const resolvedParams = await params;
  const shopId = Number.parseInt(resolvedParams.shopId, 10);

  return <GiftCardsTab shopId={Number.isFinite(shopId) ? shopId : 0} />;
}
