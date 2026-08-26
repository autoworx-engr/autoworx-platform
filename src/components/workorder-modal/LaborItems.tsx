"use client";
import { queryKeys } from "@/lib/queryKeys";
import { cn } from "@/lib/utils";
import { deleteTechnician } from "@/service/work-order/api";
import { useGetCurrentUser } from "@/utils/useGetCurrentUser";
import { Technician, TechnicianImage, VehicleParts } from "@prisma/client";
import { useQueryClient } from "@tanstack/react-query";
import { Popconfirm } from "antd";
import { CircleX } from "lucide-react";
import { useState, useTransition } from "react";
import CreateAndEditLabor from "./CreateAndEditLabor";

export default function LaborItems({
  invoiceItemId,
  invoiceId,
  serviceId,
  writePermission,
  technicianList,
  onAddTechnician,
  onUpdateTechnician,
  onDeleteTechnician,
}: {
  invoiceItemId: number;
  invoiceId: string;
  serviceId: number | null;
  writePermission: boolean;
  technicianList: (Technician & {
    name: string;
    hasPermission: boolean;
    vehicleParts: VehicleParts[];
    images: TechnicianImage[];
    isDraft?: boolean;
  })[];
  onAddTechnician?: (
    invoiceItemId: number,
    serviceId: number | null,
    payload: any,
    employeeName: string,
  ) => void;
  onUpdateTechnician?: (
    invoiceItemId: number,
    techId: number | string,
    payload: any,
  ) => void;
  onDeleteTechnician?: (invoiceItemId: number, techId: number | string) => void;
}) {
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const queryClient = useQueryClient();
  const currentUser = useGetCurrentUser();
  const companyId = currentUser?.companyId;

  const handleTechnicianDelete = async (technicianId: number | string) => {
    if (onDeleteTechnician) {
      onDeleteTechnician(invoiceItemId, technicianId);
    } else {
      if (!companyId) return;
      try {
        await deleteTechnician(companyId, invoiceId, technicianId as number);
        queryClient.invalidateQueries({
          queryKey: queryKeys.getInvoiceModalDataKey(invoiceId),
        });
        queryClient.invalidateQueries({
          queryKey: queryKeys.getWorkOrderDataKey(invoiceId),
        });
        setError("");
        const event = new CustomEvent("invoice-updated", {
          detail: { invoiceId },
        });
        window.dispatchEvent(event);
      } catch (err: any) {
        setError(err.message);
      }
    }
  };

  return (
    <div className="mx-10 h-32 overflow-y-auto rounded-md border border-solid border-primary p-2">
      {error && <p className="text-center text-sm text-red-400">{error}</p>}

      <div className="flex flex-wrap items-center gap-2">
        <CreateAndEditLabor
          invoiceItemId={invoiceItemId}
          invoiceId={invoiceId}
          serviceId={serviceId}
          technicianList={technicianList}
          writePermission={writePermission}
          onAddTechnician={onAddTechnician}
          onUpdateTechnician={onUpdateTechnician}
        />

        {technicianList.map((technician) => (
          <button
            key={technician.id}
            className={cn(
              "flex items-center justify-evenly space-x-1 text-nowrap rounded-full border bg-primary px-3 py-0.5",
              !technician.hasPermission &&
                "cursor-default border-primary bg-transparent",
            )}
          >
            <CreateAndEditLabor
              invoiceItemId={invoiceItemId}
              invoiceId={invoiceId}
              serviceId={serviceId}
              technician={technician as any}
              writePermission={writePermission}
              onUpdateTechnician={onUpdateTechnician}
              onAddTechnician={onAddTechnician}
            />
            <Popconfirm
              title={`Are you sure you want to delete this technician?`}
              onConfirm={async () => {
                startTransition(() => handleTechnicianDelete(technician.id));
              }}
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
              {writePermission && (
                <button disabled={pending}>
                  <CircleX size={20} className="text-white" />
                </button>
              )}
            </Popconfirm>
          </button>
        ))}
      </div>
    </div>
  );
}
