import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/Dialog";
import { Clock, Plus, Check, Car } from "lucide-react";
import { cn } from "@/lib/utils";
import { Service, VehicleType } from "../../data/types";
import { useBooking } from "../../context/BookingContext";

const vehicleTypes: VehicleType[] = ["Coupe", "Sedan", "SUV", "Truck"];

export const ServiceCard = ({ service }: { service: Service }) => {
  const { cart, addToCart, removeFromCart } = useBooking();
  const inCart = cart.some((i) => i.service.id === service.id);
  const cartItem = cart.find((i) => i.service.id === service.id);
  const [selectedType, setSelectedType] = useState<VehicleType>("Coupe");
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  const activeType = inCart && cartItem ? cartItem.vehicleType : selectedType;

  const getExtra = (type: VehicleType) =>
    service.vehicleTypePricing[
      type.toLowerCase() as keyof typeof service.vehicleTypePricing
    ];
  const totalPrice = service.price + getExtra(activeType);

  const formatDuration = (mins: number) => {
    if (mins < 60) return `${mins} min`;
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return m ? `${h}h ${m}m` : `${h}h`;
  };

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
          <img
            src={
              service.images[0] ||
              "https://img.freepik.com/free-vector/businessman-with-smartphone-rents-car-street-via-carsharing-service-carsharing-service-short-periods-rent-best-taxi-alternative-concept_335657-2201.jpg?t=st=1774777481~exp=1774781081~hmac=392773361784ea1099eb657d3d5371390f1e88bb056a7d5b0aa0c5585b60204d&w=1480"
            }
            alt={service.title}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
            onError={(e) => {
              (e.target as HTMLImageElement).src =
                "https://img.freepik.com/free-vector/businessman-with-smartphone-rents-car-street-via-carsharing-service-carsharing-service-short-periods-rent-best-taxi-alternative-concept_335657-2201.jpg?t=st=1774777481~exp=1774781081~hmac=392773361784ea1099eb657d3d5371390f1e88bb056a7d5b0aa0c5585b60204d&w=1480";
            }}
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
          <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
            {service.description}
          </p>

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
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl text-foreground">
              {service.title}
            </DialogTitle>
            <DialogDescription>{service.category}</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="overflow-hidden rounded-xl border">
              <img
                src={
                  service.images[0] ||
                  "https://img.freepik.com/free-vector/businessman-with-smartphone-rents-car-street-via-carsharing-service-carsharing-service-short-periods-rent-best-taxi-alternative-concept_335657-2201.jpg?t=st=1774777481~exp=1774781081~hmac=392773361784ea1099eb657d3d5371390f1e88bb056a7d5b0aa0c5585b60204d&w=1480"
                }
                alt={service.title}
                className="h-64 w-full object-cover"
                loading="lazy"
              />
            </div>

            <p className="text-sm leading-relaxed text-muted-foreground">
              {service.description}
            </p>

            <div className="grid grid-cols-2 gap-3 rounded-lg border p-3 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">Base Price</p>
                <p className="font-semibold">${service.price}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Estimated Time</p>
                <p className="font-semibold">
                  {formatDuration(service.estimatedMinutes)}
                </p>
              </div>
            </div>

            <div className="rounded-lg border p-3">
              <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Vehicle Pricing
              </p>
              <div className="grid grid-cols-2 gap-2 text-sm">
                {vehicleTypes.map((type) => (
                  <div
                    key={`modal-${service.id}-${type}`}
                    className="flex items-center justify-between rounded-md bg-muted/40 px-3 py-2"
                  >
                    <span>{type}</span>
                    <span className="font-semibold">
                      ${service.price + getExtra(type)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
