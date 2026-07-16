"use client";

import { cn } from "@/lib/cn";
import type { db } from "@/lib/db";
import {
  InvoiceRedo,
  Technician,
  TechnicianImage,
  VehicleParts,
} from "@prisma/client";
import { ChevronDown, ChevronUp } from "lucide-react";
import React from "react";
import LaborItems from "./LaborItems";
import ReDoModal from "./ReDoModal";

type TProps = {
  invoiceTechnicians: (Technician & { name: string })[];
  openService: number | null;
  setOpenService: React.Dispatch<React.SetStateAction<number | null>>;
  items: Awaited<
    ReturnType<
      typeof db.invoiceItem.findMany<{
        include: {
          service: true;
          materials: true;
          labor: true;
        };
      }>
    >
  >;
  invoiceStatus: string | undefined;
  invoiceId: string;
  writePermission: boolean;
  techniciansPerItem: Record<
    number,
    (Technician & {
      name: string;
      hasPermission: boolean;
      vehicleParts: VehicleParts[];
      images?: TechnicianImage[];
    })[]
  >;
  redoPerService: Record<number, InvoiceRedo[]>;
};

export function InvoiceItems({
  items = [],
  invoiceTechnicians,
  invoiceStatus,
  invoiceId,
  writePermission,
  techniciansPerItem,
  redoPerService,
  openService,
  setOpenService,
}: TProps) {
  // const [openService, setOpenService] = useState<number | null>(null);
  return items?.map((item) => {
    if (!item.service) return null;
    return (
      <div
        key={item.id}
        className="overflow-y-auto rounded-md border border-primary py-2"
      >
        <div
          className={cn(
            "flex w-full cursor-pointer justify-between text-primary",
            openService && "border-b py-2",
          )}
          onClick={() =>
            setOpenService(openService === item.id ? null : item.id)
          }
        >
          <p className="px-5">{item.service.name}</p>
          <div className="mr-5 flex items-center space-x-3">
            {invoiceTechnicians?.length > 0 && (
              <ReDoModal
                invoiceId={item?.invoiceId as string}
                serviceId={item?.serviceId as number}
                technicians={invoiceTechnicians}
                invoiceStatus={invoiceStatus}
                existingRedos={
                  redoPerService?.[item?.serviceId as number] ?? []
                }
                parentInvoiceId={invoiceId}
              />
            )}
            <button
              type="button"
              onClick={() =>
                setOpenService(openService === item.id ? null : item.id)
              }
              className="flex items-center gap-1"
            >
              {openService === item.id ? (
                <ChevronUp size={20} />
              ) : (
                <ChevronDown size={20} />
              )}
            </button>
          </div>
        </div>

        {openService === item.id && (
          <div className="my-2 grid w-full grid-cols-1 gap-1 text-primary">
            {item.materials.map((material, index) => (
              <div key={index} className="ml-10">
                <p className="capitalize">{material.name}</p>
              </div>
            ))}

            <div className="ml-10">
              <p className="font-bold capitalize">{item.labor?.name}</p>
            </div>

            <LaborItems
              invoiceItemId={item?.id}
              invoiceId={item?.invoiceId as string}
              serviceId={item?.serviceId as number}
              writePermission={writePermission}
              technicianList={(techniciansPerItem[item.id] || []) as any}
            />
          </div>
        )}
      </div>
    );
  });
}
