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
import { RxAvatar } from "react-icons/rx";
import SelectEmployeeType from "@/app/(dashboard)/dashboard/employee/SelectEmployeeType";
import { useServerGet } from "@/hooks/useServerGet";
import { getCompany } from "@/actions/settings/getCompany";
import { useFormErrorStore } from "@/stores/form-error";
import { addEmployee } from "@/actions/employee/add";
import { EmployeeType, User, SalaryType } from "@prisma/client";
import { errorToast } from "@/lib/toast";
import Password from "@/components/Password";
import SlimSalaryInput from "@/components/employee/SlimSalaryInput";

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
  const [salaryData, setSalaryData] = useState<{
    salaryType: SalaryType;
    salaryAmount: number;
  } | null>(null);

  const { data: companyName } = useServerGet(getCompany);
  const { showError, clearError } = useFormErrorStore();

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
    const mobileNumber = document.querySelector<HTMLInputElement>(
      "[name='mobileNumber']"
    )?.value;
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
    // const salaryType = document.querySelector<HTMLInputElement>(
    //   "[name='salaryType']"
    // )?.value;
    // const salary =
    //   document.querySelector<HTMLInputElement>("[name='salary']")?.value;

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
    if (!mobileNumber?.trim() || !/^\+?\d*$/.test(mobileNumber.trim())) {
      showError({
        field: "mobileNumber",
        message: "Please enter a valid mobile number (digits only).",
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
    if (zip && !/^\d*$/.test(zip)) {
      showError({
        field: "zip",
        message: "Zip code should contain only numbers.",
      });
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
        mobileNumber,
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
        onOpenChange={(isOpen) => {
          if (!isOpen) handleClose();
          setOpen(isOpen);
        }}
      >
        <DialogTrigger asChild>
          {button ? (
            button
          ) : (
            <button className="rounded-md bg-[#6571FF] p-2 px-5 text-white">
              + Add New Employee
            </button>
          )}
        </DialogTrigger>
        <DialogContent className="max-h-full max-w-xl grid-rows-[auto,1fr,auto]">
          <div className="mt-8 flex items-center justify-between">
            <h1 className="text-2xl font-bold">Add Employee</h1>

            {profilePic ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={URL.createObjectURL(profilePic)}
                alt="profile"
                className="h-14 w-14 cursor-pointer rounded-full border border-slate-400"
                onClick={() => {
                  setProfilePic(null);
                }}
              />
            ) : (
              <label
                className="flex cursor-pointer items-center justify-center gap-x-2 rounded-full border border-slate-400 pl-2"
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
                <span className="lg:hidden">Upload picture</span>
                <span className="hidden lg:inline">
                  Upload a profile picture
                </span>{" "}
                <RxAvatar size={48} />
              </label>
            )}
          </div>

          <FormError />

          <div className="space-y-2 overflow-y-auto">
            <div className="flex items-center justify-between gap-2">
              <SlimInput
                name="firstName"
                required
                onChange={(e) => {
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
              <SlimInput name="lastName" />
            </div>
            <div className="flex items-center justify-between gap-2">
              <SlimInput
                name="email"
                required
                onChange={(e) => {
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
              <SlimInput
                name="mobileNumber"
                type="tel"
                required
                onChange={(e) => {
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
              />
            </div>
            <div className="flex items-center justify-between gap-2 lg:gap-7">
              <div className="mb-1">
                <label htmlFor="password" className="mb-1 px-2 font-medium">
                  Password <span className="text-[#E9405F]">*</span>
                </label>
                <Password
                  name="password"
                  required={true}
                  className="w-full rounded-sm border border-slate-400 bg-background px-2 py-0.5 leading-6 outline-none"
                />
              </div>
              <div className="mb-1">
                <label
                  htmlFor="confirmPassword"
                  className="mb-1 px-2 font-medium"
                >
                  Confirm Password <span className="text-[#E9405F]">*</span>
                </label>
                <Password
                  name="confirmPassword"
                  required={true}
                  className="w-full rounded-sm border border-slate-400 bg-background px-2 py-0.5 leading-6 outline-none"
                />
              </div>
            </div>
            <div className="flex items-center justify-between">
              <SlimInput
                rootClassName="flex-1"
                name="address"
                required={false}
              />
            </div>
            <div className="flex items-center justify-between gap-x-2">
              <SlimInput name="city" required={false} />
              <SlimInput name="state" required={false} />
              <SlimInput
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
            <div className="flex items-center justify-between gap-2">
              <SlimInput name="companyName" defaultValue={companyName?.name} />
              <SlimInput
                name="commission"
                label="Commission %"
                type="number"
                required={false}
                onChange={(e) => {
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
            <div className="flex items-center justify-between gap-x-4">
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
              onSalaryChange={(data) => setSalaryData(data)}
              salaryTypeOpen={salaryTypeOpen}
              setSalaryTypeOpen={setSalaryTypeOpen}
            />
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
              Add
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
