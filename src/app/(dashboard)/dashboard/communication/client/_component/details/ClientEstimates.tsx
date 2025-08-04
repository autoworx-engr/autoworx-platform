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
    (state) => state.selectedVehicleIndex,
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
    <div className="mt-4 flex flex-wrap items-center gap-4 text-xs">
      {estimates &&
        estimates.length > 0 &&
        estimates?.map((estimate, index) => (
          <div
            key={index}
            className="flex items-center gap-x-4 rounded-full border border-emerald-600 px-2 py-1"
          >
            <Link href={`/dashboard/estimate/view/${estimate.id}`}>
              {estimate.type === "Estimate" ? "Estimate" : "Invoice"} #
              {estimate.id}
            </Link>
          </div>
        ))}
      <Popconfirm
        title="Are you sure you want to create a new estimate?"
        onConfirm={() => startTransition(handleCreateEstimate)}
        okText="Yes"
        cancelText="No"
      >
        <button
          disabled={pending}
          className="rounded-full bg-gray-400 px-6 py-1 text-white"
        >
          <FaPlus />
        </button>
      </Popconfirm>
    </div>
  );
}
