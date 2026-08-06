"use client";

import { addEmployee } from "@/actions/employee/add";
import SelectEmployeeType from "@/app/(dashboard)/dashboard/employee/SelectEmployeeType";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogTrigger,
} from "@/components/Dialog";
import SlimSalaryInput from "@/components/employee/SlimSalaryInput";
import FormError from "@/components/FormError";
import Password from "@/components/Password";
import { SlimInput } from "@/components/SlimInput";
import { DatePickerField } from "@/components/ui/DatePickerField";
import { Label } from "@/components/ui/label";
import { errorToast } from "@/lib/toast";
import { useFormErrorStore } from "@/stores/form-error";
import { EmployeeType, SalaryType, User } from "@prisma/client";
import { SquarePen, CircleUserRound as UserIcon } from "lucide-react";
import Image from "next/image";
import React, { useEffect, useRef, useState } from "react";
import PhoneInput from "../PhoneInput";
import { Button } from "../ui/button";

export default function AddNewEmployee({
  onSuccess,
  button,
}: {
  onSuccess?: (employee: User) => void;
  button?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [employeeTypeOpen, setEmployeeTypeOpen] = useState(false);
  const [salaryTypeOpen, setSalaryTypeOpen] = useState(false);
  const [profilePic, setProfilePic] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const phoneDataRef = useRef({
    mobile: "",
    country: "",
    countryIsoCode: "",
  });
  const [salaryData, setSalaryData] = useState<{
    salaryType: SalaryType;
    salaryAmount: number;
  } | null>(null);

  const { showError, clearError } = useFormErrorStore();
  const { mobile, country, countryIsoCode } = phoneDataRef.current;

  useEffect(() => {
    if (!profilePic) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(profilePic);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [profilePic]);
  async function handleSubmit() {
    clearError();
    let photo;

    const firstName =
      document.querySelector<HTMLInputElement>("[name='firstName']")?.value;
    const lastName =
      document.querySelector<HTMLInputElement>("[name='lastName']")?.value;
    const email =
      document.querySelector<HTMLInputElement>("[name='email']")?.value;

    const mobileNumber =
      country && mobile ? `${country}${mobile}` : mobile || "";
    const address =
      document.querySelector<HTMLInputElement>("[name='address']")?.value;
    const city =
      document.querySelector<HTMLInputElement>("[name='city']")?.value;
    const state =
      document.querySelector<HTMLInputElement>("[name='state']")?.value;
    const zip = document.querySelector<HTMLInputElement>("[name='zip']")?.value;
    const commission = document.querySelector<HTMLInputElement>(
      "[name='commission']",
    )?.value;
    const date =
      document.querySelector<HTMLInputElement>("[name='date']")?.value;
    const type =
      document.querySelector<HTMLInputElement>("[name='type']")?.value;
    // const startDate =
    //   document.querySelector<HTMLInputElement>("[name='startDate']")?.value;
    const salaryType = document.querySelector<HTMLInputElement>(
      "[name='salaryType']",
    )?.value;
    const salary =
      document.querySelector<HTMLInputElement>("[name='salary']")?.value;

    const password =
      document.querySelector<HTMLInputElement>("[name='password']")?.value;
    const confirmPassword = document.querySelector<HTMLInputElement>(
      "[name='confirmPassword']",
    )?.value;

    // Validate required fields
    if (!firstName?.trim()) {
      showError({
        field: "firstName",
        message: "First name is required.",
      });
      return;
    }

    if (!email?.trim()) {
      showError({
        field: "email",
        message: "Email is required.",
      });
      return;
    }

    // Validate email format
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      showError({
        field: "email",
        message: "Please enter a valid email address.",
      });
      return;
    }

    if (!mobile || mobile.length < 10) {
      showError({
        field: "mobile",
        message: "Please enter a valid phone number (at least 10 digits).",
      });
      return;
    }
    // Validate passwords
    if (!password?.trim()) {
      showError({
        message: "Password is required.",
      });
      return;
    }

    if (!confirmPassword?.trim()) {
      showError({
        message: "Confirm password is required.",
      });
      return;
    }
    if (password !== confirmPassword) {
      showError({
        message: "Passwords do not match.",
      });
      return;
    }

    // Validate optional fields if provided
    if (zip === "" && !/^\d*$/.test(zip)) {
      return;
    }

    if (commission && !/^(\d*\.?\d+|\d+\.?\d*)$/.test(commission)) {
      showError({
        field: "commission",
        message: "Commission must be a valid number.",
      });
      return;
    }

    // Upload photo
    if (profilePic) {
      const formData = new FormData();
      formData.append("file", profilePic);

      try {
        const res = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });

        if (!res.ok) {
          showError({
            field: "all",
            message: "An error occurred uploading the profile picture.",
          });
          errorToast("An error occurred uploading the profile picture.");
          return;
        }

        const json = await res.json();
        photo = json.data[0];
      } catch (error) {
        showError({
          field: "all",
          message: "An error occurred uploading the profile picture.",
        });
        errorToast("An error occurred uploading the profile picture.");
        return;
      }
    }

    // Add employee
    try {
      const res = await addEmployee({
        firstName,
        lastName,
        email,
        mobileNumber: mobileNumber,
        countryCode: countryIsoCode,
        address,
        city,
        state,
        zip,
        commission: commission ? Number(commission) : undefined,
        date,
        type: type as EmployeeType,
        salaryType: salaryData?.salaryType,
        salaryAmount: salaryData?.salaryAmount,
        profilePicture: photo,
        password,
        confirmPassword,
      });

      if (res.type === "globalError") {
        console.error(res);
        showError(res);

        return;
      } else if (res.type === "success") {
        setOpen(false);
        onSuccess && onSuccess(res.data);
      }
    } catch (error) {
      showError({ field: "all", message: "An unexpected error occurred." });
      errorToast("An unexpected error occurred.");
    }
  }

  const handleClose = () => {
    clearError();
    setProfilePic(null);
    setSalaryData(null);
    setSalaryTypeOpen(false);
    setEmployeeTypeOpen(false);
    setOpen(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen: boolean) => {
        if (!isOpen) handleClose();
        setOpen(isOpen);
      }}
    >
      <DialogTrigger asChild onClick={() => setOpen(true)}>
        {button ? (
          button
        ) : (
          <button
            className="
                flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-white
                bg-gradient-to-r from-primary to-[#5a66ee]
                shadow-[0_4px_14px_0_rgba(101,113,255,0.39)]
                hover:shadow-[0_6px_20px_rgba(101,113,255,0.23)]
                hover:-translate-y-0.5
                active:translate-y-0 active:scale-100
                transition-all duration-300 ease-in-out
            "
          >
            <span>+</span> Add New Employee
          </button>
        )}
      </DialogTrigger>
      <DialogContent
        className="max-h-full max-w-2xl grid-rows-[auto,1fr,auto]"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <div className="mt-8 flex items-center justify-between px-2 md:px-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-600 dark:text-slate-100">
              Add Employee
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Enter details for the new team member
            </p>
          </div>

          {profilePic ? (
            <div className="relative group">
              <div className="relative h-16 w-16 rounded-full overflow-hidden ring-4 ring-white dark:ring-slate-800 shadow-md transition-transform group-hover:scale-105">
                <Image
                  src={previewUrl!}
                  alt="profile"
                  width={64}
                  height={64}
                  unoptimized
                  className="h-full w-full object-cover"
                />
              </div>
              <label
                htmlFor="profilePicture"
                className="absolute bottom-0 right-0 p-1 bg-primary rounded-full shadow-sm cursor-pointer transition-colors"
              >
                <SquarePen className="w-3 h-3 text-white" />
              </label>
              <input
                type="file"
                name="profilePicture"
                id="profilePicture"
                hidden
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) setProfilePic(file);
                }}
              />
            </div>
          ) : (
            <label
              className="
                    group flex cursor-pointer items-center justify-center gap-x-3 
                    rounded-full pl-4 pr-2 py-1.5
                    bg-white dark:bg-slate-800
                    border border-dashed border-slate-300 dark:border-slate-600
                    hover:border-primary hover:bg-indigo-50/50 dark:hover:bg-indigo-900/20
                    transition-all duration-300
                "
              htmlFor="profilePicture"
            >
              <input
                type="file"
                name="profilePicture"
                id="profilePicture"
                hidden
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    setProfilePic(file);
                  }
                }}
              />
              <div className="flex flex-col items-end">
                <span className="text-sm font-semibold text-slate-600 dark:text-slate-300 group-hover:text-primary transition-colors">
                  Upload Photo
                </span>
              </div>
              <div className="p-1 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-400 group-hover:text-primary group-hover:bg-white transition-colors">
                <UserIcon size={32} strokeWidth={2} />
              </div>
            </label>
          )}
        </div>

        <FormError />

        <div className="space-y-4 overflow-y-auto py-2 px-2 md:px-4 thin-scrollbar scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-700 scrollbar-track-transparent">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <SlimInput
              name="firstName"
              placeholder="Enter first name"
              required
              onChange={(e: any) => {
                const value = e.target.value;
                if (!value.trim()) {
                  showError({
                    field: "firstName",
                    message: "First name is required.",
                  });
                } else {
                  clearError();
                }
              }}
            />
            <SlimInput name="lastName" placeholder="Enter last name" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <SlimInput
              name="email"
              placeholder="Enter email address"
              required
              onChange={(e: any) => {
                const value = e.target.value;
                if (!value.trim()) {
                  showError({
                    field: "email",
                    message: "Email is required.",
                  });
                } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
                  showError({
                    field: "email",
                    message: "Please enter a valid email address.",
                  });
                } else {
                  clearError();
                }
              }}
            />
            {/* <SlimInput
                name="mobileNumber"
                type="tel"
                required
                onChange={(e: any) => {
                  const value = e.target.value;
                  if (!/^\+?\d*$/.test(value)) {
                    showError({
                      field: "mobileNumber",
                      message:
                        "Please enter a valid mobile number (digits only).",
                    });
                  } else {
                    clearError();
                  }
                }}
              /> */}

            <PhoneInput
              label="Mobile"
              placeholder="1234567890"
              required
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
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="password" className="text-base">
                Password <span className="text-destructive">*</span>
              </Label>
              <Password
                name="password"
                placeholder="Enter password"
                required={true}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="confirmPassword" className="text-base">
                Confirm Password <span className="text-destructive">*</span>
              </Label>
              <Password
                name="confirmPassword"
                placeholder="Enter confirm password"
                required={true}
              />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <SlimInput
              rootClassName="flex-1"
              name="address"
              placeholder="Enter address"
              required={false}
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <SlimInput name="city" placeholder="city" required={false} />
            <SlimInput name="state" placeholder="state" required={false} />
            <SlimInput
              name="zip"
              placeholder="zip code"
              required={false}
              type="number"
              onChange={(e: any) => {
                const value = e.target.value;
              }}
            />
          </div>

          <div className="flex items-center justify-between">
            <SlimInput
              rootClassName="flex-1"
              name="commission"
              label="Commission %"
              placeholder="commission"
              type="number"
              required={false}
              onChange={(e: any) => {
                const value = e.target.value;
                if (value && !/^(\d*\.?\d+|\d+\.?\d*)$/.test(value)) {
                  showError({
                    field: "commission",
                    message: "Commission must be a valid number.",
                  });
                } else {
                  clearError();
                }
              }}
            />
          </div>

          <div className="grid grid-cols-2 gap-4 items-end">
            <SelectEmployeeType
              required
              employeeTypeOpen={employeeTypeOpen}
              setEmployeeTypeOpen={setEmployeeTypeOpen}
            />
            <DatePickerField
              name="date"
              label="Date joined"
              defaultValue={new Date().toISOString().split("T")[0]}
            />
          </div>

          {/* Salary Management Section */}
          <SlimSalaryInput
            onSalaryChange={(data: any) => setSalaryData(data)}
            salaryTypeOpen={salaryTypeOpen}
            setSalaryTypeOpen={setSalaryTypeOpen}
          />
        </div>

        <DialogFooter className="px-4">
          <DialogClose
            className="mt-2 rounded-md border px-5 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground sm:mt-0"
            onClick={() => {
              clearError();
              handleClose();
            }}
          >
            Cancel
          </DialogClose>
          <Button onClick={handleSubmit}>Save Employee</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
