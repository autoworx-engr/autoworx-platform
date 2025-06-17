"use client";

import { getLegalBusinessName } from "@/actions/settings/getLegalBusinessName";
import { useState, useEffect } from "react";
import ServiceSelectAndAdd from "./ServiceSelectAndAdd";

const ZapForm = () => {
  const [legalBusinessName, setLegalBusinessName] = useState<string>("");
  const [consent, setConsent] = useState<boolean>(false);
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
  const [fieldErrors, setFieldErrors] = useState<{ [key: string]: string }>(
    {}
  );

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formStatus, setFormStatus] = useState<{
    message: string;
    type: "success" | "error" | null;
  }>({
    message: "",
    type: null,
  });

  // Extract source and token from URL on component mount
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const sourceParam = params.get("source");
      const tokenParam = params.get("token");

      if (tokenParam) {
        getLegalBusinessName(tokenParam)
          .then((name) => {
            if (name) {
              setLegalBusinessName(name);
            }
          })
          .catch((error) => {
            console.error("Error fetching legal business name:", error);
          });
      }

      // Initial update from URL params
      setFormData((prev) => ({
        ...prev,
        ...(sourceParam ? { source: sourceParam } : {}),
        ...(tokenParam ? { token: tokenParam } : {}),
      }));

      // Handler for postMessage
      const handleMessage = (event: MessageEvent) => {
        const { source, token } = event.data || {};
        if (!source && !token) return;

        setFormData((prev) => ({
          ...prev,
          ...(source ? { source } : {}),
          ...(token ? { token } : {}),
        }));
      };

      window.addEventListener("message", handleMessage);

      return () => {
        window.removeEventListener("message", handleMessage);
      };
    } catch (error) {
      console.error("Error processing parameters:", error);
    }
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
  
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFormStatus({ message: "", type: null });

    try {
      const serviceTitle = selectedService?.title || formData.service
      // Construct the opportunity source string in the required format
      const opportunitySource = `(${formData.source}) ${formData.vehicle_year} ${formData.vehicle_make} ${formData.vehicle_model} | ${serviceTitle}`;

      // Use absolute URL for API endpoint
      const apiEndpoint = `${process.env.NEXT_PUBLIC_SITE_URL}/api/lead-generate`;

      const response = await fetch(apiEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-TOKEN": formData.token,
        },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          oppurtunity_source: opportunitySource,
        }),
      });

      if (response.ok) {
        setFormStatus({
          message: "Lead created successfully!",
          type: "success",
        });

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

  return (
    <div className="mx-auto w-full max-w-md">
      <div className="overflow-hidden rounded-lg border-2 border-[#00b8b0] bg-background shadow-lg">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#00b8b0] to-[#0098da] px-6 py-4">
          <h2 className="text-center text-2xl font-bold text-white">
            Service Lead Form
          </h2>
          <p className="mt-1 text-center text-white text-opacity-90">
            Submit your vehicle information to request service
          </p>
          {formData.source && (
            <div className="mt-2 rounded bg-background/20 px-3 py-1 text-center text-sm text-white">
              Source: {formData.source}
            </div>
          )}
        </div>

        {/* Form Content */}
        <div className="p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label
                htmlFor="name"
                className="block text-sm font-medium text-gray-700"
              >
                Full Name*
              </label>
              <input
                id="name"
                type="text"
                name="name"
                placeholder="John Doe"
                value={formData.name}
                onChange={handleChange}
                required
                className="w-full rounded-md border-2 border-gray-300 px-4 py-2 placeholder:text-gray-500 focus:border-[#00b8b0] focus:outline-none focus:ring-2 focus:ring-[#00b8b0]"
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
                className="w-full rounded-md border-2 border-gray-300 px-4 py-2 placeholder:text-gray-500 focus:border-[#00b8b0] focus:outline-none focus:ring-2 focus:ring-[#00b8b0]"
              />
            </div>

            <div className="space-y-2">
              <label
                htmlFor="phone"
                className="block text-sm font-medium text-gray-700"
              >
                Phone Number*
              </label>
              <input
                id="phone"
                type="text"
                name="phone"
                placeholder="+1 (555) 123-4567"
                value={formData.phone}
                onChange={handleChange}
                required
                className={`w-full rounded-md border-2 ${
                  fieldErrors.phone ? "border-red-500" : "border-gray-300"
                } px-4 py-2 placeholder:text-gray-500 focus:border-[#00b8b0] focus:outline-none focus:ring-2 focus:ring-[#00b8b0]`}
              />
              {fieldErrors.phone && (
                <p className="mt-1 text-sm text-red-600">{fieldErrors.phone}</p>
              )}
            </div>
<div className="space-y-2">
             
              <ServiceSelectAndAdd value={formData.service} onChange={handleServiceChange}/>
            </div>

            {/* Vehicle Information Section */}
            <div className="border-t border-gray-200 pb-1 pt-2">
              <h3 className="text-md font-medium text-gray-700">
                Vehicle Information*
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
                  className="w-full rounded-md border-2 border-gray-300 px-4 py-2 placeholder:text-gray-500 focus:border-[#00b8b0] focus:outline-none focus:ring-2 focus:ring-[#00b8b0]"
                />
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="vehicle_make"
                  className="block text-sm font-medium text-gray-700"
                >
                  Make*
                </label>
                <input
                  id="vehicle_make"
                  type="text"
                  name="vehicle_make"
                  placeholder="Honda"
                  value={formData.vehicle_make}
                  onChange={handleChange}
                  required
                  className="w-full rounded-md border-2 border-gray-300 px-4 py-2 placeholder:text-gray-500 focus:border-[#00b8b0] focus:outline-none focus:ring-2 focus:ring-[#00b8b0]"
                />
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="vehicle_model"
                  className="block text-sm font-medium text-gray-700"
                >
                  Model*
                </label>
                <input
                  id="vehicle_model"
                  type="text"
                  name="vehicle_model"
                  placeholder="Civic"
                  value={formData.vehicle_model}
                  onChange={handleChange}
                  required
                  className="w-full rounded-md border-2 border-gray-300 px-4 py-2 placeholder:text-gray-500 focus:border-[#00b8b0] focus:outline-none focus:ring-2 focus:ring-[#00b8b0]"
                />
              </div>
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
              className="w-full rounded-md bg-gradient-to-r from-[#00b8b0] to-[#0098da] px-4 py-2 font-medium text-white transition-colors duration-200 hover:bg-[#00b8b0] focus:outline-none focus:ring-2 focus:ring-[#00b8b0] focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={isSubmitting || !consent || !!fieldErrors.phone}
            >
              {isSubmitting ? "Submitting..." : "Request Service"}
            </button>
          </form>
        </div>

        {/* Footer */}
        <div className="border-t border-[#00b8b0] bg-gradient-to-r from-[#00b8b0] to-[#0098da] px-6 py-3 text-center text-sm text-white">
          <div className="fle items-center justify-center space-x-2">
            <input
              type="checkbox"
              id="consent"
              checked={consent || false}
              onChange={(e) => setConsent(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-[#00b8b0] focus:ring-[#00b8b0] cursor-pointer"
            />
            <label htmlFor="consent" className="text-white text-opacity-90">
              I agree to receive text messages, emails, and calls from{" "}
              {legalBusinessName} regarding my inquiry and related services.
              Message and data rates may apply. Reply STOP to opt out at any
              time.
            </label>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ZapForm;
