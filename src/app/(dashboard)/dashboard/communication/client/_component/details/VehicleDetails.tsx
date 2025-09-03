"use client";

import { useClientCommunicationStore } from "@/stores/client-store";
import type { Service, Vehicle } from "@prisma/client";
import { FaArrowLeft, FaArrowRight } from "react-icons/fa";
import { cn } from "@/lib/cn";

type TProps = {
  vehicles: Partial<Vehicle>[];
  isLeadClient: boolean;
  invoices: Array<{
    vehicle: Partial<Vehicle> | null;
    invoiceItems: Array<{ service: Service | null }>;
  }>;
  singleService: string;
};

export default function VehicleDetails({
  vehicles,
  isLeadClient,
  invoices,
  singleService,
}: TProps) {
  const { selectedVehicleIndex, setVehicleIndex } =
    useClientCommunicationStore();

  const total = vehicles?.length || 0;
  const hasVehicles = total > 0;
  const currentIndex = hasVehicles
    ? Math.min(Math.max(selectedVehicleIndex, 0), total - 1)
    : 0;

  const vehicle = hasVehicles ? vehicles[currentIndex] : undefined;

  const relatedInvoices = hasVehicles
    ? invoices.filter((inv) => {
        const v = inv.vehicle;
        return (
          v?.model === vehicle?.model &&
          v?.make === vehicle?.make &&
          v?.year === vehicle?.year
        );
      })
    : [];

  const services: Service[] =
    relatedInvoices
      .flatMap((inv) => inv.invoiceItems.map((ii) => ii.service))
      .filter((s): s is Service => !!s) ?? [];

  const goPrev = () =>
    hasVehicles &&
    setVehicleIndex(currentIndex > 0 ? currentIndex - 1 : total - 1);

  const goNext = () =>
    hasVehicles &&
    setVehicleIndex(currentIndex < total - 1 ? currentIndex + 1 : 0);

  return (
    <div className="space-y-4 rounded-xl bg-[#63a6ac]/95 p-4 text-sm text-white shadow-sm">
      <div className="flex items-center justify-between gap-x-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-lg bg-white/15 px-2 py-1 text-xs font-semibold">
            {hasVehicles ? `Vehicle ${currentIndex + 1} / ${total}` : "Vehicle"}
          </span>
          <span className="truncate">
            {hasVehicles
              ? `${vehicle?.year ?? ""} ${vehicle?.make ?? ""} ${vehicle?.model ?? ""}`.trim()
              : "No vehicles added"}
          </span>
          {isLeadClient && (
            <span className="rounded-full bg-white/15 px-2 py-0.5 text-[10px] font-medium">
              Lead
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={goPrev}
            disabled={!hasVehicles || total < 2}
            className={cn(
              "flex h-7 w-7 items-center justify-center rounded-full ring-1 ring-white/60 transition",
              "hover:bg-white/15 disabled:opacity-40 disabled:hover:bg-transparent"
            )}
            aria-label="Previous vehicle"
          >
            <FaArrowLeft className="h-3.5 w-3.5" />
          </button>

          <button
            type="button"
            onClick={goNext}
            disabled={!hasVehicles || total < 2}
            className={cn(
              "flex h-7 w-7 items-center justify-center rounded-full ring-1 ring-white/60 transition",
              "hover:bg-white/15 disabled:opacity-40 disabled:hover:bg-transparent"
            )}
            aria-label="Next vehicle"
          >
            <FaArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div>
        <p className="mb-2 font-semibold">Service Requested :</p>

        {hasVehicles ? (
          <ul className="thin-scrollbar max-h-40 list-inside list-disc overflow-y-auto pr-2">
            {singleService && <li>{singleService} (requested)</li>}
            {services.length
              ? services.map((s, i) => <li key={`${s.id}-${i}`}>{s.name}</li>)
              : null}
            {services.length === 0 && !singleService && (
              <li className="opacity-85">No services was requested.</li>
            )}
          </ul>
        ) : (
          <div className="rounded-md bg-white/10 p-3 text-[13px]">
            Add a vehicle to see requested services.
          </div>
        )}
      </div>
    </div>
  );
}
