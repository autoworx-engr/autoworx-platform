"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import { Loader2 } from "lucide-react";
import { useInfiniteShopServices } from "@/hooks/virtual-shop/service/useShopService";

interface EmergencyServiceSelectorProps {
  shopId?: number;
  isOpen: boolean;
  selectedServiceIds: number[];
  onToggle: (id: number) => void;
}

export function EmergencyServiceSelector({
  shopId,
  isOpen,
  selectedServiceIds,
  onToggle,
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
      <div className="max-h-52 overflow-y-auto divide-y divide-border">
        {allServices.map((svc) => {
          const checked = selectedServiceIds.includes(svc.id);
          return (
            <label
              key={svc.id}
              className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors ${
                checked ? "bg-primary/5" : "hover:bg-muted/50"
              }`}
            >
              <input
                type="checkbox"
                checked={checked}
                onChange={() => onToggle(svc.id)}
                className="rounded border-input accent-primary w-4 h-4 flex-shrink-0"
              />
              <div className="min-w-0 flex-1">
                <p
                  className={`text-sm font-medium truncate ${
                    checked ? "text-primary" : "text-foreground"
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
              {Number(svc.price) > 0 && (
                <span className="text-xs text-muted-foreground flex-shrink-0">
                  ${Number(svc.price).toFixed(2)}
                </span>
              )}
            </label>
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

      {selectedServiceIds.length > 0 && (
        <div className="px-4 py-2 bg-muted/50 border-t border-border">
          <p className="text-xs text-muted-foreground">
            <span className="font-semibold text-foreground">
              {selectedServiceIds.length}
            </span>{" "}
            service{selectedServiceIds.length !== 1 ? "s" : ""} selected
          </p>
        </div>
      )}
    </div>
  );
}
