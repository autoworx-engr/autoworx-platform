import SchedulingTab from "../../../components/SchedulingTab";

type VirtualShopSchedulingPageProps = {
  params: {
    shopId: string;
  };
};

export default function VirtualShopSchedulingPage({
  params,
}: VirtualShopSchedulingPageProps) {
  const shopId = Number.parseInt(params.shopId, 10);

  return <SchedulingTab shopId={Number.isFinite(shopId) ? shopId : 0} />;
}
