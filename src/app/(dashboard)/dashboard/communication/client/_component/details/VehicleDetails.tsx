"use client";

import { useClientCommunicationStore } from "@/stores/client-store";
import type { Service, Vehicle } from "@prisma/client";
import { cn } from "@/lib/cn";
import { ArrowLeft, ArrowRight, Car } from "lucide-react";

export type ClientVehicle = Partial<Vehicle> & {
  color?: { name: string } | null;
};

type TProps = {
  vehicles: ClientVehicle[];
  isLeadClient: boolean;
  invoices: Array<{
    vehicle: Partial<Vehicle> | null;
    invoiceItems: Array<{ service: Service | null }>;
  }>;
  singleService: string;
};

function InfoField({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="min-w-0">
      <p className="text-[10px] font-medium uppercase tracking-wide text-white/60">
        {label}
      </p>
      <p className="truncate text-[13px] font-semibold text-white">
        {value?.toString().trim() || "—"}
      </p>
    </div>
  );
}

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

  const multipleServices = singleService
    ? singleService.split(",").filter((s) => s.trim())
    : [];

  const vehicleTitle = vehicle?.other
    ? vehicle.other
    : `${vehicle?.year ?? ""} ${vehicle?.make ?? ""} ${vehicle?.model ?? ""}`.trim();

  return (
    <div className="space-y-4 rounded-xl bg-[#63a6ac]/95 p-4 text-sm text-white shadow-sm">
      {/* Header: index chip + nav */}
      <div className="flex items-center justify-between gap-x-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-lg bg-white/15 px-2 py-1 text-[11px] font-semibold">
            <Car className="h-3.5 w-3.5" />
            {hasVehicles
              ? `Vehicle ${currentIndex + 1} of ${total}`
              : "Vehicle"}
          </span>
          {hasVehicles && (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-400/20 px-2 py-0.5 text-[10px] font-medium text-emerald-50">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-300" />
              Active
            </span>
          )}
          {isLeadClient && (
            <span className="rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-medium">
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
              "hover:bg-white/15 disabled:opacity-40 disabled:hover:bg-transparent",
            )}
            aria-label="Previous vehicle"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={goNext}
            disabled={!hasVehicles || total < 2}
            className={cn(
              "flex h-7 w-7 items-center justify-center rounded-full ring-1 ring-white/60 transition",
              "hover:bg-white/15 disabled:opacity-40 disabled:hover:bg-transparent",
            )}
            aria-label="Next vehicle"
          >
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {hasVehicles ? (
        <>
          {/* Vehicle title */}
          <h4 className="truncate text-base font-semibold leading-tight">
            {vehicleTitle || "Unnamed vehicle"}
          </h4>

          {/* COLOR / PLATE / VIN */}
          <div className="grid grid-cols-2 gap-x-3 gap-y-3 rounded-lg bg-white/10 p-3">
            <InfoField label="Color" value={vehicle?.color?.name} />
            <InfoField label="Plate" value={vehicle?.license} />
            <div className="col-span-2">
              <InfoField label="VIN" value={vehicle?.vin} />
            </div>
          </div>
        </>
      ) : (
        <div className="rounded-lg bg-white/10 p-3 text-[13px]">
          No vehicles added yet.
        </div>
      )}

      {/* Services */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <p className="text-[10px] font-medium uppercase tracking-wide text-white/70">
            Services
          </p>
          {hasVehicles &&
            (multipleServices.length > 0 || services.length > 0) && (
              <span className="text-[11px] font-medium text-white/70">
                {multipleServices.length + services.length} total
              </span>
            )}
        </div>

        {hasVehicles ? (
          <ul className="space-y-1.5">
            {multipleServices.map((s) => (
              <li
                key={s}
                className="flex items-center justify-between gap-2 text-[13px]"
              >
                <span className="flex min-w-0 items-center gap-2">
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-white/70" />
                  <span className="truncate">{s.trim()}</span>
                </span>
                <span className="shrink-0 rounded-full bg-white/15 px-2 py-0.5 text-[10px] font-medium">
                  Requested
                </span>
              </li>
            ))}
            {services.map((s, i) => (
              <li
                key={`${s.id}-${i}`}
                className="flex min-w-0 items-center gap-2 text-[13px]"
              >
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-white/70" />
                <span className="truncate">{s.name}</span>
              </li>
            ))}
            {services.length === 0 && multipleServices.length === 0 && (
              <li className="text-[13px] text-white/70">
                No services requested.
              </li>
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
