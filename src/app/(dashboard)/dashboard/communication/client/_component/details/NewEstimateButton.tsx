"use client";

import { createDraftEstimate } from "@/actions/estimate/invoice/createDraft";
import { useClientCommunicationStore } from "@/stores/client-store";
import type { Vehicle } from "@prisma/client";
import { FileText } from "lucide-react";
import { customAlphabet } from "nanoid";
import { useRouter } from "next/navigation";
import { useTransition } from "react";

type TProps = { clientId: number; vehicles?: Partial<Vehicle>[] };

export default function NewEstimateButton({ clientId, vehicles = [] }: TProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const selectedVehicleIndex = useClientCommunicationStore(
    (state) => state.selectedVehicleIndex,
  );

  const handleCreate = () => {
    startTransition(async () => {
      const id = customAlphabet("1234567890", 10)();
      const data: { id: string; clientId: number; vehicleId?: number } = {
        id,
        clientId,
      };
      if (vehicles.length > 0) {
        const idx = Math.min(
          Math.max(selectedVehicleIndex, 0),
          vehicles.length - 1,
        );
        data.vehicleId = vehicles[idx]?.id;
      }
      const res = await createDraftEstimate(data);
      if (res?.type === "success" && res.data?.id) {
        router.push(`/dashboard/estimate/view/${res.data.id}`);
      }
    });
  };

  return (
    <button
      type="button"
      onClick={handleCreate}
      disabled={pending}
      className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-[#CDE4E6] bg-[#CDE4E6] px-4 py-2.5 text-xs font-semibold text-[#006D77] transition hover:bg-[#b9d9dc] disabled:cursor-not-allowed disabled:opacity-50 2xl:text-sm"
    >
      <FileText className="h-4 w-4" />
      <span>{pending ? "Creating..." : "New Estimate"}</span>
    </button>
  );
}
