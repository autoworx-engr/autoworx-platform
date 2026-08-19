"use client";

import { useEffect, useMemo } from "react";
import { AlertTriangle, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DatePickerField } from "@/components/ui/DatePickerField";
import { TimeScrollPicker } from "@/components/ui/TimeScrollPicker";
import { cn } from "@/lib/cn";
import PhoneInput from "@/components/PhoneInput";
import { useShopInfo } from "@/hooks/virtual-shop/useShopInfo";
import { CheckoutVehicleSection } from "./CheckoutVehicleSection";
import { useEmergencyRequest } from "./emergency/useEmergencyRequest";
import { EmergencySuccessView } from "./emergency/EmergencySuccessView";
import { useBooking } from "../../context/BookingContext";
import { SelectedService } from "./emergency/types";

interface EmergencyRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const INPUT_CLASS =
  "w-full px-3 py-2 text-sm rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring";

const SectionLabel = ({ children }: { children: React.ReactNode }) => (
  <h3 className="font-semibold text-xs uppercase tracking-wider text-muted-foreground">
    {children}
  </h3>
);

export const EmergencyRequestModal = ({
  isOpen,
  onClose,
}: EmergencyRequestModalProps) => {
  const { shopId } = useShopInfo();
  const { cart } = useBooking();

  const cartServices = useMemo<SelectedService[]>(
    () =>
      cart.map((item) => ({
        serviceId: Number(item.service.id),
        vehicleType: item.vehicleType ?? null,
      })),
    [cart],
  );

  const {
    form,
    set,
    existingVehicles,
    isLookingUp,
    isSubmitting,
    success,
    error,
    handlePhoneLookup,
    handleVehicleChange,
    handleSubmit,
    handleClose,
  } = useEmergencyRequest(shopId, onClose, cartServices);

  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={handleClose}
      />

      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto scrollbar-none bg-background rounded-2xl shadow-2xl border border-border">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-primary text-primary-foreground px-6 py-4 flex items-center justify-between rounded-t-2xl">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 flex-shrink-0" />
            <div>
              <h2 className="font-bold text-lg leading-tight">
                Urgent Service Request
              </h2>
              <p className="text-xs text-primary-foreground/70">
                Our team will respond as quickly as possible
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="text-primary-foreground/80 hover:text-primary-foreground transition-colors ml-4 flex-shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {success ? (
          <EmergencySuccessView data={success} onClose={handleClose} />
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* Contact */}
            <section className="space-y-4">
              <SectionLabel>Contact Information</SectionLabel>

              <div className="space-y-1">
                <label className="text-sm font-medium">
                  Phone Number <span className="text-destructive">*</span>
                </label>
                <div className="relative">
                  <PhoneInput
                    label=""
                    placeholder="1234567890"
                    required
                    onChange={(num, code) =>
                      set("contactPhone", num ? `${code}${num}` : "")
                    }
                    onBlur={handlePhoneLookup}
                  />
                  {isLookingUp && (
                    <Loader2 className="absolute right-10 top-2.5 w-4 h-4 animate-spin text-muted-foreground" />
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  We'll look up your account automatically
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-sm font-medium">
                    Full Name <span className="text-destructive">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.contactName}
                    onChange={(e) => set("contactName", e.target.value)}
                    placeholder="John Smith"
                    required
                    className={INPUT_CLASS}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium">
                    Email <span className="text-destructive">*</span>
                  </label>
                  <input
                    type="email"
                    value={form.contactEmail}
                    onChange={(e) => set("contactEmail", e.target.value)}
                    placeholder="john@example.com"
                    required
                    className={INPUT_CLASS}
                  />
                </div>
              </div>
            </section>

            {/* Description */}
            <section className="space-y-2">
              <SectionLabel>
                Notes <span className="text-destructive">*</span>
              </SectionLabel>
              <textarea
                value={form.description}
                onChange={(e) => set("description", e.target.value)}
                placeholder="Please describe what's happening with your vehicle..."
                required
                rows={3}
                className={INPUT_CLASS + " resize-none"}
              />
            </section>

            {/* Services from cart */}
            {cart.length > 0 && (
              <section className="space-y-3">
                <SectionLabel>
                  Services Needed{" "}
                  <span className="normal-case font-normal">(from cart)</span>
                </SectionLabel>
                <div className="border border-border rounded-xl divide-y divide-border overflow-hidden">
                  {cart.map((item) => (
                    <div
                      key={item.service.id}
                      className="flex items-center justify-between px-4 py-3 text-sm"
                    >
                      <span className="font-medium">{item.service.title}</span>
                      <div className="flex items-center gap-3 text-muted-foreground">
                        {item.vehicleType && (
                          <span className="text-xs bg-muted px-2 py-0.5 rounded-md">
                            {item.vehicleType}
                          </span>
                        )}
                        {item.quantity > 1 && (
                          <span className="text-xs">×{item.quantity}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Vehicle */}
            <section className="space-y-3">
              <CheckoutVehicleSection
                existingVehicles={existingVehicles}
                vehicleYear={form.vehicleYear}
                vehicleMake={form.vehicleMake}
                vehicleModel={form.vehicleModel}
                onVehicleChange={handleVehicleChange}
              />
            </section>

            {/* Timing */}
            <section className="space-y-3">
              <SectionLabel>
                Preferred Timing{" "}
                <span className="normal-case font-normal">(optional)</span>
              </SectionLabel>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-sm font-medium">Date</label>
                  <DatePickerField
                    value={form.requestedDate}
                    onChange={(value) => {
                      set("requestedDate", value);
                      if (!value) set("requestedTime", "");
                    }}
                    minDate={new Date()}
                    clearable
                    placeholder="Select date"
                  />
                </div>
                <div
                  className={cn(
                    !form.requestedDate && "pointer-events-none opacity-50",
                  )}
                >
                  <TimeScrollPicker
                    id="requestedTime"
                    label="Time"
                    labelClassName="text-sm font-medium"
                    value={form.requestedTime}
                    onChange={(value) => set("requestedTime", value)}
                  />
                </div>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.flexibleTiming}
                  onChange={(e) => set("flexibleTiming", e.target.checked)}
                  className="rounded border-input accent-primary"
                />
                <span className="text-sm">I'm flexible with timing</span>
              </label>
            </section>

            {/* Error */}
            {error && (
              <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg p-3 text-sm text-red-700 dark:text-red-400">
                {error}
              </div>
            )}

            {/* Submit */}
            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-3 rounded-xl gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <AlertTriangle className="w-4 h-4" />
                  Submit Urgent Request
                </>
              )}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
};
