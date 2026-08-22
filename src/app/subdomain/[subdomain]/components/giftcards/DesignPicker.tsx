import { useState } from "react";

import { cn } from "@/lib/utils";
import { Check } from "lucide-react";
import { GiftCardDesign } from "../../data/gift-card-types";
import { Skeleton } from "../ui/Skeleton";

interface Props {
  designs: GiftCardDesign[];
  selected: string;
  onSelect: (id: string) => void;
  shopName: string;
  isLoading?: boolean;
}

const DesignPicker = ({
  designs,
  selected,
  onSelect,
  shopName,
  isLoading,
}: Props) => {
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-7 w-48 mb-2" />
          <Skeleton className="h-4 w-32" />
        </div>
        <Skeleton className="rounded-2xl aspect-[16/9] max-w-md mx-auto w-full" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="rounded-xl aspect-[16/9] w-full" />
          ))}
        </div>
      </div>
    );
  }

  const enabledDesigns = designs.filter((d) => d.enabled);
  const selectedDesign = enabledDesigns.find((d) => d.id === selected);

  return (
    <div className="space-y-6">
      <div>
        <h3
          className="text-lg font-semibold tracking-tight mb-1"
          style={{ fontFamily: "'Space Grotesk', sans-serif" }}
        >
          Choose a Design
        </h3>
        <p className="text-sm text-muted-foreground">
          Select a gift card style
        </p>
      </div>

      {/* Preview */}
      {selectedDesign && (
        <div className="relative rounded-2xl overflow-hidden shadow-lg aspect-[16/9] max-w-md mx-auto border border-border">
          <img
            src={selectedDesign.imageUrl}
            alt={selectedDesign.name}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          <div className="absolute bottom-4 left-4 right-4">
            <p className="text-white text-xs font-medium opacity-80">
              {shopName}
            </p>
            <p
              className="text-white text-lg font-bold tracking-tight"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              Gift Card
            </p>
          </div>
        </div>
      )}

      {/* Gallery */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {enabledDesigns.map((d) => (
          <button
            key={d.id}
            onClick={() => onSelect(d.id)}
            className={cn(
              "relative rounded-xl overflow-hidden aspect-[16/9] border-2 transition-all hover:scale-[1.02]",
              selected === d.id
                ? "border-primary ring-2 ring-primary/30"
                : "border-border hover:border-muted-foreground/40",
            )}
          >
            <img
              src={d.imageUrl}
              alt={d.name}
              className="w-full h-full object-cover"
            />
            {selected === d.id && (
              <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                <Check className="w-3 h-3 text-primary-foreground" />
              </div>
            )}
            <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/50 to-transparent p-1.5">
              <p className="text-white text-[10px] font-medium">{d.name}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

export default DesignPicker;
