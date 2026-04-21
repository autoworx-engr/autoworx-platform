import FinancialTab from "../../../components/FinancialTab";

type VirtualShopFinancialPageProps = {
  params: {
    shopId: string;
  };
};

export default function VirtualShopFinancialPage({
  params,
}: VirtualShopFinancialPageProps) {
  const shopId = Number.parseInt(params.shopId, 10);

  return <FinancialTab shopId={Number.isFinite(shopId) ? shopId : 0} />;
}
