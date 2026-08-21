import { useState } from "react";
import Image from "next/image";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent } from "@/components/Dialog";
import { Clock, Plus, Check, Car, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Service, VehicleType } from "../../data/types";
import { useBooking } from "../../context/BookingContext";
import { formatDuration } from "@/lib/formatDuration";

const vehicleTypes: VehicleType[] = ["Coupe", "Sedan", "SUV", "Truck"];

const FALLBACK_IMAGE =
  "https://img.freepik.com/free-vector/businessman-with-smartphone-rents-car-street-via-carsharing-service-carsharing-service-short-periods-rent-best-taxi-alternative-concept_335657-2201.jpg?t=st=1774777481~exp=1774781081~hmac=392773361784ea1099eb657d3d5371390f1e88bb056a7d5b0aa0c5585b60204d&w=1480";

export const ServiceCard = ({ service }: { service: Service }) => {
  const { cart, addToCart, removeFromCart } = useBooking();
  const inCart = cart.some((i) => i.service.id === service.id);
  const cartItem = cart.find((i) => i.service.id === service.id);
  const [selectedType, setSelectedType] = useState<VehicleType>("Coupe");
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [imgSrc, setImgSrc] = useState(service.images[0] || FALLBACK_IMAGE);

  const activeType = inCart && cartItem ? cartItem.vehicleType : selectedType;

  const getExtra = (type: VehicleType) =>
    service.vehicleTypePricing[
      type.toLowerCase() as keyof typeof service.vehicleTypePricing
    ];
  const totalPrice = service.price + getExtra(activeType);

  const handleTypeSelect = (type: VehicleType) => {
    if (inCart) return; // can't change once added
    setSelectedType(type);
  };

  const openDetails = () => setIsDetailsOpen(true);

  return (
    <>
      <div
        role="button"
        tabIndex={0}
        onClick={openDetails}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            openDetails();
          }
        }}
        className={cn(
          "group rounded-xl overflow-hidden border bg-card transition-all duration-200 hover:shadow-lg cursor-pointer",
          inCart && "ring-2 ring-primary",
        )}
      >
        <div className="relative aspect-[16/10] overflow-hidden">
          <Image
            src={imgSrc}
            alt={service.title}
            fill
            sizes="(max-width: 768px) 100vw, 33vw"
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
            onError={() => setImgSrc(FALLBACK_IMAGE)}
          />
          {service.category && (
            <Badge className="absolute top-3 left-3 bg-background/90 text-foreground backdrop-blur-sm text-[10px] font-medium">
              {service.category}
            </Badge>
          )}
        </div>
        <div className="p-4 space-y-3">
          <h3 className="font-semibold text-sm leading-tight">
            {service.title}
          </h3>
          {service.shortDescription && (
            <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
              {service.shortDescription}
            </p>
          )}

          {/* Vehicle Type Selector */}
          <div className="space-y-1.5">
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1">
              <Car className="w-3 h-3" /> Vehicle Type
            </p>
            <div className="flex gap-1.5">
              {vehicleTypes.map((type) => {
                const extra = getExtra(type);
                return (
                  <button
                    key={type}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleTypeSelect(type);
                    }}
                    disabled={inCart}
                    className={cn(
                      "flex-1 py-1.5 px-2 rounded-lg text-[11px] font-medium border transition-colors text-center",
                      activeType === type
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-muted/50 text-muted-foreground border-transparent hover:bg-muted",
                      inCart && "cursor-default",
                    )}
                  >
                    <span className="block">{type}</span>
                    {extra > 0 && (
                      <span className="block text-[9px] opacity-80">
                        +${extra}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <p className="text-lg font-bold">${totalPrice}</p>
              <div className="flex items-center gap-1 text-muted-foreground">
                <Clock className="w-3 h-3" />
                <span className="text-[11px]">
                  {formatDuration(service.estimatedMinutes)}
                </span>
              </div>
            </div>
            <Button
              size="sm"
              variant={inCart ? "secondary" : "default"}
              onClick={(e) => {
                e.stopPropagation();
                if (inCart) {
                  removeFromCart(service.id);
                  return;
                }
                addToCart(service, selectedType);
              }}
              className="h-9 gap-1.5"
            >
              {inCart ? (
                <>
                  <Check className="w-3.5 h-3.5" /> Added
                </>
              ) : (
                <>
                  <Plus className="w-3.5 h-3.5" /> Add
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="max-w-2xl overflow-hidden p-0 gap-0 [&>button]:hidden max-h-[90vh] flex flex-col">
          {/* Image header */}
          <div className="relative aspect-video w-full overflow-hidden flex-shrink-0">
            <Image
              src={imgSrc}
              alt={service.title}
              fill
              sizes="(max-width: 768px) 100vw, 672px"
              className="object-cover"
              loading="lazy"
              onError={() => setImgSrc(FALLBACK_IMAGE)}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
            {service.category && (
              <Badge className="absolute top-3 left-3 bg-background/90 text-foreground backdrop-blur-sm text-[10px]">
                {service.category}
              </Badge>
            )}
            <button
              onClick={() => setIsDetailsOpen(false)}
              className="absolute top-3 right-3 rounded-full bg-black/40 p-1.5 text-white backdrop-blur-sm hover:bg-black/60 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
            <div className="absolute bottom-3 left-4">
              <h2 className="text-lg font-bold text-white leading-tight">
                {service.title}
              </h2>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-white/90 text-lg font-semibold">
                  ${totalPrice}
                </span>
                <span className="flex items-center gap-1 text-white/70 text-xs">
                  <Clock className="w-3 h-3" />
                  {formatDuration(service.estimatedMinutes)}
                </span>
              </div>
            </div>
          </div>

          {/* Scrollable body — description only */}
          <div className="overflow-y-auto overflow-x-hidden flex-1 min-h-0 w-full">
            {service.description && (
              <div
                className="px-5 pt-5 text-sm text-muted-foreground leading-relaxed break-words w-full [&_h1]:text-lg [&_h1]:font-bold [&_h1]:text-foreground [&_h1]:mb-2 [&_h2]:text-base [&_h2]:font-semibold [&_h2]:text-foreground [&_h2]:mb-1.5 [&_h3]:text-sm [&_h3]:font-semibold [&_h3]:text-foreground [&_h3]:mb-1 [&_strong]:font-semibold [&_em]:italic [&_u]:underline [&_ul]:list-disc [&_ul]:ml-4 [&_ol]:list-decimal [&_ol]:ml-4 [&_li]:mb-1 [&_p]:mb-2 [&_p:last-child]:mb-0 [&_a]:text-blue-500 [&_a]:underline [&_a]:cursor-pointer"
                dangerouslySetInnerHTML={{ __html: service.description }}
              />
            )}
          </div>

          {/* Pinned footer — vehicle selector + action button */}
          <div className="flex-shrink-0 px-5 py-4 space-y-3 border-t bg-background">
            {/* Vehicle type selector */}
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Car className="w-3.5 h-3.5" /> Select Vehicle Type
              </p>
              <div className="grid grid-cols-4 gap-2">
                {vehicleTypes.map((type) => {
                  const extra = getExtra(type);
                  const isSelected = activeType === type;
                  return (
                    <button
                      key={`modal-type-${type}`}
                      onClick={() => handleTypeSelect(type)}
                      disabled={inCart}
                      className={cn(
                        "flex flex-col items-center justify-center rounded-xl border py-2.5 px-2 text-xs font-medium transition-all",
                        isSelected
                          ? "bg-primary text-primary-foreground border-primary shadow-sm"
                          : "bg-muted/40 text-foreground border-transparent hover:bg-muted",
                        inCart && "cursor-default",
                      )}
                    >
                      <span>{type}</span>
                      <span
                        className={cn(
                          "text-[10px] mt-0.5",
                          isSelected
                            ? "text-primary-foreground/80"
                            : "text-muted-foreground",
                        )}
                      >
                        ${service.price + extra}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
            <Button
              className="w-full h-11 gap-2 text-sm font-semibold"
              variant={inCart ? "secondary" : "default"}
              onClick={() => {
                if (inCart) {
                  removeFromCart(service.id);
                } else {
                  addToCart(service, selectedType);
                }
                setIsDetailsOpen(false);
              }}
            >
              {inCart ? (
                <>
                  <Check className="w-4 h-4" /> Remove from Cart
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" /> Add to Cart — ${totalPrice}
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
