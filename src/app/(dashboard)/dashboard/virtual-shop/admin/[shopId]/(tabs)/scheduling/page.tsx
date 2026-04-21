import SchedulingTab from "../../../components/SchedulingTab";

type VirtualShopSchedulingPageProps = {
  params: Promise<{
    shopId: string;
  }>;
};

export default async function VirtualShopSchedulingPage({
  params,
}: VirtualShopSchedulingPageProps) {
  const resolvedParams = await params;
  const shopId = Number.parseInt(resolvedParams.shopId, 10);

  return <SchedulingTab shopId={Number.isFinite(shopId) ? shopId : 0} />;
}
