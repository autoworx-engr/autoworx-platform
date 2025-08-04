"use client";
import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import EditVendor from "@/components/Lists/EditVendor";
import { CiEdit } from "react-icons/ci";
import { deleteVendor } from "@/actions/vendor/deleteVendor";
import { useRouter } from "next/navigation";
import { Vendor } from "@prisma/client";
import { FaTimes } from "react-icons/fa";
import moment from "moment";
import VendorListStore from "@/stores/vendorListStore";
import { Popconfirm } from "antd";

const VendorCard = ({
  vendors,
  vendorId,
}: {
  vendors: Vendor[];
  vendorId: number;
}) => {
  const router = useRouter();
  const [mounted, setMounted] = useState<boolean>(false);

  const { isActive, setActive } = VendorListStore();

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  return (
    <div className={`${isActive ? "hidden" : ""} grid gap-4 lg:hidden`}>
      {vendors.map((vendor) => (
        <Card key={vendor.id}>
          <CardContent className="pt-4 font-medium text-[#66738C]">
            <div className="grid gap-2">
              <div className="flex items-start justify-between">
                <div
                  onClick={() => {
                    router.push(
                      `/dashboard/inventory/vendor?vendorId=${vendor.id}`,
                    );
                    setActive(true);
                  }}
                >
                  <p className="text-lg font-semibold text-[#6571FF]">
                    {vendor.name}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {vendor.companyName}
                  </p>
                </div>
                <div className="flex gap-2">
                  <EditVendor
                    button={
                      <button className="text-2xl text-blue-600">
                        <CiEdit />
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
                </div>
              </div>
              <div className="grid gap-1 text-sm">
                <div className="flex gap-3">
                  <span className="text-muted-foreground">Website:</span>
                  <span>{vendor.website}</span>
                </div>
                <div className="flex gap-3">
                  <span className="text-muted-foreground">Phone:</span>
                  <span>{vendor.phone}</span>
                </div>
                <div className="flex gap-3">
                  <span className="text-muted-foreground">Join Date:</span>
                  <span>
                    {moment.utc(vendor.createdAt).format(
                      // date.month.year
                      "MM/DD/YYYY",
                    )}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default VendorCard;
