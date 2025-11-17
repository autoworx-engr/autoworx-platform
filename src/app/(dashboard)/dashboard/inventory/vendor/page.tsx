import { getCompanyId } from "@/lib/companyId";
import { db } from "@/lib/db";
import React from "react";
import Table from "./Table";
import Details from "./Details";
import Title from "@/components/Title";
import NewVendor from "@/components/Lists/NewVendor";
import TopVendors from "./TopVendors";
import VendorCard from "./VendorCard";
import VendorHeader from "../VendorHeader";

export default async function Page({
  searchParams: { vendorId },
}: {
  searchParams: { vendorId: string };
}) {
  const companyId = await getCompanyId();
  const vendors = await db.vendor.findMany({
    where: { companyId },
  });

  return (
    <div className="h-full overflow-y-hidden p-2">
      <div className="flex items-center justify-between">
        <Title>Vendor List</Title>

        <NewVendor
          button={
            <button className="rounded-md bg-[#6571FF] p-2 px-8 text-white">
              Add New Vendor
            </button>
          }
        />
      </div>
      <VendorHeader />
      <div className="mt-5 flex h-full flex-col gap-3 lg:flex-row">
        <div className="lg:hidden">
          <VendorCard vendors={vendors} vendorId={parseInt(vendorId)} />
        </div>

        <Table vendors={vendors} vendorId={parseInt(vendorId)} />

        <div className="flex flex-col gap-3 lg:w-[30%]">
          <Details vendor={vendors.find((v) => v.id === parseInt(vendorId))} />
          <TopVendors />
        </div>
      </div>
    </div>
  );
}
