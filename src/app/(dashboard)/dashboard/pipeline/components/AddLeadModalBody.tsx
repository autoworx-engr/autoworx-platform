"use client";

import { createLeadFromForm } from "@/actions/lead/createLeadFromForm";
import { DialogContent } from "@/components/Dialog";

import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import PhoneInput from "@/components/PhoneInput";
import ServiceSelectAndAdd from "@/components/ServiceSelectAndAdd";
import { SlimInput, slimInputClassName } from "@/components/SlimInput";
import {
  useGetAllYears,
  useGetMake,
  useGetModelsByYearAndMake,
} from "@/hooks/useCarData";
import { cn } from "@/lib/cn";
import { errorToast, successToast } from "@/lib/toast";
import { salesPipelineKeyStr } from "@/utils/enums/query-key-constant";
import Selector from "../../settings/automation/components/Selector";

const AddLeads = ({ onClose }: { onClose?: () => void }) => {
  const queryClient = useQueryClient();
  const router = useRouter();
  const [phoneNumber, setPhoneNumber] = useState("");
  const [countryCode, setCountryCode] = useState("");
  const [isoCode, setIsoCode] = useState("");
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    vehicle_year: "",
    vehicle_make: "",
    vehicle_model: "",
    others: "",
    service: "" as string | { id: string | number; title: string },
    source: "",
    countryCode: "US",
  });

  const [selectedService, setSelectedService] = useState<{
    id: string | number;
    title: string;
  } | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ [key: string]: string }>({
    phone: "",
  });
  const {
    data: years,
    isLoading: isYearsLoading,
    isError: isYearFetchError,
  }: any = useGetAllYears();
  const {
    data: makes,
    isLoading: isMakeLoading,
    isError: isMakeFetchError,
  }: any = useGetMake();
  const { data: models, isError: isModelsFetchError }: any =
    useGetModelsByYearAndMake(formData.vehicle_year!, formData.vehicle_make!);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formStatus, setFormStatus] = useState<FormStatus>({
    message: "",
    type: null,
  });

  const handleServiceChange = (
    value: string | { id: string | number; title: string },
  ) => {
    if (typeof value === "object") {
      // Store the full object separately
      setSelectedService(value);
      // Store only the ID in formData
      setFormData((prev) => ({ ...prev, service: value.id.toString() }));
    } else {
      // If it's just a string (ID), store it directly
      setSelectedService(null);
      setFormData((prev) => ({ ...prev, service: value }));
    }
  };

  useEffect(() => {
    const fullPhone = `${countryCode}${phoneNumber}`;
    setFormData((prev) => ({
      ...prev,
      phone: fullPhone,
      countryCode: isoCode,
    }));

    // Validate phone number length (at least 10 digits)
    if (phoneNumber && phoneNumber.length < 10) {
      setFieldErrors({
        ...fieldErrors,
        phone: "Phone number must be at least 10 digits",
      });
    } else if (phoneNumber) {
      clearFieldError("phone");
    }
  }, [phoneNumber, countryCode, isoCode]);
  const NAME_REGEX = /^[A-Za-z\s\-']+$/;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;

    // Special validation for phone field
    if (name === "phone") {
      // Update the value in state regardless of validation
      setFormData({
        ...formData,
        phone: value,
      });

      // Only show error if value is not empty and doesn't start with +1
      if (value && !value.startsWith("+1")) {
        setFieldErrors({
          ...fieldErrors,
          phone: "Phone number must start with +1",
        });
      } else {
        clearFieldError("phone");
      }
    } else {
      // Handle all other fields normally
      setFormData({
        ...formData,
        [name]: value,
      });

      if (name === "name" && value && !NAME_REGEX.test(value)) {
        setFieldErrors((prev) => ({
          ...prev,
          name: "Name can only contain letters, spaces, hyphens, and apostrophes",
        }));
      } else {
        clearFieldError(name);
      }
    }
  };

  const clearFieldError = (field: string) => {
    if (fieldErrors[field]) {
      const newErrors = { ...fieldErrors };
      delete newErrors[field];
      setFieldErrors(newErrors);
    }
  };

  interface FormStatus {
    message: string;
    type: "success" | "error" | null;
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (formData.name && !/^[A-Za-z\s\-']+$/.test(formData.name.trim())) {
      setFieldErrors((prev) => ({
        ...prev,
        name: "Name can only contain letters, spaces, hyphens, and apostrophes",
      }));
      return;
    }

    if (!formData.others) {
      if (
        !formData.vehicle_year ||
        !formData.vehicle_make ||
        !formData.vehicle_model
      ) {
        errorToast("Please select Year, Make, and Model for the vehicle");
        return;
      }
    }

    if (!formData.service) {
      errorToast("Please select a service");
      return;
    }

    if (!formData.source) {
      errorToast("Please select a lead source");
      return;
    }

    setIsSubmitting(true);
    setFormStatus({ message: "", type: null });

    try {
      const serviceTitle = selectedService?.title || formData.service;
      // Use 'others' as vehicle info if filled, else use year/make/model
      let vehicleInfo = "";
      if (formData.others) {
        vehicleInfo = formData.others;
      } else {
        vehicleInfo = `${formData.vehicle_year} ${formData.vehicle_make} ${formData.vehicle_model}`;
      }
      // Construct the opportunity source string in the required format
      const opportunitySource = `(${formData.source}) ${vehicleInfo} | ${serviceTitle}`;

      await createLeadFromForm({
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        countryCode: formData.countryCode,
        serviceId: String(formData.service),
        opportunity_source: opportunitySource,
        source: formData.source,
      });

      setFormStatus({ message: "Lead created successfully!", type: "success" });
      successToast("Lead created successfully!");

      await queryClient.invalidateQueries({
        queryKey: [salesPipelineKeyStr.salesPipeline],
      });
      await queryClient.invalidateQueries({
        queryKey: [salesPipelineKeyStr.salesPipelineCount],
      });

      router.refresh();
      onClose?.();

      setFormData({
        ...formData,
        name: "",
        email: "",
        phone: "",
        vehicle_year: "",
        vehicle_make: "",
        vehicle_model: "",
        others: "",
        service: "",
        source: "",
        countryCode: "US",
      });
      setPhoneNumber("");
      setCountryCode("+1");
    } catch (error) {
      setFormStatus({
        message: "An error occurred. Please try again later.",
        type: "error",
      });
      errorToast("An error occurred. Please try again later.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const vehicleOptions = makes?.data?.map((vehicle: any) => ({
    title: vehicle.name ?? "Unknown",
    id: vehicle.name,
  }));
  const vehicleModelOptions = models?.data?.map((vehicle: any) => ({
    title: vehicle.name ?? "Unknown",
    id: vehicle.name,
  }));

  // Hardcoded Lead Source options
  const leadSourceOptions = [
    { title: "Referrals", id: "Referrals" },
    { title: "Meta", id: "Meta" },
    { title: "Instagram", id: "Instagram" },
    { title: "TikTok", id: "TikTok" },
    { title: "Yelp", id: "Yelp" },
    { title: "Google", id: "Google" },
    { title: "Website", id: "Website" },
    { title: "Trade show", id: "Trade show" },
    { title: "LinkedIn", id: "LinkedIn" },
    { title: "Walk-in", id: "Walk-in" },
    { title: "Phone Call", id: "Phone Call" },
  ];

  return (
    <DialogContent
      className="max-h-full flex flex-col"
      onCloseAutoFocus={() => setFormStatus({ message: "", type: null })}
    >
      {/* Header */}
      <div className="shrink-0 px-2 pt-6 pb-2 md:px-4">
        <h1 className="text-2xl font-bold tracking-tight text-slate-600 dark:text-slate-100">
          Add Lead
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Enter details for the new lead opportunity
        </p>
      </div>

      {/* Scrollable body */}
      <form
        id="add-lead-form"
        onSubmit={handleSubmit}
        className="flex-1 space-y-4 overflow-y-auto px-2 py-2 scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-700 scrollbar-track-transparent md:px-4"
      >
        {/* Contact Information */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <SlimInput
            name="name"
            label="Full Name"
            placeholder="John Doe"
            value={formData.name}
            onChange={handleChange}
            required
            error={fieldErrors.name}
          />
          <SlimInput
            name="email"
            type="email"
            label="Email Address"
            placeholder="john@example.com"
            value={formData.email}
            onChange={handleChange}
          />
        </div>

        <PhoneInput
          label="Phone Number"
          placeholder="(555) 123-4567"
          required
          onChange={(phone, code, isoCode) => {
            setPhoneNumber(phone);
            setCountryCode(code);
            setIsoCode(isoCode);
          }}
          error={fieldErrors.phone}
        />
        {/* Vehicle Information Section */}
        <div className="border-t border-slate-200 pb-1 pt-3 dark:border-slate-700">
          <h3 className="text-base font-semibold text-slate-600 dark:text-slate-300">
            Vehicle Information <span className="text-[#E9405F]">*</span>
          </h3>
          <p className="mt-0.5 text-xs text-slate-400">
            Select year, make &amp; model or use the field below for unlisted
            vehicles
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Selector
            name="vehicle_year"
            label="Year"
            placeholder="Select year"
            options={years?.data}
            value={formData.vehicle_year || ""}
            onChange={(value) =>
              setFormData((prev) => ({ ...prev, vehicle_year: value }))
            }
            isSearch={true}
            isClear={true}
            required={true}
            disabled={formData.others !== ""}
          />
          <Selector
            name="vehicle_make"
            label="Make"
            placeholder="Select make"
            options={vehicleOptions || []}
            value={formData.vehicle_make || ""}
            onChange={(value) =>
              setFormData((prev) => ({ ...prev, vehicle_make: value }))
            }
            isSearch={true}
            isClear={true}
            required={true}
            disabled={formData.others !== ""}
          />
          <Selector
            name="vehicle_model"
            label="Model"
            placeholder="Select model"
            options={vehicleModelOptions || []}
            value={formData.vehicle_model || ""}
            onChange={(value) =>
              setFormData((prev) => ({ ...prev, vehicle_model: value }))
            }
            isSearch={true}
            isClear={true}
            required={true}
            disabled={formData.others !== ""}
          />
        </div>

        <div className="space-y-2">
          <label
            htmlFor="others"
            className="block text-sm font-medium text-gray-700"
          >
            Others
            <span className="text-xs">
              {" "}
              (Vehicle not listed or non-vehicle job? Enter details here)
            </span>
          </label>
          <input
            id="others"
            type="text"
            name="others"
            placeholder="Anything else you want to add"
            value={formData.others}
            onChange={handleChange}
            required
            disabled={
              formData.vehicle_year != "" ||
              formData.vehicle_make != "" ||
              formData.vehicle_model != ""
                ? true
                : false
            }
            className={cn(
              "w-full rounded-sm border border-slate-400 bg-background px-2 py-0.5 leading-6 outline-none",
              slimInputClassName,
            )}
          />
        </div>

        <div className="space-y-2">
          <ServiceSelectAndAdd
            value={formData.service}
            onChange={handleServiceChange}
          />
        </div>

        <Selector
          name="source"
          label="Lead Source"
          placeholder="e.g., website, phone call, etc."
          options={leadSourceOptions}
          value={formData.source || ""}
          onChange={(value) =>
            setFormData((prev) => ({ ...prev, source: value }))
          }
          isSearch={true}
          isClear={true}
          required={true}
        />

        {formStatus.message && (
          <div
            className={`rounded-md p-3 ${
              formStatus.type === "success"
                ? "border border-emerald-200 bg-emerald-50 text-emerald-700"
                : "border border-red-200 bg-red-50 text-red-700"
            }`}
          >
            {formStatus.message}
          </div>
        )}

        <button
          type="submit"
          className="w-full rounded-lg bg-gradient-to-r from-primary to-[#5a66ee] px-4 py-2 font-medium text-white transition-colors duration-200 disabled:cursor-not-allowed disabled:opacity-50"
          disabled={isSubmitting || !!fieldErrors.phone}
        >
          {isSubmitting ? "Adding..." : "Add Lead"}
        </button>
      </form>
    </DialogContent>
  );
};

export default AddLeads;
