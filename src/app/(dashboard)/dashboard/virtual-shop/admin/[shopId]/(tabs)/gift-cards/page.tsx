import GiftCardsTab from "../../../components/GiftCardsTab";

type VirtualShopGiftCardsPageProps = {
  params: {
    shopId: string;
  };
};

export default function VirtualShopGiftCardsPage({
  params,
}: VirtualShopGiftCardsPageProps) {
  const shopId = Number.parseInt(params.shopId, 10);

  return <GiftCardsTab shopId={Number.isFinite(shopId) ? shopId : 0} />;
}
