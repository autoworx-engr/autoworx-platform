import SchedulingTab from "../../../components/SchedulingTab";
import { Metadata } from "next";

type VirtualShopSchedulingPageProps = {
  params: Promise<{
    shopId: string;
  }>;
};

export const metadata: Metadata = {
  title: "Virtual Shop Scheduling",
  description: "View and manage your virtual shop scheduling and availability.",
};

export default async function VirtualShopSchedulingPage({
  params,
}: VirtualShopSchedulingPageProps) {
  const resolvedParams = await params;
  const shopId = Number.parseInt(resolvedParams.shopId, 10);

  return <SchedulingTab shopId={Number.isFinite(shopId) ? shopId : 0} />;
}
