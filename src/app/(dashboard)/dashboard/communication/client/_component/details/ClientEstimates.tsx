"use client";
import { createDraftEstimate } from "@/actions/estimate/invoice/createDraft";
import { fetchClientEstimates } from "@/actions/estimate/invoice/fetchClientEstimates";
import { useClientCommunicationStore } from "@/stores/client-store";
import { Invoice, Vehicle } from "@prisma/client";
import { Popconfirm } from "antd";
import { Plus } from "lucide-react";
import { customAlphabet } from "nanoid";
import Link from "next/link";
import React, { useState } from "react";

type TProps = {
  estimates?: Partial<Invoice>[] | null;
  vehicles?: Partial<Vehicle>[];
  clientId: number;
  totalCount?: number;
};

export default function ClientEstimates({
  estimates: initialEstimates = [],
  vehicles = [],
  clientId,
  totalCount = 0,
}: TProps) {
  const [estimates, setEstimates] = useState(initialEstimates);
  const [loadingMore, setLoadingMore] = useState(false);
  const selectedVehicleIndex = useClientCommunicationStore(
    (state) => state.selectedVehicleIndex,
  );
  const [pending, startTransition] = React.useTransition();

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

  const handleLoadMore = async () => {
    setLoadingMore(true);
    const rest = await fetchClientEstimates(clientId, estimates?.length ?? 5);
    setEstimates((prev: any) => [...(prev ?? []), ...rest]);
    setLoadingMore(false);
  };

  const hasMore = totalCount > (estimates?.length ?? 0);

  return (
    <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
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

      {hasMore && (
        <button
          onClick={handleLoadMore}
          disabled={loadingMore}
          className="text-xs text-zinc-500 hover:text-emerald-600 dark:text-zinc-400 dark:hover:text-emerald-400 transition-colors disabled:opacity-50"
        >
          {loadingMore
            ? "Loading..."
            : `+${totalCount - (estimates?.length ?? 0)} more`}
        </button>
      )}

      {/* add new estimate */}
      <Popconfirm
        title="Are you sure you want to create a new estimate?"
        onConfirm={() => startTransition(handleCreateEstimate)}
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
        <button
          disabled={pending}
          className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-600 text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
          aria-label="Create new estimate"
        >
          <Plus className="h-5 w-5" />
        </button>
      </Popconfirm>
    </div>
  );
}
