"use client";
import { createDraftEstimate } from "@/actions/estimate/invoice/createDraft";
import { useClientCommunicationStore } from "@/stores/client-store";
import { Invoice, Vehicle } from "@prisma/client";
import { Popconfirm } from "antd";
import { customAlphabet } from "nanoid";
import Link from "next/link";
import React, { useState } from "react";
import { FaPlus } from "react-icons/fa";

type TProps = {
  estimates?: Partial<Invoice>[] | null;
  vehicles?: Partial<Vehicle>[];
  clientId: number;
};

export default function ClientEstimates({
  estimates: initialEstimates = [],
  vehicles = [],
  clientId,
}: TProps) {
  const [estimates, setEstimates] = useState(initialEstimates);
  const selectedVehicleIndex = useClientCommunicationStore(
    (state) => state.selectedVehicleIndex
  );
  const [pending, startTransition] = React.useTransition();
  // estimate create handler
  const handleCreateEstimate = async () => {
    const newId = customAlphabet("1234567890", 10)();
    let estimateData: { id: string; clientId: number; vehicleId?: number } = {
      id: newId,
      clientId,
    };
    if (vehicles.length > 0) {
      estimateData.vehicleId = vehicles[selectedVehicleIndex].id;
    }
    const res = await createDraftEstimate(estimateData);

    if (res.type === "success") {
      setEstimates((prev: any) => [...prev, res.data]);
    }
  };
  return (
    <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
      {/* existing estimates / invoices */}
      {estimates?.length ? (
        estimates.map((estimate) => (
          <Link
            key={estimate.id}
            href={`/dashboard/estimate/view/${estimate.id}`}
            className="flex items-center gap-1.5 rounded-full border border-emerald-600 px-3 py-1.5 text-emerald-700 transition-colors hover:bg-emerald-50 dark:border-emerald-500 dark:text-emerald-400 dark:hover:bg-emerald-500/10"
          >
            <span className="font-medium">
              {estimate.type === "Estimate" ? "Estimate" : "Invoice"} #
              {estimate.id}
            </span>
          </Link>
        ))
      ) : (
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          No estimates or invoices yet.
        </p>
      )}

      {/* add new estimate */}
      <Popconfirm
        title="Are you sure you want to create a new estimate?"
        onConfirm={() => startTransition(handleCreateEstimate)}
        okText="Yes"
        cancelText="No"
      >
        <button
          disabled={pending}
          className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-600 text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
          aria-label="Create new estimate"
        >
          <FaPlus className="h-3.5 w-3.5" />
        </button>
      </Popconfirm>
    </div>
  );
}
