import DepositsTab from "../../../components/DepositsTab";

import { Metadata } from "next";

type VirtualShopDepositsPageProps = {
  params: Promise<{
    shopId: string;
  }>;
};

export const metadata: Metadata = {
  title: "Virtual Shop Deposits",
  description: "View and manage your virtual shop deposits.",
};

export default async function VirtualShopDepositsPage({
  params,
}: VirtualShopDepositsPageProps) {
  const resolvedParams = await params;
  const shopId = Number.parseInt(resolvedParams.shopId, 10);

  return <DepositsTab shopId={Number.isFinite(shopId) ? shopId : 0} />;
}
