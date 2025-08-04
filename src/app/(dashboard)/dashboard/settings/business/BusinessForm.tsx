"use client";
import { updateCompany } from "@/actions/settings/updateCompany";
import { SlimInput } from "@/components/SlimInput";
import { errorHandler } from "@/error-boundary/globalErrorHandler";
import { errorToast, successToast } from "@/lib/toast";
import { Company } from "@prisma/client";
import React, { useState, useTransition } from "react";
import ProfilePicture from "./ProfilePicture";
import Timezone from "./Timezone";
import { queryKeys } from "@/lib/queryKeys";
import { useQueryClient } from "@tanstack/react-query";

type TProps = {
  company: Company | null;
};

export default function BusinessForm({ company }: TProps) {
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

  const [businessSettings, setBusinessSettings] = useState({
    legalBusinessName: company?.name || "",
    businessRegistrationIDNumber: company?.businessId || "",
    businessType: company?.businessType || "",
    businessPhone: company?.phone || "",
    industrySpecialization: company?.industry || "",
    businessEmail: company?.email ?? "",
    businessWebsite: company?.website || "",
    companyAddress: company?.address || "",
    city: company?.city || "",
    state: company?.state || "",
    zip: company?.zip || "",
    timezone: company?.timezone,
  });

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
      };

      const response = await updateCompany(company?.id, companyData);
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
      {error && <p className="text-center text-sm text-red-500">{error}</p>}
      <ProfilePicture
        imageSrc={imageSrc}
        imageUrl={imageUrl}
        setError={setError}
        setImageSrc={setImageSrc}
        isPDFPhoto={true}
      />
      <form
        onSubmit={(e) => startTransition(() => handleSubmit(e))}
        className="space-y-4"
      >
        {/* name and registration number */}
        <div className="grid grid-cols-2 gap-x-8">
          <SlimInput
            value={businessSettings.legalBusinessName}
            onChange={handleChange}
            label="Legal Business Name"
            name="legalBusinessName"
            required
            error={validationErrors.legalBusinessName}
          />
          <SlimInput
            required={true}
            value={businessSettings.businessRegistrationIDNumber}
            onChange={handleChange}
            label="Business Registration ID Number"
            name="businessRegistrationIDNumber"
            error={validationErrors.businessRegistrationIDNumber}
          />
        </div>
        {/* businessType and phone number */}
        <div className="grid grid-cols-2 gap-x-8">
          <SlimInput
            required={true}
            value={businessSettings.businessType}
            onChange={handleChange}
            label="Business Type"
            name="businessType"
            error={validationErrors.businessType}
          />
          <SlimInput
            required={true}
            value={businessSettings.businessPhone}
            onChange={handleChange}
            label="Business Phone"
            name="businessPhone"
            error={validationErrors.businessPhone}
          />
        </div>
        {/* industry and email */}
        <div className="grid grid-cols-2 gap-x-8">
          <SlimInput
            required={false}
            value={businessSettings.industrySpecialization}
            onChange={handleChange}
            label="Industry/Specialization"
            name="industrySpecialization"
            error={validationErrors.industrySpecialization}
          />
          <SlimInput
            required={true}
            value={businessSettings.businessEmail}
            onChange={handleChange}
            label="Business Email"
            name="businessEmail"
            error={validationErrors.businessEmail}
          />
        </div>
        <div>
          <Timezone
            timezone={businessSettings?.timezone}
            setBusinessSettings={setBusinessSettings}
          />
        </div>
        <div className="grid grid-cols-1">
          <SlimInput
            required={false}
            value={businessSettings.businessWebsite}
            onChange={handleChange}
            label="Business Website"
            name="businessWebsite"
            error={validationErrors.businessWebsite}
          />
        </div>
        <div className="grid grid-cols-1">
          <SlimInput
            value={businessSettings.companyAddress}
            onChange={handleChange}
            label="Company Address"
            name="companyAddress"
            error={validationErrors.companyAddress}
          />
        </div>
        <div className="grid grid-cols-3 gap-x-8">
          <SlimInput
            value={businessSettings.city}
            onChange={handleChange}
            label="City"
            name="city"
            error={validationErrors.city}
          />
          <SlimInput
            value={businessSettings.state}
            onChange={handleChange}
            label="State"
            name="state"
            error={validationErrors.state}
          />
          <SlimInput
            value={businessSettings.zip}
            onChange={handleChange}
            label="Zip"
            name="zip"
            error={validationErrors.zip}
          />
        </div>

        <div className="text-right">
          <button
            disabled={isPending}
            type="submit"
            className="ml-auto mt-4 rounded-md bg-[#6571FF] px-6 py-1 text-white disabled:bg-gray-400"
          >
            {isPending ? "Saving" : "Save"}
          </button>
        </div>
      </form>
    </>
  );
}
