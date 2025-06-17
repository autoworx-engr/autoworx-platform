"use client";

import { getCompany } from "@/actions/settings/getCompany";
import { Dialog, DialogContent, DialogTrigger } from "@/components/Dialog";

import { Company } from "@prisma/client";
import { useEffect, useState } from "react";

import ServiceSelectAndAdd from "@/components/ServiceSelectAndAdd";

const AddLeads = ({
  buttonChild,
  onClose,
}: {
  buttonChild: React.ReactNode;
  onClose?: () => void;
}) => {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    vehicle_year: "",
    vehicle_make: "",
    vehicle_model: "",
    service: "" as string | { id: string | number; title: string },
    source: "",
    token: "",
  });

  const [selectedService, setSelectedService] = useState<{ id: string | number; title: string } | null>(null)
  const [fieldErrors, setFieldErrors] = useState<{ [key: string]: string }>({
    phone: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formStatus, setFormStatus] = useState<FormStatus>({
    message: "",
    type: null,
  });

  const handleServiceChange = (value: string | { id: string | number; title: string }) => {
    if (typeof value === "object") {
      // Store the full object separately
      setSelectedService(value)
      // Store only the ID in formData
      setFormData((prev) => ({ ...prev, service: value.id.toString() }))
    } else {
      // If it's just a string (ID), store it directly
      setSelectedService(null)
      setFormData((prev) => ({ ...prev, service: value }))
    }
  }

  // Extract source and token from URL on component mount
  useEffect(() => {
    const fetchTokenAndSetSource = async () => {
      try {
        const res: Company = await getCompany();
        setFormData((prev) => ({
          ...prev,
          token: res.zapierToken || "",
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
      const serviceTitle = selectedService?.title || formData.service
      // Construct the opportunity source string in the required format
      const opportunitySource = `(${formData.source}) ${formData.vehicle_year} ${formData.vehicle_make} ${formData.vehicle_model} | ${serviceTitle}`;

      console.log(opportunitySource, "from line 123")
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
console.log("response from 141", response)
      if (response.ok) {
        setFormStatus({
          message: "Lead created successfully!",
          type: "success",
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

  console.log("formData console::::", formData)
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{buttonChild}</DialogTrigger>
      <DialogContent
        onCloseAutoFocus={() => setFormStatus({ message: "", type: null })}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label
              htmlFor="name"
              className="block text-sm font-medium text-gray-700"
            >
              Full Name
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
              Phone Number
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
              Vehicle Information
            </h3>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-2">
              <label
                htmlFor="vehicle_year"
                className="block text-sm font-medium text-gray-700"
              >
                Year
              </label>
              <input
                id="vehicle_year"
                type="text"
                name="vehicle_year"
                placeholder="2019"
                value={formData.vehicle_year}
                onChange={handleChange}
                required
                className="w-full rounded-sm border border-slate-400 bg-background px-2 py-0.5 leading-6 outline-none"
              />
            </div>

            <div className="space-y-2">
              <label
                htmlFor="vehicle_make"
                className="block text-sm font-medium text-gray-700"
              >
                Make
              </label>
              <input
                id="vehicle_make"
                type="text"
                name="vehicle_make"
                placeholder="Honda"
                value={formData.vehicle_make}
                onChange={handleChange}
                required
                className="w-full rounded-sm border border-slate-400 bg-background px-2 py-0.5 leading-6 outline-none"
              />
            </div>

            <div className="space-y-2">
              <label
                htmlFor="vehicle_model"
                className="block text-sm font-medium text-gray-700"
              >
                Model
              </label>
              <input
                id="vehicle_model"
                type="text"
                name="vehicle_model"
                placeholder="Civic"
                value={formData.vehicle_model}
                onChange={handleChange}
                required
                className="w-full rounded-sm border border-slate-400 bg-background px-2 py-0.5 leading-6 outline-none"
              />
            </div>
          </div>

          <div className="space-y-2">
            <ServiceSelectAndAdd
              value={formData.service}
              onChange={handleServiceChange}
            />
          </div>
          <div className="space-y-2">
            <label
              htmlFor="source"
              className="block text-sm font-medium text-gray-700"
            >
              Lead Source
            </label>
            <input
              id="source"
              type="text"
              name="source"
              placeholder="e.g., website, phone call, etc."
              value={formData.source}
              onChange={handleChange}
              required
              className="w-full rounded-sm border border-slate-400 bg-background px-2 py-0.5 leading-6 outline-none"
            />
          </div>

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
    </Dialog>
  );
};

export default AddLeads;
