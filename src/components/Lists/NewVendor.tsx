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
import { useFormErrorStore } from "@/stores/form-error";
import { useListsStore } from "@/stores/lists";
import { Vendor } from "@prisma/client";
import { useState } from "react";
import { SlimInput } from "../SlimInput";
import { SlimTextarea } from "../SlimTextarea";
import { errorToast } from "@/lib/toast";

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
  const { showError, clearError } = useFormErrorStore();

  async function handleSubmit() {
    clearError();

    // Get values directly from DOM using document.querySelector
    const name = document.querySelector<HTMLInputElement>("#contactName")
      ?.value as string;
    const company =
      document.querySelector<HTMLInputElement>("#companyName")?.value;
    const phone = document.querySelector<HTMLInputElement>("#phone")?.value;
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

    // Validate email format if provided
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      showError({
        field: "email",
        message: "Please enter a valid email address.",
      });
      return;
    }

    // Validate phone format if provided
    if (phone && !/^\+?\d*$/.test(phone)) {
      showError({
        field: "phone",
        message: "Please enter a valid phone number (digits only).",
      });
      return;
    }

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
    });

    if (res.type === "success") {
      useListsStore.setState({
        vendors: [...useListsStore.getState().vendors, res.data],
      });

      afterSubmit && afterSubmit(res.data);
      clearError();
      setOpen(false);
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

      <DialogContent className="max-h-full max-w-xl grid-rows-[auto,1fr,auto]">
        <DialogHeader>
          <DialogTitle>Add New Vendor</DialogTitle>
        </DialogHeader>

        <FormError />

        <div className="grid gap-2 overflow-y-auto sm:grid-cols-2">
          <SlimInput id="contactName" name="contactName" />
          <SlimInput
            id="companyName"
            name="companyName"
            required
            onChange={(e) => {
              const value = e.target.value;
              if (!value.trim()) {
                showError({
                  field: "companyName",
                  message: "Company name is required.",
                });
              } else {
                clearError();
              }
            }}
          />
          <SlimInput
            id="phone"
            name="phone"
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
          />
          <SlimInput
            id="email"
            name="email"
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
          <SlimInput id="address" name="address" required={false} />
          <div className="flex flex-col gap-3 lg:flex-row">
            <SlimInput id="city" name="city" required={false} />
            <SlimInput id="state" name="state" required={false} />
            <SlimInput
              id="zip"
              name="zip"
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
          </div>
          <div className="space-y-2 sm:col-span-2">
            <SlimInput
              id="website"
              name="website"
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
            <SlimTextarea id="notes" name="notes" required={false} />
          </div>
        </div>

        <DialogFooter>
          <DialogClose
            className="rounded-lg border-2 border-slate-400 p-2"
            onClick={() => {
              clearError();
            }}
          >
            Cancel
          </DialogClose>
          <button
            className="rounded-lg border bg-[#6571FF] px-5 py-2 text-white"
            onClick={handleSubmit}
          >
            Submit
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
