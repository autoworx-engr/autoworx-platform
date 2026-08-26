"use client";

import EditVendor from "@/components/Lists/EditVendor";
import { useCompanyTimezone } from "@/hooks/useCompanyTimezone";
import { cn } from "@/lib/cn";
import { useDemoVendorFilterStore } from "@/stores/vendorFilter";
import VendorListStore from "@/stores/vendorListStore";
import { Vendor } from "@prisma/client";
import { Popconfirm } from "antd";
import { PencilLineIcon, X } from "lucide-react";
import moment from "moment-timezone";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { deleteVendor } from "../../../../../actions/vendor/deleteVendor";

const evenColor = "bg-background";
const oddColor = "bg-[#F8FAFF]";

export default function Table({
  vendors,
  vendorId,
}: {
  vendors: Vendor[];
  vendorId: number;
}) {
  const router = useRouter();
  const timezone = useCompanyTimezone();
  const { searchTerm } = useDemoVendorFilterStore();
  const { setActive } = VendorListStore();

  useEffect(() => {
    setActive(!!vendorId);
  }, [vendorId, setActive]);

  const term = searchTerm.trim().toLowerCase();
  const filterVendor = vendors?.filter((vendor) => {
    return (
      vendor.name?.toLowerCase().includes(term) ||
      vendor.companyName?.toLowerCase().includes(term) ||
      vendor.website?.toLowerCase().includes(term) ||
      vendor.phone?.toLowerCase().includes(term)
    );
  });
  return (
    <div className="hidden h-[85%] w-[70%] rounded-xl border bg-background p-4 shadow-sm lg:flex lg:flex-col">
      <div className="h-full w-full overflow-y-auto">
        <table className="relative w-full rounded-xl">
          <thead className="bg-background sticky top-0 z-10">
            <tr className="h-10 border-b">
              <th className="px-2 text-left">#</th>
              <th className="px-4 text-left">Name</th>
              <th className="px-4 text-left">Company Name</th>
              <th className="px-2 text-left">Phone</th>
              <th className="px-2 text-left">Website</th>
              <th className="px-2 text-left">Join Date</th>
              <th className="px-2 text-left">Action</th>
            </tr>
          </thead>

          <tbody>
            {filterVendor?.map((vendor, index) => (
              <tr
                key={vendor.id}
                className={cn(
                  "cursor-pointer rounded-md py-3",
                  index % 2 === 0 ? evenColor : oddColor,
                  vendorId === vendor.id && "border-2 border-primary",
                )}
                onClick={() =>
                  router.push(
                    `/dashboard/inventory/vendor?vendorId=${vendor.id}`,
                  )
                }
              >
                <td className="h-12 px-2 py-1 text-left">
                  <p>{index + 1}</p>
                </td>
                <td className="max-w-40 px-4 py-1 text-left">{vendor.name}</td>
                <td className="max-w-40 px-4 py-1 text-left">
                  {vendor.companyName}
                </td>
                <td className="text-nowrap px-2 py-1 text-left">
                  {vendor.phone}
                </td>
                <td className="px-2 py-1 text-left">{vendor.website}</td>
                <td className="px-2 py-1 text-left">
                  {/* {moment.utc(vendor.createdAt).format("DD MMM YYYY, hh:mm A")} */}
                  {moment.tz(vendor.createdAt, timezone).format(
                    // date.month.year
                    "MM/DD/YYYY",
                  )}
                </td>

                <td className="mt-2 flex gap-3 px-2 py-1">
                  <EditVendor
                    button={
                      <button className="text-2xl text-blue-600">
                        <PencilLineIcon className="w-5 h-5 text-primary" />
                      </button>
                    }
                    vendor={vendor}
                  />
                  <Popconfirm
                    title={`Are you sure you want to delete this vendor?`}
                    onConfirm={async () => {
                      await deleteVendor(vendor.id);
                      router.push("/dashboard/inventory/vendor");
                    }}
                    okText="Yes"
                    cancelText="No"
                    overlayClassName="[&_.ant-popover-inner]:rounded-2xl [&_.ant-popover-inner]:p-4 [&_.ant-popover-message-title]:font-semibold [&_.ant-popover-message-title]:text-slate-800"
                    okButtonProps={{
                      className:
                        "!rounded-lg !border-none !bg-[#6571ff] !font-semibold !shadow-sm !shadow-[#6571ff]/30 hover:!bg-[#525ceb]",
                    }}
                    cancelButtonProps={{
                      className:
                        "!rounded-lg !border-slate-200 !font-medium !text-slate-600 hover:!border-slate-300 hover:!bg-slate-50 hover:!text-slate-700",
                    }}
                  >
                    <X size={20} strokeWidth={3} className="text-red-400" />
                  </Popconfirm>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
