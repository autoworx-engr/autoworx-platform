import DepositsTab from "../../../components/DepositsTab";

type VirtualShopDepositsPageProps = {
  params: {
    shopId: string;
  };
};

export default function VirtualShopDepositsPage({
  params,
}: VirtualShopDepositsPageProps) {
  const shopId = Number.parseInt(params.shopId, 10);

  return <DepositsTab shopId={Number.isFinite(shopId) ? shopId : 0} />;
}
