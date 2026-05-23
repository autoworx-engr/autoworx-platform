"use client";

import { useClientCommunicationStore } from "@/stores/client-store";
import type { Service, Vehicle, VehicleColor } from "@prisma/client";
import { cn } from "@/lib/cn";
import { ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";

type VehicleWithColor = Partial<Vehicle> & { color?: VehicleColor | null };

type TProps = {
  vehicles: VehicleWithColor[];
  isLeadClient: boolean;
  invoices: Array<{
    vehicle: Partial<Vehicle> | null;
    invoiceItems: Array<{ service: Service | null }>;
  }>;
  singleService: string;
};

export default function VehicleDetails({
  vehicles,
  invoices,
  singleService,
}: TProps) {
  const { selectedVehicleIndex, setVehicleIndex } =
    useClientCommunicationStore();
  const [open, setOpen] = useState(true);

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

  const requested = singleService
    ? singleService
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
    : [];

  const allServices = [...requested.map((name) => ({ name })), ...services];

  const goPrev = () =>
    hasVehicles &&
    setVehicleIndex(currentIndex > 0 ? currentIndex - 1 : total - 1);
  const goNext = () =>
    hasVehicles &&
    setVehicleIndex(currentIndex < total - 1 ? currentIndex + 1 : 0);

  const vehicleTitle = vehicle?.other
    ? vehicle.other
    : `${vehicle?.year ?? ""} ${vehicle?.make ?? ""} ${vehicle?.model ?? ""}`.trim();

  return (
    <section className="rounded-2xl border border-zinc-200/70 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-zinc-900/60">
      <header className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex items-center gap-2"
        >
          <h3 className="text-sm font-semibold tracking-tight text-zinc-800 dark:text-zinc-100">
            VEHICLE
          </h3>
          {hasVehicles && (
            <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-medium text-zinc-600 dark:bg-white/10 dark:text-zinc-300">
              {total}
            </span>
          )}
        </button>
        <ChevronDown
          className={cn(
            "h-4 w-4 text-zinc-400 transition-transform",
            !open && "-rotate-90",
          )}
          onClick={() => setOpen((v) => !v)}
        />
      </header>

      {open && (
        <div className="mt-3">
          {!hasVehicles ? (
            <p className="rounded-md bg-zinc-50 p-3 text-xs text-zinc-500 dark:bg-white/5 dark:text-zinc-400">
              No vehicles added.
            </p>
          ) : (
            <>
              <div className="mb-2 flex items-center justify-between text-[11px]">
                <div className="flex items-center gap-2">
                  <span className="text-zinc-500 dark:text-zinc-400">
                    Vehicle {currentIndex + 1} of {total}
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-[#006D77]/10 px-2 py-0.5 font-medium text-[#006D77] dark:bg-[#006D77]/20 dark:text-[#4dd2dc]">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#006D77]" />
                    Active
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <NavBtn onClick={goPrev} disabled={total < 2} label="Prev">
                    <ChevronLeft className="h-3.5 w-3.5" />
                  </NavBtn>
                  <NavBtn onClick={goNext} disabled={total < 2} label="Next">
                    <ChevronRight className="h-3.5 w-3.5" />
                  </NavBtn>
                </div>
              </div>

              <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                {vehicleTitle || "Untitled vehicle"}
              </p>

              <dl className="mt-3 grid grid-cols-2 gap-y-3 gap-x-4 text-xs">
                <InfoField label="Color" value={vehicle?.color?.name} />
                <InfoField label="Plate" value={vehicle?.license} />
                <div className="col-span-2">
                  <InfoField label="VIN" value={vehicle?.vin} />
                </div>
              </dl>

              <div className="mt-4">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-[11px] font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                    Services
                  </span>
                  <span className="text-[11px] text-zinc-500 dark:text-zinc-400">
                    0 / {allServices.length} done
                  </span>
                </div>

                {allServices.length === 0 ? (
                  <p className="rounded-md bg-zinc-50 p-2 text-[11px] text-zinc-500 dark:bg-white/5 dark:text-zinc-400">
                    No services requested.
                  </p>
                ) : (
                  <ul className="space-y-1.5">
                    {allServices.map((s, idx) => (
                      <li
                        key={`${s.name}-${idx}`}
                        className="flex items-center justify-between rounded-md bg-zinc-50 px-2.5 py-1.5 text-xs dark:bg-white/5"
                      >
                        <span className="flex items-center gap-2 truncate text-zinc-700 dark:text-zinc-200">
                          <span
                            className={cn(
                              "h-1.5 w-1.5 rounded-full",
                              idx === 0 ? "bg-[#006D77]" : "bg-zinc-400",
                            )}
                          />
                          <span className="truncate">{s.name}</span>
                        </span>
                        <span
                          className={cn(
                            "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium",
                            idx === 0
                              ? "bg-emerald-50 text-emerald-700 dark:bg-[#006D77]/10 dark:text-emerald-400"
                              : "bg-zinc-100 text-zinc-600 dark:bg-white/10 dark:text-zinc-300",
                          )}
                        >
                          {idx === 0 ? "In progress" : "Queued"}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </section>
  );
}

function InfoField({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="min-w-0">
      <dt className="text-[10px] font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
        {label}
      </dt>
      <dd className="mt-0.5 truncate text-xs text-zinc-800 dark:text-zinc-100">
        {value || "—"}
      </dd>
    </div>
  );
}

function NavBtn({
  onClick,
  disabled,
  label,
  children,
}: {
  onClick: () => void;
  disabled?: boolean;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className={cn(
        "flex h-6 w-6 items-center justify-center rounded-full border border-zinc-200 text-zinc-600",
        "transition hover:bg-zinc-50 disabled:opacity-40 disabled:hover:bg-transparent",
        "dark:border-white/10 dark:text-zinc-300 dark:hover:bg-white/5",
      )}
    >
      {children}
    </button>
  );
}
