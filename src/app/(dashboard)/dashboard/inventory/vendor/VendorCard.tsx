"use client";
import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import EditVendor from "@/components/Lists/EditVendor";
import { deleteVendor } from "@/actions/vendor/deleteVendor";
import { useRouter } from "next/navigation";
import { Vendor } from "@prisma/client";
import moment from "moment";
import VendorListStore from "@/stores/vendorListStore";
import { Popconfirm } from "antd";
import { Building2, Calendar, Link, Phone, SquarePen, X } from "lucide-react";
import { useDemoVendorFilterStore } from "@/stores/vendorFilter";

const SHADOW_COLOR = "shadow-lg shadow-slate-900/10 dark:shadow-white/5";
const BASE_TEXT_COLOR = "text-slate-600 dark:text-white";
const INFO_TEXT_COLOR = "text-slate-500 dark:text-slate-400";
const ACCENT_COLOR = "#6571FF";

const VendorCard = ({
  vendors,
  vendorId,
}: {
  vendors: Vendor[];
  vendorId: number;
}) => {
  const router = useRouter();
  const [mounted, setMounted] = useState<boolean>(false);
  const { searchTerm } = useDemoVendorFilterStore();
  const { isActive, setActive } = VendorListStore();

  useEffect(() => {
    setActive(!!vendorId);
  }, [vendorId, setActive]);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

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
    <div className={`${isActive ? "hidden" : ""} grid gap-4 lg:hidden`}>
      {filterVendor?.map((vendor) => (
        <Card
          key={vendor.id}
          // Refined container style: soft shadow, rounded corners, better background contrast
          className={`overflow-hidden rounded-xl border-slate-200 dark:border-slate-700 ${SHADOW_COLOR} bg-white dark:bg-slate-800/80 transition-shadow duration-300 hover:shadow-2xl`}
        >
          <CardContent className="pt-4 px-5">
            <div className="grid gap-4">
              {/* 1. Header: Name, Company, and Actions */}
              <div className="flex items-start justify-between">
                {/* Left: Vendor Info (Clickable area) */}
                <div
                  // Use group/hover styles to indicate clickability
                  onClick={() => {
                    router.push(
                      `/dashboard/inventory/vendor?vendorId=${vendor.id}`,
                    );
                    setActive(true);
                  }}
                  className="group cursor-pointer pr-3"
                >
                  {/* Vendor Name: Primary Color, Bold, Hover effect */}
                  <p
                    className={`text-xl font-extrabold text-[${ACCENT_COLOR}] group-hover:text-blue-500 transition-colors duration-200`}
                  >
                    {vendor.name}
                  </p>
                  {/* Company Name: Secondary detail */}
                  <p
                    className={`text-sm ${INFO_TEXT_COLOR} flex items-center gap-1 mt-0.5`}
                  >
                    <Building2 size={14} className="text-slate-500" />
                    {vendor.companyName}
                  </p>
                </div>

                {/* Right: Action Buttons (Edit & Delete) */}
                <div className="flex gap-2 flex-shrink-0">
                  {/* Edit Button: Encased in a soft, clickable container */}
                  <EditVendor
                    vendor={vendor}
                    button={
                      <button
                        type="button"
                        // Consistent edit button style: soft background, primary icon color
                        className={`rounded-full transition-all duration-200 hover:bg-slate-100 dark:hover:bg-slate-700 group`}
                      >
                        <SquarePen
                          className={`w-5 h-5 text-[${ACCENT_COLOR}] group-hover:scale-[1.05] transition-transform`}
                          style={{ color: ACCENT_COLOR }} // Ensure dynamic color application
                        />
                      </button>
                    }
                  />

                  {/* Delete Button: Use Red accent for destructive action */}
                  <Popconfirm
                    title={`Are you sure you want to delete vendor: ${vendor.name}?`}
                    onConfirm={async () => {
                      await deleteVendor(vendor.id);
                      router.push("/dashboard/inventory/vendor");
                    }}
                    okText="Yes, Delete"
                    cancelText="Cancel"
                  >
                    <button
                      type="button"
                      // Soft background on hover for delete button
                      className="rounded-full transition-all duration-200 hover:bg-red-500/10 group"
                    >
                      <X
                        size={24}
                        strokeWidth={2.2}
                        className="text-red-500 group-hover:scale-[1.05] transition-transform"
                      />
                    </button>
                  </Popconfirm>
                </div>
              </div>

              {/* 2. Details: Website, Phone, Join Date (Iconified) */}
              <div className="grid gap-2 text-sm pt-3 border-t border-slate-200 dark:border-slate-700">
                {/* Website Link */}
                <div className="flex items-center gap-3">
                  <Link
                    size={16}
                    className={`text-slate-500 dark:text-slate-400 min-w-[16px]`}
                  />
                  <span
                    className={`font-medium min-w-[80px] ${INFO_TEXT_COLOR}`}
                  >
                    Website:
                  </span>
                  {vendor.website ? (
                    <a
                      href={
                        vendor.website.startsWith("http")
                          ? vendor.website
                          : `http://${vendor.website}`
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`text-blue-500 hover:text-blue-400 font-normal truncate`}
                    >
                      {vendor.website}
                    </a>
                  ) : (
                    <span className="italic text-slate-400">N/A</span>
                  )}
                </div>

                {/* Phone Number */}
                <div className="flex items-center gap-3">
                  <Phone
                    size={16}
                    className={`text-slate-500 dark:text-slate-400 min-w-[16px]`}
                  />
                  <span
                    className={`font-medium min-w-[80px] ${INFO_TEXT_COLOR}`}
                  >
                    Phone:
                  </span>
                  {vendor.phone ? (
                    <a
                      href={`tel:${vendor.phone}`}
                      className={`text-emerald-500 hover:text-emerald-400 font-normal`}
                    >
                      {vendor.phone}
                    </a>
                  ) : (
                    <span className="italic text-slate-400">N/A</span>
                  )}
                </div>

                {/* Join Date */}
                <div className="flex items-center gap-3">
                  <Calendar
                    size={16}
                    className={`text-slate-500 dark:text-slate-400 min-w-[16px]`}
                  />
                  <span
                    className={`font-medium min-w-[80px] ${INFO_TEXT_COLOR}`}
                  >
                    Join Date:
                  </span>
                  <span className={`font-normal ${BASE_TEXT_COLOR}`}>
                    {moment.utc(vendor.createdAt).format("MM/DD/YYYY")}
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
