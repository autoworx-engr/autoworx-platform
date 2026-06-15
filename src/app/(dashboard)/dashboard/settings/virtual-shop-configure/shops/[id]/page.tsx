import Link from "next/link";
import ShopForm from "../../component/ShopForm";
import { getCompanyId } from "@/lib/companyId";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Settings - Update Shop",
  description: "Update and configure your virtual shop settings.",
};

export default async function UpdateShopPage({ params }: { params: any }) {
  const { id } = await params;
  const companyId = await getCompanyId();

  return (
    <div className="p-6">
      <Link href={"/dashboard/settings/virtual-shop-configure"}>
        <button className="flex w-20 items-center justify-center gap-2 rounded-xl bg-[#6571FF] py-3 font-medium text-white shadow-sm transition-colors hover:bg-[#6571FF]/90 disabled:cursor-not-allowed disabled:opacity-70">
          Back
        </button>
      </Link>
      <ShopForm shopId={Number(id)} companyId={companyId} />
    </div>
  );
}
