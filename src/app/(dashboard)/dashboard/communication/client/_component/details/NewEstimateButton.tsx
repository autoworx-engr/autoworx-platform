"use client";

import { createDraftEstimate } from "@/actions/estimate/invoice/createDraft";
import { cn } from "@/lib/cn";
import { useClientCommunicationStore } from "@/stores/client-store";
import { Popconfirm } from "antd";
import { FileText } from "lucide-react";
import { customAlphabet } from "nanoid";
import { useRouter } from "next/navigation";
import { useTransition } from "react";

type Props = {
  clientId: number;
  vehicleIds?: number[];
};

export default function NewEstimateButton({
  clientId,
  vehicleIds = [],
}: Props) {
  const selectedVehicleIndex = useClientCommunicationStore(
    (state) => state.selectedVehicleIndex,
  );
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const handleCreate = () => {
    startTransition(async () => {
      const id = customAlphabet("1234567890", 10)();
      const data: { id: string; clientId: number; vehicleId?: number } = {
        id,
        clientId,
      };
      if (vehicleIds.length > 0) {
        data.vehicleId = vehicleIds[selectedVehicleIndex] ?? vehicleIds[0];
      }
      const res = await createDraftEstimate(data);
      if (res.type === "success" && res.data?.id) {
        router.push(`/dashboard/estimate/view/${res.data.id}`);
      }
    });
  };

  return (
    <Popconfirm
      title="Create a new estimate for this client?"
      onConfirm={handleCreate}
      okText="Yes"
      cancelText="No"
    >
      <button
        type="button"
        disabled={pending}
        className={cn(
          "inline-flex w-full items-center justify-center gap-1.5",
          "rounded-lg border border-[#006D77]/30 bg-white px-3 py-2 text-xs font-medium text-[#006D77]",
          "shadow-sm transition-all hover:bg-[#006D77]/5 hover:border-[#006D77]/60 active:scale-[0.98]",
          "focus:outline-none focus:ring-2 focus:ring-[#006D77]/30",
          "disabled:cursor-not-allowed disabled:opacity-50",
          "dark:bg-zinc-900 dark:hover:bg-[#006D77]/10",
        )}
      >
        <FileText className="h-3.5 w-3.5" />
        <span>New estimate</span>
      </button>
    </Popconfirm>
  );
}
