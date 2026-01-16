"use client";

import { cn } from "@/lib/cn";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import DeleteEstimateButton from "./DeleteEstimateButton";
import { Column } from "@prisma/client";
import { MessageCircleMore } from "lucide-react";
import DirectShareButton from "../DirectShareButton";


const btnCN = cn(
  "flex items-center justify-center gap-2 rounded-xl bg-[#6571FF] px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-[#6571FF]/25 transition-all hover:scale-[1.02] hover:bg-[#5662ef] active:scale-95 disabled:opacity-50"
);

export function CreateEstimateActionsButtons({ status }: { status: Column }) {
  const clientId = useSearchParams()?.get("clientId");
  const router = useRouter();
  const params = useParams();
  const { id } = params as { id: string };

  return (
    <div className="flex flex-wrap items-stretch gap-3">
      <DirectShareButton />
      <button
        onClick={() => {
          if (clientId) {
            router.push(`/dashboard/communication/client/${clientId}`);
          }
        }}
        className={btnCN}
      >
        <MessageCircleMore size={18} />
        Message
      </button>
      {status?.title !== "Delivered" && id && <DeleteEstimateButton />}
    </div>
  );
}
