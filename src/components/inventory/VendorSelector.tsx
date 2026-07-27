"use client";

import NewVendor from "@/components/Lists/NewVendor";
import Selector from "@/components/Selector";
import { useListsStore } from "@/stores/lists";
import { Vendor } from "@prisma/client";
import { useState } from "react";

type Props = {
  label?: string;
  selectedVendor: Vendor | null;
  onVendorChange: (vendor: Vendor | null) => void;
  border?: boolean;
};

export default function VendorSelector({
  label,
  selectedVendor,
  onVendorChange,
  border,
}: Props) {
  const { vendors } = useListsStore();
  const [open, setOpen] = useState(false);

  return (
    <div>
      {label && <label className="font-medium text-slate-600">{label}</label>}
      <Selector
        label={(v: Vendor | null) =>
          v ? v.companyName || v.name || `Vendor ${v.id}` : "Vendor"
        }
        newButton={
          <NewVendor
            afterSubmit={(ven) => {
              onVendorChange(ven);
              setOpen(false);
            }}
            button={
              <button
                type="button"
                className="text-xs text-primary hover:underline"
              >
                + New Vendor
              </button>
            }
          />
        }
        displayList={(v: Vendor) => <p>{v.companyName || v.name}</p>}
        items={vendors}
        onSearch={(search: string) =>
          vendors.filter(
            (v) =>
              v.companyName?.toLowerCase().includes(search.toLowerCase()) ||
              (v.name?.toLowerCase() || "").includes(search.toLowerCase()),
          )
        }
        openState={[open, setOpen]}
        selectedItem={selectedVendor}
        setSelectedItem={(value) => {
          const resolved =
            typeof value === "function" ? value(selectedVendor) : value;
          onVendorChange(resolved);
        }}
        border={border}
      />
    </div>
  );
}
