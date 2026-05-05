"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import { Loader2 } from "lucide-react";
import { useInfiniteShopServices } from "@/hooks/virtual-shop/service/useShopService";
import { SelectedService, VehicleType, VEHICLE_TYPES } from "./types";

interface EmergencyServiceSelectorProps {
  shopId?: number;
  isOpen: boolean;
  selectedServices: SelectedService[];
  onToggle: (serviceId: number) => void;
  onVehicleTypeChange: (serviceId: number, vehicleType: VehicleType) => void;
}

export function EmergencyServiceSelector({
  shopId,
  isOpen,
  selectedServices,
  onToggle,
  onVehicleTypeChange,
}: EmergencyServiceSelectorProps) {
  const {
    data: infiniteServices,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteShopServices(shopId, 10, isOpen && !!shopId);

  const allServices = useMemo(
    () => infiniteServices?.pages.flatMap((p) => p.data) ?? [],
    [infiniteServices],
  );

  const sentinelRef = useRef<HTMLDivElement>(null);

  const onIntersect = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
        fetchNextPage();
      }
    },
    [hasNextPage, isFetchingNextPage, fetchNextPage],
  );

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(onIntersect, { threshold: 0.1 });
    observer.observe(el);
    return () => observer.disconnect();
  }, [onIntersect]);

  if (allServices.length === 0 && !isFetchingNextPage) {
    return (
      <p className="text-xs text-muted-foreground">No services available</p>
    );
  }

  return (
    <div className="border border-border rounded-xl overflow-hidden">
      <div className="max-h-64 overflow-y-auto scrollbar-none divide-y divide-border">
        {allServices.map((svc) => {
          const selected = selectedServices.find((s) => s.serviceId === svc.id);
          const isChecked = !!selected;
          const basePrice = Number(svc.price);

          const activeModifierKey = selected?.vehicleType
            ? VEHICLE_TYPES.find((vt) => vt.value === selected.vehicleType)
                ?.modifierKey
            : undefined;
          const activeModifier = activeModifierKey
            ? Number(svc[activeModifierKey] ?? 0)
            : 0;
          const effectivePrice = basePrice + activeModifier;

          return (
            <div key={svc.id}>
              {/* Service row */}
              <label
                className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors ${
                  isChecked ? "bg-primary/5" : "hover:bg-muted/50"
                }`}
              >
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={() => onToggle(svc.id)}
                  className="rounded border-input accent-primary w-4 h-4 flex-shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <p
                    className={`text-sm font-medium truncate ${
                      isChecked ? "text-primary" : "text-foreground"
                    }`}
                  >
                    {svc.title}
                  </p>
                  {svc.description && (
                    <p className="text-xs text-muted-foreground truncate mt-0.5">
                      {svc.description}
                    </p>
                  )}
                </div>
                {effectivePrice > 0 && (
                  <span
                    className={`text-xs flex-shrink-0 font-medium ${
                      isChecked && activeModifier !== 0
                        ? "text-primary"
                        : "text-muted-foreground"
                    }`}
                  >
                    ${effectivePrice.toFixed(2)}
                  </span>
                )}
              </label>

              {/* Vehicle type picker — shown only when service is checked */}
              {isChecked && (
                <div className="px-4 pb-3 pt-1 bg-primary/5 space-y-1.5">
                  <p className="text-xs text-muted-foreground font-medium">
                    Vehicle type
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {VEHICLE_TYPES.map((vt) => {
                      const modifier = Number(svc[vt.modifierKey] ?? 0);
                      const isSelected = selected?.vehicleType === vt.value;
                      return (
                        <button
                          key={vt.value}
                          type="button"
                          onClick={() => onVehicleTypeChange(svc.id, vt.value)}
                          className={`px-2.5 py-1 rounded-lg text-xs border transition-all ${
                            isSelected
                              ? "border-primary bg-primary text-primary-foreground font-semibold"
                              : "border-border hover:border-primary/50 bg-background"
                          }`}
                        >
                          {vt.label}
                          {modifier !== 0 && (
                            <span
                              className={`ml-1 ${
                                isSelected
                                  ? "text-primary-foreground/80"
                                  : "text-muted-foreground"
                              }`}
                            >
                              +${modifier.toFixed(2)}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}

        <div ref={sentinelRef} className="py-1">
          {isFetchingNextPage && (
            <div className="flex justify-center py-2">
              <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
            </div>
          )}
        </div>
      </div>

      {selectedServices.length > 0 && (
        <div className="px-4 py-2 bg-muted/50 border-t border-border">
          <p className="text-xs text-muted-foreground">
            <span className="font-semibold text-foreground">
              {selectedServices.length}
            </span>{" "}
            service{selectedServices.length !== 1 ? "s" : ""} selected
            {selectedServices.filter((s) => s.vehicleType).length > 0 && (
              <span className="ml-1">
                ({selectedServices.filter((s) => s.vehicleType).length} with
                vehicle type)
              </span>
            )}
          </p>
        </div>
      )}
    </div>
  );
}
