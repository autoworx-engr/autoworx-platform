"use client";
import VendorListStore from "@/stores/vendorListStore";
import { Vendor } from "@prisma/client";
import {
  X,
  Building2,
  Phone,
  Mail,
  Link as LinkIcon,
  MapPin,
  FileText,
  History,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

const SHADOW_COLOR = "shadow-lg shadow-slate-900/10 dark:shadow-white/5";
const BASE_TEXT_COLOR = "text-slate-600 dark:text-white";
const INFO_TEXT_COLOR = "text-slate-500 dark:text-slate-400";
const ACCENT_COLOR = "#6571FF";

export default function Details({ vendor }: { vendor: Vendor | undefined }) {
  const { isActive, setActive } = VendorListStore();
  const router = useRouter();

  return (
    <div
      className={`${isActive ? "" : "hidden lg:block"} ${SHADOW_COLOR} relative h-[60%] overflow-y-auto w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/80 p-6 transition-shadow duration-300 hover:shadow-2xl`}
    >
      {vendor && (
        <div className="flex items-center justify-between mb-3">
          <h3
            className="text-2xl font-extrabold"
            style={{ color: ACCENT_COLOR }}
          >
            Vendor Details
          </h3>
          {/* Action Button */}
          <div className="mt-auto relative">
            <div
              className="absolute -top-1 -right-1 z-10 cursor-pointer rounded-full bg-slate-100 dark:bg-slate-700 p-0.5 border border-slate-200 dark:border-slate-600 transition-all duration-200 dark:hover:bg-slate-600"
              onClick={() => {
                setActive(false);
                router.push("/dashboard/inventory/vendor");
              }}
            >
              <X size={16} className="text-slate-600 dark:text-slate-300" />
            </div>
            <Link
              href={`/dashboard/inventory/vendor/${vendor?.id}/history`}
              className="inline-flex items-center gap-2 rounded-lg border-2 px-4 py-1.5 font-semibold transition-all duration-200 hover:shadow-md"
              style={{
                borderColor: ACCENT_COLOR,
                color: ACCENT_COLOR,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = ACCENT_COLOR;
                e.currentTarget.style.color = "white";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "transparent";
                e.currentTarget.style.color = ACCENT_COLOR;
              }}
            >
              <History size={18} />
              View Purchase History
            </Link>
          </div>
        </div>
      )}

      {vendor === undefined ? (
        <div className="flex h-full w-full items-center justify-center">
          <p className={`text-lg ${INFO_TEXT_COLOR} italic`}>
            Select a vendor to view details
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {/* Header Section: Name & Company */}
          <div className="pb-4 border-b border-slate-200 dark:border-slate-700">
            <p className={`text-xl font-bold ${BASE_TEXT_COLOR}`}>
              {vendor?.name}
            </p>
            {vendor?.companyName && (
              <div className="flex items-center gap-2 mt-1">
                <Building2 size={16} className={INFO_TEXT_COLOR} />
                <p className={`text-sm ${INFO_TEXT_COLOR}`}>
                  {vendor?.companyName}
                </p>
              </div>
            )}
          </div>

          {/* Contact Information */}
          <div className="grid gap-3 text-sm">
            {vendor?.phone && (
              <div className="flex items-center gap-3">
                <Phone
                  size={16}
                  className={`${INFO_TEXT_COLOR} min-w-[16px]`}
                />
                <span className={`font-medium min-w-[70px] ${INFO_TEXT_COLOR}`}>
                  Phone:
                </span>
                <a
                  href={`tel:${vendor?.phone}`}
                  className="text-emerald-500 hover:text-emerald-400 font-normal transition-colors"
                >
                  {vendor?.phone}
                </a>
              </div>
            )}

            {vendor?.email && (
              <div className="flex items-center gap-3">
                <Mail size={16} className={`${INFO_TEXT_COLOR} min-w-[16px]`} />
                <span className={`font-medium min-w-[70px] ${INFO_TEXT_COLOR}`}>
                  Email:
                </span>
                <a
                  href={`mailto:${vendor?.email}`}
                  className="text-blue-500 hover:text-blue-400 font-normal transition-colors truncate"
                >
                  {vendor?.email}
                </a>
              </div>
            )}

            {vendor?.website && (
              <div className="flex items-center gap-3">
                <LinkIcon
                  size={16}
                  className={`${INFO_TEXT_COLOR} min-w-[16px]`}
                />
                <span className={`font-medium min-w-[70px] ${INFO_TEXT_COLOR}`}>
                  Website:
                </span>
                <Link
                  href={
                    vendor?.website.startsWith("http")
                      ? vendor?.website
                      : `http://${vendor?.website}`
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-500 hover:text-blue-400 font-normal transition-colors truncate"
                >
                  {vendor?.website}
                </Link>
              </div>
            )}
          </div>

          {/* Address Section */}
          {(vendor?.address ||
            vendor?.city ||
            vendor?.state ||
            vendor?.zip) && (
            <div className="pt-3 border-t border-slate-200 dark:border-slate-700">
              <div className="flex items-start gap-3">
                <MapPin
                  size={16}
                  className={`${INFO_TEXT_COLOR} min-w-[16px] mt-0.5`}
                />
                <div className="flex gap-1">
                  <span className={`font-medium ${INFO_TEXT_COLOR}`}>
                    Address:
                  </span>
                  <div
                    className={`flex flex-col justify-start text-sm ${BASE_TEXT_COLOR}`}
                  >
                    {vendor?.address && <p>{vendor?.address}</p>}
                    {(vendor?.city || vendor?.state || vendor?.zip) && (
                      <p>
                        {vendor?.city}
                        {vendor?.city && vendor?.state ? ", " : ""}
                        {vendor?.state} {vendor?.zip}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Notes Section */}
          {vendor?.notes && (
            <div className="pt-3 border-t border-slate-200 dark:border-slate-700">
              <div className="flex items-start gap-3">
                <FileText
                  size={16}
                  className={`${INFO_TEXT_COLOR} min-w-[16px] mt-0.5`}
                />
                <div className="flex flex-col gap-1">
                  <span className={`font-medium ${INFO_TEXT_COLOR}`}>
                    Notes:
                  </span>
                  <p className={`text-sm ${BASE_TEXT_COLOR}`}>
                    {vendor?.notes}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
