import { getCompanyId } from "@/lib/companyId";
import { Metadata } from "next";
import Link from "next/link";
import ShopForm from "../../component/ShopForm";

export const metadata: Metadata = {
  title: "Settings - Create Shop",
  description: "Set up and configure your virtual shop.",
};

export default async function CreateShopPage() {
  const companyId = await getCompanyId();
  return (
    <div className="p-6">
      <Link href={"/dashboard/settings/virtual-shop-configure"}>
        <button className="flex w-20 items-center justify-center gap-2 rounded-xl bg-primary py-3 font-medium text-white shadow-sm transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-70">
          Back
        </button>
      </Link>

      <ShopForm companyId={companyId} />
    </div>
  );
}
