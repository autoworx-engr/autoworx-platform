"use client";
import { updateCompany } from "@/actions/settings/updateCompany";
import PhoneInput from "@/components/PhoneInput";
import Selector from "@/components/Selector";
import { SlimInput } from "@/components/SlimInput";
import { SlimTextarea } from "@/components/SlimTextarea";
import { errorHandler } from "@/error-boundary/globalErrorHandler";
import { queryKeys } from "@/lib/queryKeys";
import { errorToast, successToast } from "@/lib/toast";
import { InfoCircleOutlined } from "@ant-design/icons";
import { Company } from "@prisma/client";
import { useQueryClient } from "@tanstack/react-query";
import { Tooltip } from "antd";
import { Briefcase, Mail, MapPin, Save } from "lucide-react";
import React, { useState, useTransition } from "react";
import ProfilePicture from "./ProfilePicture";
import Timezone from "./Timezone";

type TProps = {
  company: Company | null;
};

export default function BusinessForm({ company }: TProps) {
  const IconComponent = InfoCircleOutlined;
  const queryClient = useQueryClient();
  const [imageSrc, setImageSrc] = useState<File | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null | undefined>(
    company?.image,
  );

  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<{
    [key: string]: string;
  }>({});

  const [isPending, startTransition] = useTransition();

  const initialBusinessSettings = {
    legalBusinessName: company?.name || "",
    businessRegistrationIDNumber: company?.businessId || "",
    businessType: company?.businessType || "",
    businessPhone: company?.phone || "",
    industrySpecialization: company?.industry || "",
    businessEmail: company?.email ?? "",
    businessWebsite: company?.website || "",
    companyAddress: company?.address || "",
    about: company?.about || "",
    teamSize: company?.teamSize || "MEDIUM",
    city: company?.city || "",
    state: company?.state || "",
    zip: company?.zip || "",
    timezone: company?.timezone,
    countryCode: company?.countryCode || "",
  };

  const [businessSettings, setBusinessSettings] = useState(
    initialBusinessSettings,
  );

  // Check if any values have changed from initial state
  const hasChanges = () => {
    // Check if image has changed
    if (imageSrc !== null) return true;

    // Check if any business setting has changed
    return Object.keys(businessSettings).some((key) => {
      return (
        businessSettings[key as keyof typeof businessSettings] !==
        initialBusinessSettings[key as keyof typeof initialBusinessSettings]
      );
    });
  };

  // useEffect(() => {
  //   const fetchImageWithFile = async () => {
  //     if (company?.image) {
  //       try {
  //         const imageFile = await urlToImageFile(
  //           company.image,
  //           "company-image.jpg",
  //         );
  //         setImageSrc(imageFile);
  //       } catch (error) {
  //         console.error("Error fetching image:", error);
  //       }
  //     }
  //   };
  //   fetchImageWithFile();
  // }, [company?.image]);
  // Validation functions
  const validateLegalBusinessName = (value: string) => {
    if (!value.trim()) {
      return "Legal business name is required.";
    }
    return "";
  };

  const validateBusinessRegistrationID = (value: string) => {
    if (!value.trim()) {
      return "Business registration ID number is required.";
    }
    return "";
  };

  const validateBusinessType = (value: string) => {
    if (!value.trim()) {
      return "Business type is required.";
    }
    return "";
  };

  const validateBusinessPhone = (value: string) => {
    if (!value.trim()) {
      return "Business phone number is required.";
    }
    if (!/^\+?\d+$/.test(value)) {
      return "Business phone number must only contain digits (optional + prefix).";
    }
    return "";
  };

  const validateBusinessEmail = (value: string) => {
    if (!value.trim()) {
      return "Business email address is required.";
    }
    if (!/^\S+@\S+\.\S+$/.test(value)) {
      return "Business email address is not valid.";
    }
    return "";
  };

  const validateIndustrySpecialization = (value: string) => {
    // Optional field, so no validation needed
    return "";
  };

  const validateBusinessWebsite = (value: string) => {
    // If the field is empty, return an empty string (no error)
    if (!value.trim()) {
      return "";
    }

    // URL validation regex with more comprehensive check
    const urlPattern =
      /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/;

    if (!urlPattern.test(value)) {
      return "Please enter a valid website URL (e.g., www.example.com or https://example.com)";
    }

    return "";
  };

  const handlePhoneChange = (num: string, code: string, isoCode: string) => {
    const fullPhoneNumber = `${code}${num}`;

    setBusinessSettings((prev) => ({
      ...prev,
      businessPhone: fullPhoneNumber,
      countryCode: isoCode,
    }));

    const error = validateBusinessPhone(fullPhoneNumber);
    setValidationErrors((prev) => ({
      ...prev,
      businessPhone: error,
    }));
  };
  // const validateCity = (value: string) => {
  //   if (!value.trim()) {
  //     return "City is required.";
  //   }
  //   return "";
  // };

  // const validateState = (value: string) => {
  //   if (!value.trim()) {
  //     return "State is required.";
  //   }
  //   return "";
  // };

  // const validateZip = (value: string) => {
  //   if (!value.trim()) {
  //     return "Zip code is required.";
  //   }
  //   // if (!/^\d+$/.test(value)) {
  //   //   return "Zip code must only contain digits.";
  //   // }
  //   // if (value.length != 5) {
  //   //   return "Zip code must be 5 digits long.";
  //   // }
  //   return "";
  // };

  // Live validation handler
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;

    // block non-digit characters entirely
    if (name === "zip") {
      if (value !== "" && !/^\d+$/.test(value)) {
        setValidationErrors((prev) => ({
          ...prev,
          zip: "Zip code must contain digits only.",
        }));
        // Don't update state with invalid characters
        return;
      }
    }

    // Update business settings
    setBusinessSettings((prev) => ({ ...prev, [name]: value }));

    // Perform validation based on input name
    let error = "";
    switch (name) {
      case "legalBusinessName":
        error = validateLegalBusinessName(value);
        break;
      case "businessRegistrationIDNumber":
        error = validateBusinessRegistrationID(value);
        break;
      case "businessType":
        error = validateBusinessType(value);
        break;
      case "businessPhone":
        error = validateBusinessPhone(value);
        break;
      case "businessEmail":
        error = validateBusinessEmail(value);
        break;
      case "industrySpecialization":
        error = validateIndustrySpecialization(value);
        break;
      case "businessWebsite":
        error = validateBusinessWebsite(value);
        break;
    }

    // Update validation errors
    setValidationErrors((prev) => ({
      ...prev,
      [name]: error,
    }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    // Validate all fields before submission
    const newValidationErrors: { [key: string]: string } = {};

    newValidationErrors.legalBusinessName = validateLegalBusinessName(
      businessSettings.legalBusinessName,
    );
    newValidationErrors.businessRegistrationIDNumber =
      validateBusinessRegistrationID(
        businessSettings.businessRegistrationIDNumber,
      );
    newValidationErrors.businessType = validateBusinessType(
      businessSettings.businessType,
    );

    newValidationErrors.teamSize = !businessSettings.teamSize
      ? "Team size is required."
      : "";
    newValidationErrors.businessPhone = validateBusinessPhone(
      businessSettings.businessPhone,
    );
    newValidationErrors.businessEmail = validateBusinessEmail(
      businessSettings.businessEmail,
    );
    newValidationErrors.businessWebsite = validateBusinessWebsite(
      businessSettings.businessWebsite,
    );

    // Set validation errors
    setValidationErrors(newValidationErrors);

    // Check if there are any errors
    const hasErrors = Object.values(newValidationErrors).some(
      (error) => error !== "",
    );
    if (hasErrors) {
      return;
    }

    try {
      let image = null;
      if (imageSrc) {
        // Image upload logic remains the same
        if (company?.image) {
          const response = await fetch(`/api/upload`, {
            method: "DELETE",
            body: JSON.stringify({ filePath: company.image }),
          });
          await response.json();
        }

        const formData = new FormData();
        formData.append("file", imageSrc);
        const uploadRes = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });

        if (!uploadRes.ok) {
          setError("Failed to upload photos");
          setImageSrc(null);
          return;
        }

        const json = await uploadRes.json();
        image = json.data[0];
        setImageUrl(image);
      } else {
        image = company?.image || null;
      }

      const companyData = {
        name: businessSettings.legalBusinessName,
        businessId: businessSettings.businessRegistrationIDNumber,
        businessType: businessSettings.businessType,
        phone: businessSettings.businessPhone,
        email: businessSettings.businessEmail,
        industry: businessSettings.industrySpecialization,
        website: businessSettings.businessWebsite,
        address: businessSettings.companyAddress,
        city: businessSettings.city,
        state: businessSettings.state,
        zip: businessSettings.zip,
        image,
        timezone: businessSettings.timezone,
        countryCode: businessSettings.countryCode,
        about: businessSettings.about,
        teamSize: businessSettings.teamSize,
      };

      const response = await updateCompany(companyData);
      if (response.type === "success") {
        queryClient.invalidateQueries({ queryKey: [queryKeys.company] });
        successToast("Profile updated successfully");
        setError("");
      } else if (response.type === "globalError") {
        errorToast(
          response.errorSource && response.errorSource.length > 0
            ? response.errorSource[0].message
            : response.message,
        );
      }
    } catch (err) {
      const formattedError = errorHandler(err);
      errorToast(
        formattedError.errorSource && formattedError.errorSource.length > 0
          ? formattedError.errorSource[0].message
          : formattedError.message,
      );
    }
  };

  return (
    <>
      {/* Profile Picture remains a separate component */}
      <ProfilePicture
        imageSrc={imageSrc}
        imageUrl={imageUrl}
        setError={setError}
        setImageSrc={setImageSrc}
        isPDFPhoto={true}
      />

      {error && (
        <p className="text-center text-sm text-red-600 mb-4 bg-red-50 p-3 rounded-lg border border-red-200">
          {error}
        </p>
      )}

      <form
        onSubmit={(e) => startTransition(() => handleSubmit(e))}
        className="space-y-8 pb-6"
      >
        <div className="rounded-2xl border border-slate-200/60 bg-gradient-to-br from-white to-slate-50/70 p-4 shadow-sm md:p-6">
          <div className="flex items-center justify-between gap-3 border-b border-slate-200/70 pb-3">
            <div className="flex items-center gap-2">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-300 text-slate-500">
                <Briefcase className="h-4.5 w-4.5" />
              </span>
              <div>
                <h4 className="text-lg font-semibold text-slate-600">
                  Core Business Info
                </h4>
                <p className="text-sm text-slate-500">
                  Primary identity and public profile details.
                </p>
              </div>
            </div>
          </div>
          <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-x-8">
            <SlimInput
              value={businessSettings.legalBusinessName}
              onChange={handleChange}
              label="Legal Business Name"
              name="legalBusinessName"
              placeholder="e.g. Acme Auto Works LLC"
              required
              error={validationErrors.legalBusinessName}
            />
            <SlimInput
              required={true}
              value={businessSettings.businessRegistrationIDNumber}
              onChange={handleChange}
              label="Business Registration ID Number"
              name="businessRegistrationIDNumber"
              placeholder="e.g. 12-3456789"
              error={validationErrors.businessRegistrationIDNumber}
            />
            <SlimTextarea
              required={false}
              value={businessSettings.about}
              // onChange={(e)}
              label="About"
              name="about"
              placeholder="Briefly describe your business and what you offer"
              rows={3}
              className="max-h-18 resize-none overflow-y-auto thin-scrollbar"
              onChange={(e) =>
                setBusinessSettings({
                  ...businessSettings,
                  about: e.target.value,
                })
              }
              tooltipText="This information will be shown on your Collaboration Profile."
            />
            <SlimInput
              required={true}
              value={businessSettings.businessType}
              onChange={handleChange}
              label="Business Type"
              name="businessType"
              placeholder="e.g. Auto Detailing, Body Shop"
              error={validationErrors.businessType}
            />
            <div className="flex flex-col gap-1.5 w-full">
              <label className="flex items-center gap-1 text-base font-medium text-slate-600 dark:text-slate-200 transition-colors duration-300">
                Team Size
                <span className="text-rose-500 font-bold">*</span>
                <Tooltip
                  title="Your team size will be displayed on your Collaboration Profile."
                  placement="top"
                >
                  <IconComponent className="text-gray-400 hover:text-gray-600 cursor-help text-xs" />
                </Tooltip>
              </label>

              <Selector<{ id: string; label: string }>
                label={(item) => item?.label ?? "Select Team Size"}
                items={[
                  { id: "SMALL", label: "Small" },
                  { id: "MEDIUM", label: "Medium" },
                  { id: "LARGE", label: "Large" },
                ]}
                displayList={(item) => <span>{item.label}</span>}
                selectedItem={
                  businessSettings.teamSize
                    ? {
                        id: businessSettings.teamSize,
                        label:
                          businessSettings.teamSize.charAt(0) +
                          businessSettings.teamSize.slice(1).toLowerCase(),
                      }
                    : null
                }
                onSelect={(item) =>
                  setBusinessSettings((prev) => ({
                    ...prev,
                    teamSize: item.id as typeof prev.teamSize,
                  }))
                }
                newButton={null}
                showSearch={false}
                className="max-w-full"
              />

              {validationErrors.teamSize && (
                <div className="animate-in slide-in-from-top-1 fade-in duration-200 mt-1 flex items-center gap-1.5 px-1">
                  <div className="h-1.5 w-1.5 rounded-full bg-rose-500" />
                  <span className="text-xs font-medium text-rose-500">
                    {validationErrors.teamSize}
                  </span>
                </div>
              )}
            </div>
            <SlimInput
              required={false}
              value={businessSettings.industrySpecialization}
              onChange={handleChange}
              label="Industry/Specialization (Optional)"
              name="industrySpecialization"
              placeholder="e.g. Ceramic Coating, Vinyl Wrap"
              error={validationErrors.industrySpecialization}
              tooltipText="This will appear on your Collaboration Profile. Example: Dry Install PPF, Wet Install PPF, Vinyl Wrap, Ceramic Coating."
            />
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200/60 bg-white p-4 shadow-sm md:p-6">
          <div className="flex items-center gap-2 border-b border-slate-200/70 pb-3">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-300 text-slate-500">
              <Mail className="h-4.5 w-4.5" />
            </span>
            <div>
              <h4 className="text-lg font-semibold text-slate-600">
                Contact & Digital Presence
              </h4>
              <p className="text-sm text-slate-500">
                Where customers can reach you.
              </p>
            </div>
          </div>
          <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-x-8">
            <PhoneInput
              label="Business Phone"
              defaultValue={company?.phone || ""}
              defaultIsoCode={company?.countryCode!}
              // value={businessSettings.businessPhone}
              onChange={handlePhoneChange}
              required={true}
              error={validationErrors.businessPhone}
            />
            <SlimInput
              required={true}
              value={businessSettings.businessEmail}
              onChange={handleChange}
              label="Business Email"
              name="businessEmail"
              placeholder="e.g. contact@yourbusiness.com"
              error={validationErrors.businessEmail}
            />
          </div>
          <div className="mt-4 grid grid-cols-1">
            <SlimInput
              required={false}
              value={businessSettings.businessWebsite}
              onChange={handleChange}
              label="Business Website (Optional)"
              name="businessWebsite"
              placeholder="e.g. https://www.yourbusiness.com"
              error={validationErrors.businessWebsite}
            />
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200/60 bg-slate-50/60 p-4 shadow-sm md:p-6">
          <div className="flex items-center gap-2 border-b border-slate-200/70 pb-3">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-300 text-slate-500 bg-white shadow-sm">
              <MapPin className="h-4.5 w-4.5" />
            </span>
            <div>
              <h4 className="text-lg font-semibold text-slate-600">
                Location & Preferences
              </h4>
              <p className="text-sm text-slate-500">
                Set timezone and address details.
              </p>
            </div>
          </div>

          <div className="mt-5 space-y-4">
            <Timezone
              timezone={businessSettings?.timezone}
              setBusinessSettings={setBusinessSettings}
            />

            <div className="grid grid-cols-1">
              <SlimInput
                value={businessSettings.companyAddress}
                onChange={handleChange}
                label="Company Address"
                name="companyAddress"
                placeholder="e.g. 123 Main Street"
                error={validationErrors.companyAddress}
              />
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3 md:gap-x-8">
              <SlimInput
                value={businessSettings.city}
                onChange={handleChange}
                label="City"
                name="city"
                placeholder="e.g. New York"
                error={validationErrors.city}
              />
              <SlimInput
                value={businessSettings.state}
                onChange={handleChange}
                label="State"
                name="state"
                placeholder="e.g. NY"
                error={validationErrors.state}
              />
              <SlimInput
                value={businessSettings.zip}
                onChange={handleChange}
                label="Zip"
                name="zip"
                placeholder="e.g. 10001"
                error={validationErrors.zip}
              />
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex flex-col items-start justify-between gap-3 rounded-2xl border border-slate-200/60 bg-white p-4 shadow-sm sm:flex-row sm:items-center md:p-6">
          <div>
            <h5 className="text-sm font-semibold text-slate-900">
              Ready to save?
            </h5>
            <p className="text-sm text-slate-500">
              Changes apply to your profile immediately.
            </p>
          </div>
          <button
            disabled={isPending || !hasChanges()}
            type="submit"
            className="rounded-xl bg-primary px-6 py-2.5 text-white text-base font-semibold transition duration-150 hover:bg-[#5a64e8] disabled:bg-slate-300 disabled:cursor-not-allowed shadow-lg flex items-center justify-center"
          >
            {isPending ? (
              <>Saving...</>
            ) : (
              <>
                <Save className="h-5 w-5 mr-2" />
                Save Changes
              </>
            )}
          </button>
        </div>
      </form>
    </>
  );
}
