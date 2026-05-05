"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useShopInfo } from "@/hooks/virtual-shop/useShopInfo";
import { useGetShopServices } from "@/hooks/virtual-shop/service/useShopService";
import {
  CheckoutVehicleSection,
  ExistingVehicle,
} from "./CheckoutVehicleSection";
import axios from "axios";

const URGENCY_LEVELS = [
  { value: "CRITICAL", label: "Critical", desc: "Immediate safety issue" },
  { value: "URGENT", label: "Urgent", desc: "Same-day needed" },
  { value: "HIGH", label: "High", desc: "24–48 hours" },
  { value: "NORMAL", label: "Normal", desc: "Within a week" },
] as const;

const REASON_CATEGORIES = [
  { value: "ACCIDENT_DAMAGE", label: "Accident Damage" },
  { value: "BREAKDOWN", label: "Breakdown" },
  { value: "SAFETY_CONCERN", label: "Safety Concern" },
  { value: "PRE_TRAVEL_CHECK", label: "Pre-Travel Check" },
  { value: "WEATHER_DAMAGE", label: "Weather Damage" },
  { value: "TOWING_RELATED", label: "Towing Related" },
  { value: "SCHEDULED_CONFLICT", label: "Scheduling Conflict" },
  { value: "OTHER", label: "Other" },
] as const;

const URGENCY_COLORS: Record<string, string> = {
  CRITICAL:
    "border-red-500 bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400",
  URGENT:
    "border-orange-500 bg-orange-50 dark:bg-orange-950/30 text-orange-700 dark:text-orange-400",
  HIGH: "border-yellow-500 bg-yellow-50 dark:bg-yellow-950/30 text-yellow-700 dark:text-yellow-400",
  NORMAL: "border-primary bg-primary/10 text-primary",
};

interface FormState {
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  urgencyLevel: "CRITICAL" | "URGENT" | "HIGH" | "NORMAL";
  reasonCategory: string;
  description: string;
  requestedDate: string;
  requestedTime: string;
  flexibleTiming: boolean;
  vehicleYear: string;
  vehicleMake: string;
  vehicleModel: string;
  selectedServiceIds: number[];
}

const DEFAULT_FORM: FormState = {
  contactName: "",
  contactEmail: "",
  contactPhone: "",
  urgencyLevel: "URGENT",
  reasonCategory: "BREAKDOWN",
  description: "",
  requestedDate: "",
  requestedTime: "",
  flexibleTiming: true,
  vehicleYear: "",
  vehicleMake: "",
  vehicleModel: "",
  selectedServiceIds: [],
};

interface SuccessData {
  requestId: number;
  estimatedReviewTime: string;
  message: string;
}

