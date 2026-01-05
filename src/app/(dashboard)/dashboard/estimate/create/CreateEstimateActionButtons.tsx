"use client";

import { cn } from "@/lib/cn";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import DeleteEstimateButton from "./DeleteEstimateButton";
import { Column } from "@prisma/client";
import { MessageCircleMore } from "lucide-react";
import DirectShareButton from "../DirectShareButton";

const btnCN = cn(
  "flex items-center gap-2 rounded-md bg-slate-100 px-3 py-1 hover:bg-slate-200"
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
