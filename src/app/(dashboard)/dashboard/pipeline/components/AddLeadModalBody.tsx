"use client";

import { getCompany } from "@/actions/settings/getCompany";
import { DialogContent } from "@/components/Dialog";

import { Company } from "@prisma/client";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import ServiceSelectAndAdd from "@/components/ServiceSelectAndAdd";
import {
  useGetAllYears,
  useGetMake,
  useGetModelsByYearAndMake,
} from "@/hooks/useCarData";
import { salesPipelineKeyStr } from "@/utils/enums/query-key-constant";
import Selector from "../../settings/automation/components/Selector";

const AddLeads = ({ onClose }: { onClose?: () => void }) => {
  const queryClient = useQueryClient();
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
    token: "",
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

  // Extract source and token from URL on component mount
  useEffect(() => {
    const fetchTokenAndSetSource = async () => {
      try {
        const res: Company | null = await getCompany();
        setFormData((prev) => ({
          ...prev,
          token: res?.zapierToken || "",
        }));
      } catch (err) {
        console.error("Failed to fetch token", err);
      }
    };

    fetchTokenAndSetSource();
  }, []);

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

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_APP_URL}/api/lead-generate`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-TOKEN": formData.token,
          },
          body: JSON.stringify({
            name: formData.name,
            email: formData.email,
            phone: formData.phone,
            serviceId: formData.service,
            oppurtunity_source: opportunitySource,
          }),
        },
      );

      if (response.ok) {
        setFormStatus({
          message: "Lead created successfully!",
          type: "success",
        });

        // Invalidate and refetch pipeline data
        await queryClient.invalidateQueries({
          queryKey: [salesPipelineKeyStr.salesPipeline],
        });
        await queryClient.invalidateQueries({
          queryKey: [salesPipelineKeyStr.salesPipelineCount],
        });

        onClose?.();

        // Reset form fields except source and token
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
        });
      } else {
        setFormStatus({
          message: "Failed to create lead. Please try again.",
          type: "error",
        });
      }
    } catch (error) {
      setFormStatus({
        message: "An error occurred. Please try again later.",
        type: "error",
      });
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
      onCloseAutoFocus={() => setFormStatus({ message: "", type: null })}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <label
            htmlFor="name"
            className="block text-sm font-medium text-gray-700"
          >
            Full Name<span className="text-red-500"> *</span>
          </label>
          <input
            id="name"
            type="text"
            name="name"
            placeholder="John Doe"
            value={formData.name}
            onChange={handleChange}
            required
            className="w-full rounded-sm border border-slate-400 bg-background px-2 py-0.5 leading-6 outline-none"
          />
        </div>

        <div className="space-y-2">
          <label
            htmlFor="email"
            className="block text-sm font-medium text-gray-700"
          >
            Email Address
          </label>
          <input
            id="email"
            type="email"
            name="email"
            placeholder="john@example.com"
            value={formData.email}
            onChange={handleChange}
            className="w-full rounded-sm border border-slate-400 bg-background px-2 py-0.5 leading-6 outline-none"
          />
        </div>

        <div className="space-y-2">
          <label
            htmlFor="phone"
            className="block text-sm font-medium text-gray-700"
          >
            Phone Number<span className="text-red-500"> *</span>
          </label>
          <input
            id="phone"
            type="text"
            name="phone"
            placeholder="+1 (555) 123-4567"
            value={formData.phone}
            onChange={handleChange}
            required
            className={`w-full rounded-sm border ${
              fieldErrors.phone ? "border-red-500" : "border-slate-400"
            } bg-background px-2 py-0.5 leading-6 outline-none`}
          />
          {fieldErrors.phone && (
            <p className="mt-1 text-sm text-red-600">{fieldErrors.phone}</p>
          )}
        </div>

        {/* Vehicle Information Section */}
        <div className="border-t border-gray-200 pb-1 pt-2">
          <h3 className="text-md font-medium text-gray-700">
            Vehicle Information<span className="text-red-500"> *</span>
          </h3>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
            disabled={formData.others != ""} // Disable this field as per your requirement
            // error={isYearFetchError ? "Failed to fetch years" : undefined}
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
            disabled={formData.others != ""} // Disable this field as per your requirement
            // error={isMakeFetchError ? "Failed to fetch Makes" : undefined}
          />

          <Selector
            name="vehicle_model"
            label="Model"
            placeholder="Select model"
            options={vehicleModelOptions || []}
            // rootClassName="w-1/3"
            value={formData.vehicle_model || ""}
            onChange={(value) =>
              setFormData((prev) => ({ ...prev, vehicle_model: value }))
            }
            isSearch={true}
            isClear={true}
            required={true}
            disabled={formData.others != ""} // Disable this field as per your requirement
            // error={isModelsFetchError ? "Failed to fetch Models" : undefined}
          />
        </div>

        <div className="space-y-2">
          <label
            htmlFor="others"
            className="block text-sm font-medium text-gray-700"
          >
            Others
             {/* <span className="text-red-500"> *</span> */}
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
            } // Disable this field as per your requirement
            className="w-full rounded-sm border border-slate-400 bg-background px-2 py-0.5 leading-6 outline-none"
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
          className="w-full rounded-md bg-[#6571FF] px-4 py-2 font-medium text-white transition-colors duration-200 disabled:cursor-not-allowed disabled:opacity-50"
          disabled={isSubmitting || !!fieldErrors.phone}
        >
          {isSubmitting ? "Adding..." : "Add Lead"}
        </button>
      </form>
    </DialogContent>
  );
};

export default AddLeads;
