import DepositsTab from "../../../components/DepositsTab";

type VirtualShopDepositsPageProps = {
  params: Promise<{
    shopId: string;
  }>;
};

export default async function VirtualShopDepositsPage({
  params,
}: VirtualShopDepositsPageProps) {
  const resolvedParams = await params;
  const shopId = Number.parseInt(resolvedParams.shopId, 10);

  return <DepositsTab shopId={Number.isFinite(shopId) ? shopId : 0} />;
}
