"use client";

import EditVendor from "@/components/Lists/EditVendor";
import { useCompanyTimezone } from "@/hooks/useCompanyTimezone";
import { cn } from "@/lib/cn";
import { Vendor } from "@prisma/client";
import { Popconfirm } from "antd";
import moment from "moment-timezone";
import { useRouter } from "next/navigation";
import { FaTimes } from "react-icons/fa";
import { deleteVendor } from "../../../../../actions/vendor/deleteVendor";
import { SquarePen } from "lucide-react";

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

  return (
    <div className="hidden h-[90%] w-[70%] overflow-y-auto lg:block">
      <table className="w-[98%]">
        <thead className="bg-background">
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
          {vendors.map((vendor, index) => (
            <tr
              key={vendor.id}
              className={cn(
                "cursor-pointer rounded-md py-3",
                index % 2 === 0 ? evenColor : oddColor,
                vendorId === vendor.id && "border-2 border-[#6571FF]"
              )}
              onClick={() =>
                router.push(`/dashboard/inventory/vendor?vendorId=${vendor.id}`)
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
                  "MM/DD/YYYY"
                )}
              </td>

              <td className="mt-2 flex gap-3 px-2 py-1">
                <EditVendor
                  button={
                    <button className="text-2xl text-blue-600">
                      <SquarePen className="w-5 h-5 text-[#6571FF]" />
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
                >
                  <FaTimes className="text-xl text-red-400" />
                </Popconfirm>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
