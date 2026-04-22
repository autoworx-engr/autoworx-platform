import GiftCardsTab from "../../../components/GiftCardsTab";

type VirtualShopGiftCardsPageProps = {
  params: Promise<{
    shopId: string;
  }>;
};

export default async function VirtualShopGiftCardsPage({
  params,
}: VirtualShopGiftCardsPageProps) {
  const resolvedParams = await params;
  const shopId = Number.parseInt(resolvedParams.shopId, 10);

  return <GiftCardsTab shopId={Number.isFinite(shopId) ? shopId : 0} />;
}
