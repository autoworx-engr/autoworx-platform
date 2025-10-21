"use client";
import VendorListStore from "@/stores/vendorListStore";
import { Vendor } from "@prisma/client";
import { X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function Details({ vendor }: { vendor: Vendor | undefined }) {
  const { isActive, setActive } = VendorListStore();
  const router = useRouter();

  return (
    <div
      className={`${isActive ? "" : "hidden lg:block"} app-shadow relative h-[60%] w-full rounded-lg bg-background p-5`}
    >
      <div
        className="absolute right-2 top-2 cursor-pointer lg:hidden"
        onClick={() => {
          setActive(false);
          router.back();
        }}
      >
        <X size={24} />
      </div>
      <h3 className="text-xl font-bold">Vendor Details</h3>

      {vendor === undefined ? (
        <div className="flex h-full w-full items-center justify-center">
          <p>Select a vendor to view details</p>
        </div>
      ) : (
        <div className="flex flex-col gap-1 p-3 py-2  text-sm">
          {vendor?.name && <p>Contact Name: {vendor?.name}</p>}
          {vendor?.companyName && <p>Company Name: {vendor?.companyName}</p>}
          {vendor?.phone && <p>Phone: {vendor?.phone}</p>}
          {vendor?.email && <p>Email: {vendor?.email}</p>}
          {vendor?.website && (
            <p>
              Website:
              <Link
                href={vendor?.website || ""}
                target="_blank"
                rel="noopener noreferrer"
                className="break-all max-w-[250px]  hover:underline"
              >
                {vendor?.website}
              </Link>
            </p>
          )}
          {vendor?.address && <p>Address: {vendor?.address}</p>}
          {vendor?.city && <p>City: {vendor?.city}</p>}
          {vendor?.state && <p>State: {vendor?.state}</p>}
          {vendor?.zip && <p>Zip: {vendor?.zip}</p>}

          {vendor?.notes && <p>Notes: {vendor?.notes}</p>}
          <div className="absolute bottom-3 right-2">
            <Link
              href={`/dashboard/inventory/vendor/${vendor?.id}/history`}
              className="rounded-md border border-[#6571FF] p-2 px-5 text-[#6571FF] transition-all hover:bg-[#6571FF] hover:text-white"
            >
              View Purchase History
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
