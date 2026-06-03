import FinancialTab from "../../../components/FinancialTab";
import { Metadata } from "next";

type VirtualShopFinancialPageProps = {
  params: Promise<{
    shopId: string;
  }>;
};

export const metadata: Metadata = {
  title: "Virtual Shop Financial",
  description: "View and manage your virtual shop financial overview.",
};

export default async function VirtualShopFinancialPage({
  params,
}: VirtualShopFinancialPageProps) {
  const resolvedParams = await params;
  const shopId = Number.parseInt(resolvedParams.shopId, 10);

  return <FinancialTab shopId={Number.isFinite(shopId) ? shopId : 0} />;
}
