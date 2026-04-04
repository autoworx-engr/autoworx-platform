"use client";

import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogTrigger,
} from "@/components/Dialog";
import FormError from "@/components/FormError";
import { SlimInput } from "@/components/SlimInput";
import React, { useState, useRef } from "react";
import SelectEmployeeType from "@/app/(dashboard)/dashboard/employee/SelectEmployeeType";
import { useServerGet } from "@/hooks/useServerGet";
import { getCompany } from "@/actions/settings/getCompany";
import { useFormErrorStore } from "@/stores/form-error";
import { addEmployee } from "@/actions/employee/add";
import { EmployeeType, User, SalaryType } from "@prisma/client";
import { errorToast } from "@/lib/toast";
import Password from "@/components/Password";
import SlimSalaryInput from "@/components/employee/SlimSalaryInput";
import { CircleUserRound as UserIcon } from "lucide-react";
import PhoneInput from "../PhoneInput";
import { cn } from "@/lib/cn";

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
  // const [mobile, setMobile] = useState("+1");
  // const [country, setCountry] = useState('');
  // const [countryIsoCode, setCountryIsoCode] = useState('');

  const phoneDataRef = useRef({
    mobile: "",
    country: "",
    countryIsoCode: ""
  });
  const [salaryData, setSalaryData] = useState<{
    salaryType: SalaryType;
    salaryAmount: number;
  } | null>(null);

  const { data: companyName } = useServerGet(getCompany);
  const { showError, clearError } = useFormErrorStore();
  const { mobile, country, countryIsoCode } = phoneDataRef.current;
  async function handleSubmit() {
    clearError();
    let photo;

    // Get values directly from DOM
    const firstName =
      document.querySelector<HTMLInputElement>("[name='firstName']")?.value;
    const lastName =
      document.querySelector<HTMLInputElement>("[name='lastName']")?.value;
    const email =
      document.querySelector<HTMLInputElement>("[name='email']")?.value;
    // const mobileNumber = document.querySelector<HTMLInputElement>(
    //   "[name='mobileNumber']"
    // )?.value;

    const mobileNumber = country && mobile ? `${country}${mobile}` : mobile || ""
    const address =
      document.querySelector<HTMLInputElement>("[name='address']")?.value;
    const city =
      document.querySelector<HTMLInputElement>("[name='city']")?.value;
    const state =
      document.querySelector<HTMLInputElement>("[name='state']")?.value;
    const zip = document.querySelector<HTMLInputElement>("[name='zip']")?.value;
    const commission = document.querySelector<HTMLInputElement>(
      "[name='commission']"
    )?.value;
    const date =
      document.querySelector<HTMLInputElement>("[name='date']")?.value;
    const type =
      document.querySelector<HTMLInputElement>("[name='type']")?.value;
    // const startDate =
    //   document.querySelector<HTMLInputElement>("[name='startDate']")?.value;
    const salaryType = document.querySelector<HTMLInputElement>(
      "[name='salaryType']"
    )?.value;
    const salary =
      document.querySelector<HTMLInputElement>("[name='salary']")?.value;

    const password =
      document.querySelector<HTMLInputElement>("[name='password']")?.value;
    const confirmPassword = document.querySelector<HTMLInputElement>(
      "[name='confirmPassword']"
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

    // Validate mobile number format
    // if (!mobileNumber?.trim() || !/^\+?\d*$/.test(mobileNumber.trim())) {
    //   showError({
    //     field: "mobileNumber",
    //     message: "Please enter a valid mobile number (digits only).",
    //   });
    //   return;
    // }


    if (!mobile || mobile.length < 10) {
      showError({
        field: "mobile",
        message: "Please enter a valid phone number (at least 10 digits).",
      })
      return
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
      // showError({
      //   field: "zip",
      //   message: "Zip code should contain only numbers.",
      // });
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
        companyName: companyName?.name,
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
        // res.errorSource && res.errorSource.length > 0
        //   ? errorToast(res.errorSource[0].message)
        //   : errorToast(res.message);
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
    <div className="">
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
            <button className="
                flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-white
                bg-gradient-to-r from-[#6571FF] to-[#5a66ee]
                shadow-[0_4px_14px_0_rgba(101,113,255,0.39)]
                hover:shadow-[0_6px_20px_rgba(101,113,255,0.23)]
                hover:-translate-y-0.5
                active:translate-y-0 active:scale-100
                transition-all duration-300 ease-in-out
            ">
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
              <p className="text-sm text-slate-500 mt-1">Enter details for the new team member</p>
            </div>

            {profilePic ? (
              <div className="relative group">
                <img
                  src={URL.createObjectURL(profilePic)}
                  alt="profile"
                  className="h-16 w-16 cursor-pointer rounded-full object-cover ring-4 ring-white dark:ring-slate-800 shadow-md transition-transform group-hover:scale-105"
                  onClick={() => {
                    setProfilePic(null);
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
                    hover:border-[#6571FF] hover:bg-indigo-50/50 dark:hover:bg-indigo-900/20
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
                  <span className="text-sm font-semibold text-slate-600 dark:text-slate-300 group-hover:text-[#6571FF] transition-colors">Upload Photo</span>
                </div>
                <div className="p-1 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-400 group-hover:text-[#6571FF] group-hover:bg-white transition-colors">
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
                required={false}
                // value={mobile}
                onChange={(phone, code, isoCode) => {
                  phoneDataRef.current = {
                    mobile: phone,
                    country: code,
                    countryIsoCode: isoCode || ""
                  };
                  clearError()
                }}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="mb-1">
                <label htmlFor="password" className={cn(
                  "flex items-center gap-1 text-base font-medium text-slate-700 dark:text-slate-200 transition-colors duration-300",
                )}>
                  Password <span className="text-[#E9405F]">*</span>
                </label>
                <Password
                  name="password"
                  placeholder="Enter password"
                  required={true}
                  className="w-full rounded-sm border border-slate-400 bg-background px-2 py-0.5 leading-6 outline-none"
                />
              </div>
              <div className="mb-1">
                <label
                  htmlFor="confirmPassword"
                  className={cn(
                    "flex items-center gap-1 text-base font-medium text-slate-700 dark:text-slate-200 transition-colors duration-300",
                  )}
                >
                  Confirm Password <span className="text-[#E9405F]">*</span>
                </label>
                <Password
                  name="confirmPassword"
                  placeholder="Enter confirm password"
                  required={true}
                  className="w-full rounded-sm border border-slate-400 bg-background px-2 py-0.5 leading-6 outline-none"
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
                  // value && !/^\d*$/.test(value);
                  // (value === "" || /^\d+$/.test(value
                  // if (value === "" || /^\d+$/.test(value)) {
                  //   showError({
                  //     field: "zip",
                  //     message: "Zip code should contain only numbers.",
                  //   });
                  // } else {
                  //   clearError();
                  // }
                }}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <SlimInput name="companyName" placeholder="Enter company name" defaultValue={companyName?.name} />
              <SlimInput
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
              <SlimInput
                name="date"
                label="Date joined"
                rootClassName="grow"
                type="date"
                required={false}
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
              className="
                rounded-xl mt-2 sm:mt-0 px-5 py-2.5 text-sm font-medium text-slate-500 
                hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800
                transition-colors border
              "
              onClick={() => {
                clearError();
                handleClose();
              }}
            >
              Cancel
            </DialogClose>
            <button
              className="
                rounded-xl px-6 py-2.5 text-sm font-medium text-white
                bg-gradient-to-r from-[#6571FF] to-[#5a66ee]
                shadow-lg shadow-indigo-500/30
                hover:shadow-xl hover:shadow-indigo-500/40
                hover:-translate-y-0.5 hover:scale-[1.02]
                active:translate-y-0 active:scale-100
                transition-all duration-200
              "
              onClick={handleSubmit}
            >
              Save Employee
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
