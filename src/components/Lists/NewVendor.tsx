"use client";

import { newVendor } from "@/actions/vendor/newVendor";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/Dialog";
import FormError from "@/components/FormError";
import { successToast } from "@/lib/toast";
import { useFormErrorStore } from "@/stores/form-error";
import { useListsStore } from "@/stores/lists";
import { Vendor } from "@prisma/client";
import type { JSX } from "react";
import { useRef, useState } from "react";
import PhoneInput from "../PhoneInput";
import { SlimInput } from "../SlimInput";
import { SlimTextarea } from "../SlimTextarea";

export default function NewVendor({
  bgShadow,
  button,
  afterSubmit,
}: {
  bgShadow?: boolean;
  button: JSX.Element;
  afterSubmit?: (vendor: Vendor) => void;
}) {
  const [open, setOpen] = useState(false);
  const [companyName, setCompanyName] = useState("");
  const { showError, clearError } = useFormErrorStore();

  const phoneDataRef = useRef({
    mobile: "",
    country: "",
    countryIsoCode: "",
  });

  const { mobile, country, countryIsoCode } = phoneDataRef.current;
  async function handleSubmit() {
    clearError();

    // Get values directly from DOM using document.querySelector
    const name = document.querySelector<HTMLInputElement>("#contactName")
      ?.value as string;
    const company =
      document.querySelector<HTMLInputElement>("#companyName")?.value;
    // const phone = document.querySelector<HTMLInputElement>("#phone")?.value;
    const phone = country && mobile ? `${country}${mobile}` : mobile || "";
    const email = document.querySelector<HTMLInputElement>("#email")?.value;
    const address = document.querySelector<HTMLInputElement>("#address")?.value;
    const city = document.querySelector<HTMLInputElement>("#city")?.value;
    const state = document.querySelector<HTMLInputElement>("#state")?.value;
    const zip = document.querySelector<HTMLInputElement>("#zip")?.value;
    const website = document.querySelector<HTMLInputElement>("#website")?.value;
    const notes = document.querySelector<HTMLTextAreaElement>("#notes")?.value;

    // Validate required fields
    if (!company?.trim()) {
      showError({
        field: "companyName",
        message: "Company name is required.",
      });
      return;
    }
    if (!phone) {
      showError({
        field: "phone",
        message: "Phone number is required.",
      });
      return;
    }

    // Validate character limit (50 characters)
    if (company && company.trim().length > 50) {
      showError({
        field: "companyName",
        message: "Company name cannot exceed 50 characters.",
      });
      return;
    }

    // Validate that company name is not numeric only
    if (company && /^\d+$/.test(company.trim())) {
      showError({
        field: "companyName",
        message: "Company name cannot be numeric only.",
      });
      return;
    }

    // Validate email format if provided
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      showError({
        field: "email",
        message: "Please enter a valid email address.",
      });
      return;
    }

    if (zip && !/^\d+$/.test(zip)) {
      showError({
        field: "zip",
        message: "Zip code should contain only numbers.",
      });
      return;
    }

    // Validate phone format if provided
    // if (phone && !/^\+?\d*$/.test(phone)) {
    //   showError({
    //     field: "phone",
    //     message: "Please enter a valid phone number (digits only).",
    //   });
    //   return;
    // }

    // Validate website format if provided
    if (
      website &&
      !/^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/.test(
        website,
      )
    ) {
      showError({
        field: "website",
        message: "Please enter a valid website URL.",
      });
      return;
    }

    const res = await newVendor({
      name,
      company,
      phone,
      email,
      address,
      city,
      state,
      zip,
      website,
      notes,
      countryCode: countryIsoCode,
    });

    if (res.type === "success") {
      useListsStore.setState({
        vendors: [...useListsStore.getState().vendors, res.data],
      });

      afterSubmit && afterSubmit(res.data);
      clearError();
      setOpen(false);
      successToast("Vendor added successfully.");
    } else if (res.type === "globalError") {
      if (res.errorSource && res.errorSource.length > 0) {
        showError({
          errorSource: res.errorSource,
          message: res.errorSource[0].message,
        });
      } else {
        showError({
          message: res.message,
        });
      }
    }
  }

  const handleClose = () => {
    clearError(); // Reset form errors when closing
    setCompanyName(""); // Reset company name
    setOpen(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) handleClose();
        setOpen(isOpen);
      }}
    >
      <DialogTrigger asChild>{button}</DialogTrigger>

      <DialogContent
        onOpenAutoFocus={(e) => e.preventDefault()}
        className="max-h-full max-w-xl grid-rows-[auto,1fr,auto]"
      >
        <DialogHeader>
          <DialogTitle className="text-slate-600">Add New Vendor</DialogTitle>
        </DialogHeader>

        <FormError />

        <div className="grid gap-2 overflow-y-auto sm:grid-cols-2 px-1">
          <SlimInput
            id="contactName"
            name="contactName"
            placeholder="Enter contact name"
          />
          <div className="space-y-1">
            <SlimInput
              id="companyName"
              name="companyName"
              placeholder="Enter company"
              required
              value={companyName}
              maxLength={50}
              onChange={(e) => {
                const value = e.target.value;
                setCompanyName(value);

                if (!value.trim()) {
                  showError({
                    field: "companyName",
                    message: "Company name is required.",
                  });
                } else if (value.trim().length > 50) {
                  showError({
                    field: "companyName",
                    message: "Company name cannot exceed 50 characters.",
                  });
                } else if (/^\d+$/.test(value.trim())) {
                  showError({
                    field: "companyName",
                    message: "Company name cannot be numeric only.",
                  });
                } else {
                  clearError();
                }
              }}
            />
            <div className="text-right text-xs text-gray-500">
              {companyName.length}/50
            </div>
          </div>
          {/* <SlimInput
            id="phone"
            name="phone"
            required
            onChange={(e) => {
              const value = e.target.value;
              if (value && !/^\+?\d*$/.test(value)) {
                showError({
                  field: "phone",
                  message: "Please enter a valid phone number (digits only).",
                });
              } else {
                clearError();
              }
            }}
          /> */}

          <PhoneInput
            label="Phone"
            placeholder="1234567890"
            required={true}
            // value={mobile}
            onChange={(phone, code, isoCode) => {
              phoneDataRef.current = {
                mobile: phone,
                country: code,
                countryIsoCode: isoCode || "",
              };
              clearError();
            }}
          />
          <SlimInput
            id="email"
            name="email"
            placeholder="Enter email address"
            required={false}
            onChange={(e) => {
              const value = e.target.value;
              if (value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
                showError({
                  field: "email",
                  message: "Please enter a valid email address.",
                });
              } else {
                clearError();
              }
            }}
          />
          <SlimInput
            id="address"
            name="address"
            required={false}
            placeholder="Street address"
          />
          <SlimInput
            id="city"
            name="city"
            required={false}
            placeholder="City"
          />
          <SlimInput
            id="state"
            name="state"
            required={false}
            placeholder="State"
          />
          <SlimInput
            id="zip"
            name="zip"
            placeholder="Zip Code"
            required={false}
            onChange={(e) => {
              const value = e.target.value;
              if (value && !/^\d+$/.test(value)) {
                showError({
                  field: "zip",
                  message: "Zip code should contain only numbers.",
                });
              } else {
                clearError();
              }
            }}
          />

          <div className="space-y-2 sm:col-span-2">
            <SlimInput
              id="website"
              name="website"
              placeholder="Enter website URL"
              required={false}
              onChange={(e) => {
                const value = e.target.value;
                if (
                  value &&
                  !/^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/.test(
                    value,
                  )
                ) {
                  showError({
                    field: "website",
                    message: "Please enter a valid website URL.",
                  });
                } else {
                  clearError();
                }
              }}
            />
            <SlimTextarea
              id="notes"
              name="notes"
              required={false}
              placeholder="Additional notes"
            />
          </div>
        </div>

        <DialogFooter>
          <DialogClose
            className="
                rounded-xl px-5 py-2.5 text-sm font-medium text-slate-500 
                hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800
                transition-colors border
              "
            onClick={() => {
              clearError();
            }}
          >
            Cancel
          </DialogClose>
          <button
            className="
                rounded-xl px-6 py-2.5 text-sm font-medium text-white
                bg-gradient-to-r from-primary to-[#5a66ee]
                shadow-lg shadow-indigo-500/30
                hover:shadow-xl hover:shadow-indigo-500/40
                hover:-translate-y-0.5 hover:scale-[1.02]
                active:translate-y-0 active:scale-100
                transition-all duration-200
              "
            onClick={handleSubmit}
          >
            Submit
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
