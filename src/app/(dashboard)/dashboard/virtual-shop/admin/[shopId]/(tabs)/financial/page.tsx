import FinancialTab from "../../../components/FinancialTab";

type VirtualShopFinancialPageProps = {
  params: Promise<{
    shopId: string;
  }>;
};

export default async function VirtualShopFinancialPage({
  params,
}: VirtualShopFinancialPageProps) {
  const resolvedParams = await params;
  const shopId = Number.parseInt(resolvedParams.shopId, 10);

  return <FinancialTab shopId={Number.isFinite(shopId) ? shopId : 0} />;
}