interface EmergencyRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const EmergencyRequestModal = ({
  isOpen,
  onClose,
}: EmergencyRequestModalProps) => {
  const { shopId } = useShopInfo();

  const { data: servicesData } = useGetShopServices(
    { shopId, page: 1, limit: 100 },
    { enabled: isOpen && !!shopId },
  );
  const allServices = servicesData?.data ?? [];

  const [form, setForm] = useState<FormState>(DEFAULT_FORM);
  const [existingVehicles, setExistingVehicles] = useState<ExistingVehicle[]>(
    [],
  );
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState<SuccessData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  // Find exact vehicle ID match from existing vehicles
  const matchedVehicleId = useMemo(() => {
    if (!form.vehicleYear || !form.vehicleMake || !form.vehicleModel)
      return undefined;
    const match = existingVehicles.find(
      (v) =>
        String(v.year) === form.vehicleYear &&
        v.make === form.vehicleMake &&
        v.model === form.vehicleModel,
    );
    return match?.id;
  }, [form.vehicleYear, form.vehicleMake, form.vehicleModel, existingVehicles]);

  const handleVehicleChange = (
    field: "vehicleYear" | "vehicleMake" | "vehicleModel",
    value: string,
  ) => set(field, value);

  const handlePhoneLookup = async () => {
    if (!form.contactPhone || !shopId) return;
    setIsLookingUp(true);
    try {
      const res = await axios.get(
        `/api/virtual-shop/client-lookup/by-phone?phone=${encodeURIComponent(form.contactPhone)}&shopId=${shopId}`,
      );
      if (res.data?.data) {
        const client = res.data.data;
        const vehicles: ExistingVehicle[] = Array.isArray(client.Vehicle)
          ? client.Vehicle
          : [];
        const latest = vehicles[0];

        setExistingVehicles(vehicles);
        setForm((prev) => ({
          ...prev,
          contactName:
            prev.contactName ||
            `${client.firstName || ""} ${client.lastName || ""}`.trim(),
          contactEmail: prev.contactEmail || client.email || "",
          vehicleYear:
            prev.vehicleYear ||
            (latest?.year != null ? String(latest.year) : ""),
          vehicleMake: prev.vehicleMake || latest?.make || "",
          vehicleModel: prev.vehicleModel || latest?.model || "",
        }));
      } else {
        setExistingVehicles([]);
      }
    } catch {
      // silent
    } finally {
      setIsLookingUp(false);
    }
  };

  const toggleService = (serviceId: number) => {
    set(
      "selectedServiceIds",
      form.selectedServiceIds.includes(serviceId)
        ? form.selectedServiceIds.filter((id) => id !== serviceId)
        : [...form.selectedServiceIds, serviceId],
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shopId) return;
    setIsSubmitting(true);
    setError(null);

    const hasVehicleDetails =
      form.vehicleMake && form.vehicleModel && form.vehicleYear;

    const payload = {
      shopId,
      contactName: form.contactName,
      contactEmail: form.contactEmail,
      contactPhone: form.contactPhone,
      urgencyLevel: form.urgencyLevel,
      reasonCategory: form.reasonCategory,
      description: form.description,
      requestedDate: form.requestedDate || undefined,
      requestedTime: form.requestedTime || undefined,
      flexibleTiming: form.flexibleTiming,
      // prefer known vehicle ID; fall back to details for create-on-server
      vehicleId: matchedVehicleId,
      vehicleDetails:
        !matchedVehicleId && hasVehicleDetails
          ? {
              make: form.vehicleMake,
              model: form.vehicleModel,
              year: Number(form.vehicleYear),
            }
          : undefined,
      requestedServices: form.selectedServiceIds.map((id) => ({
        shpServiceId: id,
      })),
    };

    try {
      const res = await axios.post(
        "/api/virtual-shop/emergency-requests",
        payload,
      );
      setSuccess(res.data);
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
          err?.response?.data?.error ||
          "Failed to submit request. Please try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setSuccess(null);
    setError(null);
    setForm(DEFAULT_FORM);
    setExistingVehicles([]);
    onClose();
  };

  if (!isOpen) return null;

  const inputClass =
    "w-full px-3 py-2 text-sm rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-background rounded-2xl shadow-2xl border border-border">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-red-600 text-white px-6 py-4 flex items-center justify-between rounded-t-2xl">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 flex-shrink-0" />
            <div>
              <h2 className="font-bold text-lg leading-tight">
                Emergency Service Request
              </h2>
              <p className="text-xs text-red-100">
                Our team will respond as quickly as possible
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="text-white/80 hover:text-white transition-colors ml-4 flex-shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Success State */}
        {success ? (
          <div className="p-8 text-center space-y-4">
            <div className="flex justify-center">
              <CheckCircle2 className="w-16 h-16 text-green-500" />
            </div>
            <h3 className="text-xl font-bold">Request Submitted!</h3>
            <p className="text-muted-foreground text-sm">{success.message}</p>
            <div className="bg-muted rounded-xl p-4 space-y-2 text-sm text-left">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Request ID</span>
                <span className="font-bold">#{success.requestId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  Estimated Response
                </span>
                <span className="font-semibold text-primary">
                  {success.estimatedReviewTime}
                </span>
              </div>
            </div>
            <Button onClick={handleClose} className="w-full">
              Close
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* Contact Info */}
            <section className="space-y-4">
              <h3 className="font-semibold text-xs uppercase tracking-wider text-muted-foreground">
                Contact Information
              </h3>

              <div className="space-y-1">
                <label className="text-sm font-medium">Phone Number *</label>
                <div className="relative">
                  <input
                    type="tel"
                    value={form.contactPhone}
                    onChange={(e) => set("contactPhone", e.target.value)}
                    onBlur={handlePhoneLookup}
                    placeholder="(555) 000-0000"
                    required
                    className={inputClass + " pr-10"}
                  />
                  {isLookingUp && (
                    <Loader2 className="absolute right-3 top-2.5 w-4 h-4 animate-spin text-muted-foreground" />
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  We'll look up your account automatically
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-sm font-medium">Full Name *</label>
                  <input
                    type="text"
                    value={form.contactName}
                    onChange={(e) => set("contactName", e.target.value)}
                    placeholder="John Smith"
                    required
                    className={inputClass}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium">Email *</label>
                  <input
                    type="email"
                    value={form.contactEmail}
                    onChange={(e) => set("contactEmail", e.target.value)}
                    placeholder="john@example.com"
                    required
                    className={inputClass}
                  />
                </div>
              </div>
            </section>

            {/* Urgency Level */}
            <section className="space-y-3">
              <h3 className="font-semibold text-xs uppercase tracking-wider text-muted-foreground">
                Urgency Level *
              </h3>
              <div className="grid grid-cols-2 gap-2">
                {URGENCY_LEVELS.map((level) => (
                  <button
                    key={level.value}
                    type="button"
                    onClick={() => set("urgencyLevel", level.value)}
                    className={`p-3 rounded-xl border-2 text-left transition-all ${
                      form.urgencyLevel === level.value
                        ? URGENCY_COLORS[level.value]
                        : "border-border hover:border-muted-foreground"
                    }`}
                  >
                    <div className="font-semibold text-xs">{level.label}</div>
                    <div className="text-xs opacity-70 mt-0.5">
                      {level.desc}
                    </div>
                  </button>
                ))}
              </div>
            </section>

            {/* Reason */}
            <section className="space-y-2">
              <label className="font-semibold text-xs uppercase tracking-wider text-muted-foreground block">
                Reason *
              </label>
              <select
                value={form.reasonCategory}
                onChange={(e) => set("reasonCategory", e.target.value)}
                required
                className={inputClass}
              >
                {REASON_CATEGORIES.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
            </section>

            {/* Description */}
            <section className="space-y-2">
              <label className="font-semibold text-xs uppercase tracking-wider text-muted-foreground block">
                Describe the Issue *
              </label>
              <textarea
                value={form.description}
                onChange={(e) => set("description", e.target.value)}
                placeholder="Please describe what's happening with your vehicle..."
                required
                rows={3}
                className={inputClass + " resize-none"}
              />
            </section>

            {/* Services */}
            <section className="space-y-3">
              <h3 className="font-semibold text-xs uppercase tracking-wider text-muted-foreground">
                Services Needed{" "}
                <span className="normal-case font-normal">(optional)</span>
              </h3>

              {allServices.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  No services available
                </p>
              ) : (
                <div className="border border-border rounded-xl overflow-hidden">
                  <div className="max-h-48 overflow-y-auto divide-y divide-border">
                    {allServices.map((svc) => {
                      const checked = form.selectedServiceIds.includes(svc.id);
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
                            onChange={() => toggleService(svc.id)}
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
                  </div>
                  {form.selectedServiceIds.length > 0 && (
                    <div className="px-4 py-2 bg-muted/50 border-t border-border">
                      <p className="text-xs text-muted-foreground">
                        <span className="font-semibold text-foreground">
                          {form.selectedServiceIds.length}
                        </span>{" "}
                        service{form.selectedServiceIds.length !== 1 ? "s" : ""}{" "}
                        selected
                      </p>
                    </div>
                  )}
                </div>
              )}
            </section>

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
              <h3 className="font-semibold text-xs uppercase tracking-wider text-muted-foreground">
                Preferred Timing{" "}
                <span className="normal-case font-normal">(optional)</span>
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-sm font-medium">Date</label>
                  <input
                    type="date"
                    value={form.requestedDate}
                    onChange={(e) => set("requestedDate", e.target.value)}
                    min={new Date().toISOString().split("T")[0]}
                    className={inputClass}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium">Time</label>
                  <input
                    type="time"
                    value={form.requestedTime}
                    onChange={(e) => set("requestedTime", e.target.value)}
                    className={inputClass}
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
              className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-xl gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <AlertTriangle className="w-4 h-4" />
                  Submit Emergency Request
                </>
              )}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
};
