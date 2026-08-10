"use client";

import { useMemo, useState } from "react";
import axios from "axios";
import { ExistingVehicle } from "../CheckoutVehicleSection";
import { DEFAULT_FORM, FormState, SelectedService, SuccessData } from "./types";

export function useEmergencyRequest(
  shopId?: number,
  onClose?: () => void,
  cartServices: SelectedService[] = [],
) {
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

  const matchedVehicleId = useMemo(() => {
    if (!form.vehicleYear || !form.vehicleMake || !form.vehicleModel)
      return undefined;
    return existingVehicles.find(
      (v) =>
        String(v.year) === form.vehicleYear &&
        v.make === form.vehicleMake &&
        v.model === form.vehicleModel,
    )?.id;
  }, [form.vehicleYear, form.vehicleMake, form.vehicleModel, existingVehicles]);

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
      // silent — lookup failure shouldn't block the form
    } finally {
      setIsLookingUp(false);
    }
  };

  const handleVehicleChange = (
    field: "vehicleYear" | "vehicleMake" | "vehicleModel",
    value: string,
  ) => set(field, value);

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
      description: form.description,
      requestedDate: form.requestedDate || undefined,
      requestedTime: form.requestedTime || undefined,
      flexibleTiming: form.flexibleTiming,
      vehicleId: matchedVehicleId,
      vehicleDetails:
        !matchedVehicleId && hasVehicleDetails
          ? {
              make: form.vehicleMake,
              model: form.vehicleModel,
              year: Number(form.vehicleYear),
            }
          : undefined,
      requestedServices: cartServices.map((s) => ({
        shopServiceId: s.serviceId,
        vehicleType: s.vehicleType ?? undefined,
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
    onClose?.();
  };

  return {
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
  };
}
