"use client";

import { editVendor } from "@/actions/vendor/editVendor";
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

type ServerAction =
  | { type: "success"; data: Vendor }
  | { type: "error"; message: string }
  | {
      type: "globalError";
      errorSource?: { message: string }[];
      message?: string;
    };

export default function EditVendor({
  button,
  vendor,
  afterSubmit,
}: {
  button: JSX.Element;
  vendor: Vendor;
  afterSubmit?: (vendor: Vendor) => void;
}) {
  const [open, setOpen] = useState(false);
  const [companyName, setCompanyName] = useState(vendor.companyName || "");
  const { showError, clearError } = useFormErrorStore();
  const phoneDataRef = useRef({
    phoneNumber: "",
    countryCode: "",
    isoCode: "",
  });

  const { phoneNumber, countryCode, isoCode } = phoneDataRef.current;
  async function handleSubmit() {
    clearError();

    // Get values directly from DOM using document.querySelector
    const name = document.querySelector<HTMLInputElement>(
      "[name='contactName']",
    )?.value as string;
    const company = document.querySelector<HTMLInputElement>(
      "[name='companyName']",
    )?.value;
    // const phone =
    //   document.querySelector<HTMLInputElement>("[name='phone']")?.value;
    const phone =
      countryCode && phoneNumber
        ? `${countryCode}${phoneNumber}`
        : phoneNumber || "";
    const email =
      document.querySelector<HTMLInputElement>("[name='email']")?.value;
    const address =
      document.querySelector<HTMLInputElement>("[name='address']")?.value;
    const city =
      document.querySelector<HTMLInputElement>("[name='city']")?.value;
    const state =
      document.querySelector<HTMLInputElement>("[name='state']")?.value;
    const zip = document.querySelector<HTMLInputElement>("[name='zip']")?.value;
    const website =
      document.querySelector<HTMLInputElement>("[name='website']")?.value;
    const notes =
      document.querySelector<HTMLTextAreaElement>("[name='notes']")?.value;

    // Validate required fields
    if (!company?.trim()) {
      showError({
        field: "companyName",
        message: "Company name is required.",
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

    // Validate zip code if provided
    if (zip && !/^\d*$/.test(zip)) {
      showError({
        field: "zip",
        message: "Zip code should contain only numbers.",
      });
      return;
    }

    const res = await editVendor({
      id: vendor.id,
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
      countryCode: isoCode,
    });

    if (res.type === "success") {
      useListsStore.setState({
        vendors: useListsStore
          .getState()
          .vendors.map((v) => (v.id === vendor.id ? res.data : v)),
      });

      afterSubmit && afterSubmit(res.data);
      clearError();
      setOpen(false);
      successToast("Vendor updated successfully.");
    }
    // else if (res.type === "globalError") {
    //   const errorMessage =
    //     res.errorSource && res.errorSource.length > 0
    //       ? res.errorSource[0].message
    //       : res.message || "An unknown error occurred.";

    //   showError({
    //     message: errorMessage,
    //   });
    // }
  }

  const handleClose = () => {
    clearError(); // Reset form errors when closing
    setCompanyName(vendor.companyName || ""); // Reset company name to original value
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
        className="max-h-full max-w-xl grid-rows-[auto,1fr,auto]"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>Edit Vendor</DialogTitle>
        </DialogHeader>

        <FormError />

        <div className="grid gap-2 overflow-y-auto sm:grid-cols-2 px-1">
          <SlimInput
            name="contactName"
            defaultValue={vendor.name ?? ""}
            required={false}
          />
          <div className="space-y-1">
            <SlimInput
              name="companyName"
              value={companyName}
              maxLength={50}
              required
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
            name="phone"
            defaultValue={vendor.phone ?? ""}
            required={false}
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
            defaultValue={vendor.phone!}
            // value={phoneNumber}
            defaultIsoCode={vendor.countryCode!}
            onChange={(phone, code, iso) => {
              phoneDataRef.current = {
                phoneNumber: phone,
                countryCode: code,
                isoCode: iso || "",
              };
              clearError();
            }}
          />
          <SlimInput
            name="email"
            defaultValue={vendor.email ?? ""}
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
            name="address"
            defaultValue={vendor.address ?? ""}
            required={false}
          />
          {/* <div className="flex flex-col gap-3 lg:flex-row"> */}
          <SlimInput
            name="city"
            defaultValue={vendor.city ?? ""}
            required={false}
          />
          <SlimInput
            name="state"
            defaultValue={vendor.state ?? ""}
            required={false}
          />
          <SlimInput
            name="zip"
            defaultValue={vendor.zip ?? ""}
            required={false}
            onChange={(e) => {
              const value = e.target.value;
              if (value && !/^\d*$/.test(value)) {
                showError({
                  field: "zip",
                  message: "Zip code should contain only numbers.",
                });
              } else {
                clearError();
              }
            }}
          />
          {/* </div> */}

          <div className="space-y-2 sm:col-span-2">
            <SlimInput
              name="website"
              defaultValue={vendor.website ?? ""}
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
              name="notes"
              defaultValue={vendor.notes ?? ""}
              placeholder="Add notes"
              required={false}
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
            Save Changes
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
