import NewVendor from "@/components/Lists/NewVendor";
import Title from "@/components/Title";
import { getCompanyId } from "@/lib/companyId";
import { db } from "@/lib/db";
import { hasPermissionKey } from "@/lib/serverRouteGuard";
import { Metadata } from "next";
import VendorHeader from "../VendorHeader";
import Details from "./Details";
import Table from "./Table";
import TopVendors from "./TopVendors";
import VendorCard from "./VendorCard";

export const metadata: Metadata = {
  title: "Inventory - Vendor",
  description: "Manage your vendors",
};

export default async function Page(props: {
  searchParams: Promise<{ vendorId: string }>;
}) {
  const searchParams = await props.searchParams;

  const { vendorId } = searchParams;

  const companyId = await getCompanyId();
  const vendors = await db.vendor.findMany({
    where: { companyId },
  });

  // View-only Inventory (what the Sales role has) can read the list but not
  // change it, so the write controls are hidden rather than the whole page.
  const canManageVendors = await hasPermissionKey("inventoryAll");

  return (
    <div className="h-full w-full overflow-y-auto p-2 lg:overflow-y-hidden">
      <div className="flex items-center justify-between">
        <Title>Vendor List</Title>

        {canManageVendors && (
          <NewVendor
            button={
              <button
                className="
                flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-white
                bg-gradient-to-r from-primary to-[#5a66ee]
                shadow-[0_4px_14px_0_rgba(101,113,255,0.39)]
                hover:shadow-[0_6px_20px_rgba(101,113,255,0.23)]
                hover:-translate-y-0.5
                active:translate-y-0 active:scale-100
                transition-all duration-300 ease-in-out
            "
              >
                Add New Vendor
              </button>
            }
          />
        )}
      </div>
      <VendorHeader />
      <div className="mt-5 flex h-full w-full flex-col gap-3 lg:flex-row">
        <VendorCard vendors={vendors} vendorId={parseInt(vendorId)} />

        <Table vendors={vendors} vendorId={parseInt(vendorId)} />

        <div className="flex flex-col gap-3 lg:w-[30%] lg:h-[86%] lg:overflow-y-hidden">
          <Details vendor={vendors.find((v) => v.id === parseInt(vendorId))} />
          <TopVendors />
        </div>
      </div>
    </div>
  );
}
