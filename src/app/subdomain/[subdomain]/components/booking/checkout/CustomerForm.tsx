import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SlimInput } from "@/components/SlimInput";
import { SlimTextarea } from "@/components/SlimTextarea";
import PhoneInput from "@/components/PhoneInput";
import { Loader2 } from "lucide-react";
import {
  CheckoutVehicleSection,
  ExistingVehicle,
} from "../CheckoutVehicleSection";
import { CustomerInfo } from "../../../data/types";
import { normalizePhone } from "./checkoutUtils";

interface CustomerFormProps {
  form: CustomerInfo;
  phoneLookedUp: boolean;
  isLookingUp: boolean;
  isBookingSubmitting: boolean;
  selectedCountryCode: string;
  existingVehicles: ExistingVehicle[];
  termsAgreed: boolean;
  shopTerms?: string;
  shopPrivacy?: string;
  onPhoneChange: (phone: string, isoCode: string) => void;
  onContinue: () => void;
  onFieldChange: (field: keyof CustomerInfo, value: string) => void;
  onTermsChange: (agreed: boolean) => void;
  onSubmit: (e: React.FormEvent) => void;
}

export const CustomerForm = ({
  form,
  phoneLookedUp,
  isLookingUp,
  isBookingSubmitting,
  selectedCountryCode,
  existingVehicles,
  termsAgreed,
  shopTerms,
  shopPrivacy,
  onPhoneChange,
  onContinue,
  onFieldChange,
  onTermsChange,
  onSubmit,
}: CustomerFormProps) => {
  const [localNumTooLong, setLocalNumTooLong] = useState(false);

  const normalized = normalizePhone(form.phone);
  const phoneError = localNumTooLong || normalized.length > 15;

  const handleFormKeyDown = (e: React.KeyboardEvent<HTMLFormElement>) => {
    if (e.key === "Enter" && !phoneLookedUp) {
      e.preventDefault();
      const normalized = normalizePhone(form.phone);
      if (!isLookingUp && normalized.length >= 12 && !phoneError) {
        onContinue();
      }
    }
  };

  return (
    <form
      onSubmit={onSubmit}
      onKeyDown={handleFormKeyDown}
      className="space-y-4"
    >
      <div className="space-y-1.5">
        <Label htmlFor="phone" className="text-xs">
          Phone Number <span className="text-red-500 ml-1">*</span>
        </Label>
        <div className="flex gap-2 items-center">
          <Input
            type="hidden"
            id="phone"
            value={form.phone}
            onChange={() => {}}
          />
          <div className="flex-1">
            <PhoneInput
              label=""
              placeholder="1234567890"
              required
              defaultIsoCode={selectedCountryCode}
              onChange={(num, code, isoCode) => {
                const dialDigits = code.replace(/\D/g, "");
                // Detect if user accidentally typed country code inside the local number field
                // e.g. US (+1): typing "116987456321" instead of "6987456321"
                const tooLong =
                  num.length > 11 && !!dialDigits && num.startsWith(dialDigits);
                setLocalNumTooLong(tooLong);
                onPhoneChange(`${code}${num}`, isoCode || "US");
              }}
            />
          </div>
          {!phoneLookedUp && (
            <Button
              type="button"
              variant="secondary"
              size="lg"
              onClick={onContinue}
              disabled={isLookingUp || normalized.length < 12 || phoneError}
            >
              {isLookingUp ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                "Continue"
              )}
            </Button>
          )}
        </div>
        {phoneError && (
          <p className="text-xs text-red-500 mt-1">
            Phone number is too long. Enter only the local number without the
            country code (e.g. 6987456321, not +16987456321).
          </p>
        )}
      </div>

      {phoneLookedUp && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <SlimInput
              id="name"
              name="fullName"
              label="Full Name"
              required
              labelClassName="text-xs font-medium"
              className="h-10 text-sm font-normal rounded-md border-input bg-background px-3 py-2"
              value={form.fullName}
              onChange={(e) => onFieldChange("fullName", e.target.value)}
              placeholder="John Doe"
            />
          </div>
          <div className="space-y-1.5">
            <SlimInput
              id="email"
              name="email"
              label="Email"
              type="email"
              required
              labelClassName="text-xs font-medium"
              className="h-10 text-sm font-normal rounded-md border-input bg-background px-3 py-2"
              value={form.email}
              onChange={(e) => onFieldChange("email", e.target.value)}
              placeholder="john@email.com"
            />
          </div>
        </div>
      )}

      {phoneLookedUp && (
        <>
          <CheckoutVehicleSection
            existingVehicles={existingVehicles}
            vehicleYear={form.vehicleYear}
            vehicleMake={form.vehicleMake}
            vehicleModel={form.vehicleModel}
            onVehicleChange={onFieldChange}
          />
          <div className="space-y-1.5">
            <SlimTextarea
              id="notes"
              name="notes"
              label="Notes"
              labelClassName="text-xs font-medium"
              value={form.notes}
              onChange={(e) => onFieldChange("notes", e.target.value)}
              placeholder="Any special requests..."
              rows={3}
              className="text-sm font-normal rounded-md resize-y min-h-[80px] max-h-[200px]"
            />
          </div>
          {(shopTerms || shopPrivacy) && (
            <div className="rounded-lg border bg-card p-4 space-y-3">
              {shopTerms && (
                <div>
                  <p className="text-xs font-semibold text-foreground mb-1">
                    Terms &amp; Conditions
                  </p>
                  <p className="text-xs text-muted-foreground whitespace-pre-wrap">
                    {shopTerms}
                  </p>
                </div>
              )}
              {shopPrivacy && (
                <div>
                  <p className="text-xs font-semibold text-foreground mb-1">
                    Privacy Policy
                  </p>
                  <p className="text-xs text-muted-foreground whitespace-pre-wrap">
                    {shopPrivacy}
                  </p>
                </div>
              )}
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={termsAgreed}
                  onChange={(e) => onTermsChange(e.target.checked)}
                  className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer rounded border-input accent-primary"
                />
                <span className="text-xs text-muted-foreground leading-snug">
                  I have read and agree to the terms &amp; conditions and
                  privacy policy above.
                </span>
              </label>
            </div>
          )}
          <Button
            type="submit"
            size="lg"
            className="w-full"
            disabled={
              isBookingSubmitting ||
              (!!(shopTerms || shopPrivacy) && !termsAgreed)
            }
          >
            {isBookingSubmitting ? "Confirming..." : "Confirm Booking"}
          </Button>
        </>
      )}
    </form>
  );
};
