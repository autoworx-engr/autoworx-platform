"use client";

import { getLegalBusinessName } from "@/actions/settings/getLegalBusinessName";
import { useState, useEffect } from "react";
import ServiceSelectAndAddPublic from "./ServiceSelectAndAddPublic";
import {
  useGetAllYears,
  useGetMake,
  useGetModelsByYearAndMake,
} from "@/hooks/useCarData";
import Selector from "../app/(dashboard)/dashboard/settings/automation/components/Selector";
import { TermsAndPolicyModal } from "./TermsAndPolicyModal";
import Image from "next/image";
import { Globe, MapPin, Phone } from "lucide-react";
import { useSearchParams } from "next/navigation";
import PhoneInput from "./PhoneInput";

type ZapFormProps = {
  company: {
    name: string;
    image: string;
    website: string;
    phone: string;
    address: string;
    city: string;
    state: string;
    companyId: number;
  };
};
const ZapForm = ({ company }: ZapFormProps) => {
  const [legalBusinessName, setLegalBusinessName] = useState<string>("");
  const [consent, setConsent] = useState<boolean>(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    vehicle_year: "",
    vehicle_make: "",
    vehicle_model: "",
    others: "",
    multiServices: [] as { id: string | number; title: string }[],
    source: "",
    token: "",
    countryCode: "US",
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
  // const [selectedService, setSelectedService] = useState<{
  //   id: string | number;
  //   title: string;
  // } | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ [key: string]: string }>({});

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [phoneResetKey, setPhoneResetKey] = useState(0);
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

  const NAME_REGEX = /^[A-Za-z\s\-']+$/;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;

    setFormData({
      ...formData,
      [name]: value,
    });

    clearFieldError(name);

    if (name === "name" && value && !NAME_REGEX.test(value)) {
      setFieldErrors((prev) => ({
        ...prev,
        name: "Name can only contain letters, spaces, hyphens, and apostrophes",
      }));
    }
  };

  const clearFieldError = (field: string) => {
    if (fieldErrors[field]) {
      const newErrors = { ...fieldErrors };
      delete newErrors[field];
      setFieldErrors(newErrors);
    }
  };

  const handleServiceChange = (
    value: { id: string | number; title: string }[],
  ) => {
    setFormData((prev) => ({ ...prev, multiServices: value }));
  };

  const handlePhoneChange = (num: string, code: string, isoCode: string) => {
    const fullPhoneNumber = `${code}${num}`;

    setFormData((prev) => ({
      ...prev,
      phone: fullPhoneNumber,
      countryCode: isoCode,
    }));

    clearFieldError("phone");
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFormStatus({ message: "", type: null });

    const requiredFieldErrors: { [key: string]: string } = {};

    if (!formData.name.trim()) {
      requiredFieldErrors.name = "Full name is required";
    } else if (!/^[A-Za-z\s\-']+$/.test(formData.name.trim())) {
      requiredFieldErrors.name =
        "Name can only contain letters, spaces, hyphens, and apostrophes";
    }

    if (!formData.others) {
      if (!formData.vehicle_year) {
        requiredFieldErrors.vehicle_year = "Year is required";
      }

      if (!formData.vehicle_make) {
        requiredFieldErrors.vehicle_make = "Make is required";
      }

      if (!formData.vehicle_model) {
        requiredFieldErrors.vehicle_model = "Model is required";
      }
    }

    if (Object.keys(requiredFieldErrors).length > 0) {
      setFieldErrors((prev) => ({ ...prev, ...requiredFieldErrors }));
      setIsSubmitting(false);
      return;
    }

    if (!formData.phone || formData.phone.length < 10) {
      setFieldErrors({
        ...fieldErrors,
        phone: "Please enter a valid phone number",
      });
      setIsSubmitting(false);
      return;
    }
    try {
      const serviceTitle =
        formData.multiServices && formData.multiServices.length > 0
          ? formData.multiServices
              .map((s: { title: string }) => s.title)
              .join(", ")
          : "";

      // Use 'others' as vehicle info if filled, else use year/make/model
      let vehicleInfo = "";
      if (formData.others) {
        vehicleInfo = formData.others;
      } else {
        vehicleInfo = `${formData.vehicle_year} ${formData.vehicle_make} ${formData.vehicle_model}`;
      }
      // Construct the opportunity source string in the required format
      const opportunitySource = `(${formData.source}) ${vehicleInfo} | ${serviceTitle}`;

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
          countryCode: formData.countryCode,
          opportunity_source: opportunitySource,
          multiServices: formData?.multiServices,
        }),
      });
      console.log({ response });

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
          others: "",
          multiServices: [],
          countryCode: "US",
        });

        // Force PhoneInput to remount so its internal state clears
        setPhoneResetKey((prev) => prev + 1);
      } else {
        setFormStatus({
          message: "Failed to create lead. Please try again.",
          type: "error",
        });
      }
    } catch (error) {
      console.log(error);
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

  return (
    <div className="mx-auto w-full max-w-lg h-full">
      <div className="overflow-hidden rounded-lg border-2 border-[#00b8b0] bg-background shadow-lg">
        {/* Header */}
        {/* <div className="bg-gradient-to-r from-[#00b8b0] to-[#0098da] px-6 py-4">
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
        </div> */}

        <div className="bg-gradient-to-r from-[#00b8b0] to-[#0098da] px-6 py-6">
          {/* Company Logo */}
          <div className="mb-3 flex">
            <div className="h-16 w-16 rounded-full bg-white/20 flex items-center justify-center">
              <div className="text-2xl font-bold text-white ">
                <Image
                  src={company?.image || "/images/autoworx-logo.webp"}
                  alt={company?.name || "Company Logo"}
                  width={56}
                  height={56}
                  className="w-14 h-14 rounded-full border-2 border-white object-cover"
                />
              </div>
            </div>
          </div>

          {/* Business Name */}
          <h1 className="text-xl font-bold text-white mb-2">{company?.name}</h1>

          {/* Website */}
          <div className="text-white/90 text-sm mb-1">
            {company?.website && (
              <span className="inline-flex items-center gap-1">
                <Globe className="size-4" />
                {company?.website}
              </span>
            )}
          </div>

          {/* Address */}
          <div className="text-white/90 text-sm mb-1">
            {company?.address && (
              <span className="inline-flex items-center gap-1">
                <MapPin className="size-4" />
                {company?.address}, {company?.city}, {company?.state}
              </span>
            )}
          </div>

          {/* Phone */}
          <div className="text-white/90 text-sm mb-3">
            {company?.phone && (
              <span className="inline-flex items-center gap-1">
                <Phone className="size-4" />
                {company?.phone}
              </span>
            )}
          </div>

          {/* Form Title */}

          <p className="mt-1 text-center font-semibold text-white text-opacity-90">
            Submit your vehicle information to request service
          </p>
        </div>
        {/* Form Content */}
        <div className="p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label
                htmlFor="name"
                className="block text-sm font-medium text-gray-700"
              >
                Full Name<span className="text-red-500">*</span>
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
              {fieldErrors.name && (
                <p className="text-sm text-red-600">{fieldErrors.name}</p>
              )}
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
              <PhoneInput
                key={phoneResetKey}
                label="Phone Number"
                // value={formData.phone}
                onChange={(num, code, isoCode) =>
                  handlePhoneChange(num, code, isoCode)
                }
                required
                error={fieldErrors.phone}
              />
            </div>{" "}
            <div className="space-y-2">
              {formData.token ? (
                <ServiceSelectAndAddPublic
                  value={formData.multiServices}
                  onChange={handleServiceChange}
                  token={formData.token}
                  companyId={company?.companyId}
                />
              ) : (
                <div className="w-full rounded-sm border border-slate-400 bg-background px-2 py-0.5 leading-6 outline-none text-gray-400">
                  Loading services...
                </div>
              )}
            </div>
            {/* Vehicle Information Section */}
            <div className="border-t border-gray-200 pb-1 pt-2">
              <h3 className="text-md font-medium text-gray-700">
                Vehicle Information
              </h3>
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
              <Selector
                name="vehicle_year"
                label="Year"
                required
                placeholder="Select year"
                options={years?.data}
                value={formData.vehicle_year || ""}
                onChange={(value) => {
                  setFormData((prev) => ({ ...prev, vehicle_year: value }));
                  clearFieldError("vehicle_year");
                }}
                isSearch={true}
                isClear={true}
                disabled={formData.others !== ""}
                error={fieldErrors.vehicle_year}
                // error={isYearFetchError ? "Failed to fetch years" : undefined}
              />
              <Selector
                name="vehicle_make"
                label="Make"
                required
                placeholder="Select make"
                options={vehicleOptions || []}
                value={formData.vehicle_make || ""}
                onChange={(value) => {
                  setFormData((prev) => ({ ...prev, vehicle_make: value }));
                  clearFieldError("vehicle_make");
                }}
                isSearch={true}
                isClear={true}
                disabled={formData.others !== ""}
                error={fieldErrors.vehicle_make}
                // error={isMakeFetchError ? "Failed to fetch Makes" : undefined}
              />

              <Selector
                name="vehicle_model"
                label="Model"
                required
                placeholder="Select model"
                options={vehicleModelOptions || []}
                // rootClassName="w-1/3"
                value={formData.vehicle_model || ""}
                onChange={(value) => {
                  setFormData((prev) => ({ ...prev, vehicle_model: value }));
                  clearFieldError("vehicle_model");
                }}
                isSearch={true}
                isClear={true}
                disabled={formData.others !== ""}
                error={fieldErrors.vehicle_model}
                // error={
                //   isModelsFetchError ? "Failed to fetch Models" : undefined
                // }
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
                value={formData.others}
                onChange={handleChange}
                disabled={
                  formData.vehicle_year !== "" ||
                  formData.vehicle_make !== "" ||
                  formData.vehicle_model !== ""
                }
                className="w-full rounded-md border-2 border-gray-300 px-4 py-2 placeholder:text-gray-500 focus:border-[#00b8b0] focus:outline-none focus:ring-2 focus:ring-[#00b8b0] disabled:bg-gray-100 disabled:cursor-not-allowed"
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
              className="w-full rounded-md bg-gradient-to-r from-[#00b8b0] to-[#0098da] px-4 py-2 font-medium text-white transition-colors duration-200 hover:bg-[#00b8b0] focus:outline-none focus:ring-2 focus:ring-[#00b8b0] focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={
                isSubmitting ||
                !consent ||
                !!fieldErrors.phone ||
                !formData.name.trim() ||
                (!formData.others &&
                  (!formData.vehicle_year ||
                    !formData.vehicle_make ||
                    !formData.vehicle_model))
              }
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
              className="h-4 w-4 cursor-pointer rounded border-gray-300 text-[#00b8b0] focus:ring-[#00b8b0]"
            />
            <label htmlFor="consent" className="text-white text-opacity-90">
              I agree to receive recurring text messages, emails, and calls from{" "}
              {legalBusinessName} regarding my inquiry and related services.
              Message frequency varies. Message and data rates may apply. Reply
              STOP to opt out, HELP for help. View our{" "}
              <TermsAndPolicyModal type="terms" token={formData.token}>
                <button
                  type="button"
                  className="underline hover:text-white transition-colors cursor-pointer"
                >
                  Terms of Service
                </button>
              </TermsAndPolicyModal>{" "}
              and{" "}
              <TermsAndPolicyModal type="policy" token={formData.token}>
                <button
                  type="button"
                  className="underline hover:text-white transition-colors cursor-pointer"
                >
                  Privacy Policy
                </button>
              </TermsAndPolicyModal>
            </label>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ZapForm;
