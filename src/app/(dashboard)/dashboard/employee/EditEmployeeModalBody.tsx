"use client";

import { DialogClose, DialogContent, DialogFooter } from "@/components/Dialog";
import FormError from "@/components/FormError";
import { SlimInput } from "@/components/SlimInput";
import Submit from "@/components/Submit";
import { useEffect, useState } from "react";

import { updateEmployee } from "@/actions/employee/update";
import { getCompany } from "@/actions/settings/getCompany";
import SlimSalaryManagement from "@/components/employee/SlimSalaryManagement";
import Password from "@/components/Password";
import { useServerGet } from "@/hooks/useServerGet";
import { DEFAULT_IMAGE_URL } from "@/lib/consts";
import { successToast } from "@/lib/toast";
import { useFormErrorStore } from "@/stores/form-error";
import { EmployeeType, SalaryType, User } from "@prisma/client";
import { CircleUserRound, SquarePen, X } from "lucide-react";
import moment from "moment";
import { useSession } from "next-auth/react";
import Image from "next/image";
import SelectEmployeeType from "./SelectEmployeeType";

type TEditClientModalBodyProps = {
  employee: User;
  onClose: () => void;
};

export default function EditClientModalBody({
  employee,
  onClose,
}: TEditClientModalBodyProps) {
  const { data: session } = useSession();
  const [employeeTypeOpen, setEmployeeTypeOpen] = useState(false);
  const [salaryTypeOpen, setSalaryTypeOpen] = useState(false);
  const [profilePic, setProfilePic] = useState<string | null>(
    employee.image !== DEFAULT_IMAGE_URL ? employee.image : null
  );
  const [newProfilePic, setNewProfilePic] = useState<File | null>(null);
  const { data: companyName } = useServerGet(getCompany);
  const [openChangePassword, setOpenChangePassword] = useState(false);
  const { showError, clearError } = useFormErrorStore();

  useEffect(() => {
    setProfilePic(employee.image !== DEFAULT_IMAGE_URL ? employee.image : null);
  }, [employee.image]);

  useEffect(() => {
    if (newProfilePic) {
      const objectUrl = URL.createObjectURL(newProfilePic);
      setProfilePic(objectUrl);

      return () => URL.revokeObjectURL(objectUrl);
    }
  }, [newProfilePic]);

  async function handleSubmit(data: FormData) {
    let photo;
    const firstName = data.get("firstName") as string;
    const lastName = data.get("lastName") as string;
    const email = data.get("email") as string;
    const mobileNumber = data.get("mobileNumber") as string;
    const address = data.get("address") as string;
    const city = data.get("city") as string;
    const state = data.get("state") as string;
    const zip = data.get("zip") as string;
    const commission = data.get("commission") as string;
    const date = data.get("date") as string;
    const type = data.get("type") as string;
    const salaryType = data.get("salaryType") as string;
    const salaryAmount = data.get("salaryAmount") as string;
    const changePassword = data.get("changePassword") as string;

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

    if (salaryAmount && !/^(\d*\.?\d+|\d+\.?\d*)$/.test(salaryAmount)) {
      showError({
        field: "salaryAmount",
        message: "Salary amount must be a valid number.",
      });
      return;
    }

    // delete the old photo
    if (newProfilePic && profilePic !== DEFAULT_IMAGE_URL) {
      await fetch("/api/upload", {
        method: "DELETE",
        body: JSON.stringify({ filePath: profilePic }),
      });
    }

    // update photo
    if (newProfilePic) {
      const formData = new FormData();
      formData.append("file", newProfilePic);

      const uploadRes = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!uploadRes.ok) {
        console.error("Failed to upload photos");
        return uploadRes.json();
      }

      const json = await uploadRes.json();
      photo = json.data[0];
    }

    const res = await updateEmployee({
      id: employee?.id,
      firstName,
      lastName,
      email,
      mobileNumber,
      address,
      changePassword,
      city,
      state,
      zip,
      companyName: companyName?.name,
      commission: Number(commission),
      date: new Date(date),
      type: type as EmployeeType,
      salaryType: salaryType as SalaryType,
      salaryAmount: salaryAmount ? Number(salaryAmount) : undefined,
      profilePicture: photo,
    });

    if (res.type === "globalError") {
      showError({
        field: "all",
        message:
          res.errorSource && res.errorSource.length > 0
            ? res.errorSource[0].message
            : res.message,
      });
      return;
    } else if (res.type === "success") {
      setNewProfilePic(null);
      onClose();
      successToast("Employee updated successfully");
    }
  }

  const isAdminOrManager =
    session?.user?.employeeType === "Admin" ||
    session?.user?.employeeType === "Manager";
  return (
    <DialogContent
      className="max-h-full max-w-xl grid-rows-[auto,1fr,auto]"
      form
    >
      <div className="mt-8 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Edit Employee</h1>

        {profilePic ? (
          <label className="relative cursor-pointer" htmlFor="profilePicture">
            <div className="relative h-20 w-20 rounded-full border border-slate-400 hover:border-dashed hover:opacity-80 overflow-hidden">
              <Image
                src={profilePic}
                width={80}
                height={80}
                alt="profile"
                className="h-full w-full object-cover"
                unoptimized={newProfilePic !== null}
                crossOrigin="anonymous"
              />
            </div>

            <span className="absolute bottom-0 left-1 text-lg p-1 rounded-full bg-[#6571FF]">
              <SquarePen className="w-3 h-3 cursor-pointer text-white " />
            </span>

            <input
              type="file"
              name="profilePicture"
              id="profilePicture"
              hidden
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  setNewProfilePic(file);
                }
              }}
            />
          </label>
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
                  setNewProfilePic(file);
                }
              }}
            />
            <span className="lg:hidden">Upload picture</span>
            <span className="hidden lg:block">
              Upload a profile picture
            </span>{" "}
            <CircleUserRound
              size={48}
              strokeWidth={1.5}
              className="text-gray-400"
            />
          </label>
        )}
      </div>

      <FormError />

      <div className="space-y-2 overflow-y-auto">
        <div className="flex items-center justify-between gap-2">
          <SlimInput
            name="firstName"
            required
            defaultValue={employee.firstName}
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
          <SlimInput
            name="lastName"
            defaultValue={employee.lastName!}
            required={false}
          />
        </div>
        <div className="flex items-center justify-between gap-2">
          <SlimInput
            name="email"
            defaultValue={employee.email}
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
            type="tel"
            name="mobileNumber"
            defaultValue={employee.phone!}
            onChange={(e) => {
              const value = e.target.value;
              if (!/^\+?\d*$/.test(value)) {
                showError({
                  field: "mobileNumber",
                  message: "Please enter a valid mobile number (digits only).",
                });
              } else {
                clearError();
              }
            }}
          />
        </div>
        {isAdminOrManager && !openChangePassword && (
          <span
            onClick={() => setOpenChangePassword(true)}
            className="cursor-pointer text-blue-400 underline"
          >
            Change password
          </span>
        )}

        {isAdminOrManager && openChangePassword && (
          <div className="mb-1">
            <div className="flex items-center gap-x-1">
              <label htmlFor="password" className="mb-1 px-2 font-medium">
                Change Password
              </label>
              <X
                size={20}
                className="flex-shrink-0 cursor-pointer text-red-400"
                onClick={() => setOpenChangePassword(false)}
              />
            </div>
            <Password
              name="changePassword"
              required
              className="w-full rounded-sm border border-slate-400 bg-background px-2 py-0.5 leading-6 outline-none"
            />
          </div>
        )}
        <div className="flex items-center justify-between">
          <SlimInput
            rootClassName="flex-1"
            name="address"
            defaultValue={employee.address!}
            required={false}
          />
        </div>
        <div className="flex items-center justify-between gap-x-2">
          <SlimInput
            name="city"
            defaultValue={employee.city!}
            required={false}
          />
          <SlimInput
            name="state"
            defaultValue={employee.state!}
            required={false}
          />
          <SlimInput
            name="zip"
            defaultValue={employee.zip!}
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
          <SlimInput
            name="companyName"
            defaultValue={employee.companyName!}
            required={false}
          />
          <SlimInput
            name="commission"
            defaultValue={Number(employee.commission!)}
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
            key={`employee-type-${employee.id}-${open}`}
            employeeTypeOpen={employeeTypeOpen}
            setEmployeeTypeOpen={setEmployeeTypeOpen}
            defaultType={employee.employeeType as EmployeeType | undefined}
          />
          <SlimInput
            name="date"
            label="Date joined"
            rootClassName="grow"
            type="date"
            required={false}
            defaultValue={moment
              .utc(employee.joinDate)
              .utc()
              .format("YYYY-MM-DD")}
          />
        </div>

        <SlimSalaryManagement
          userId={employee.id}
          salaryTypeOpen={salaryTypeOpen}
          setSalaryTypeOpen={setSalaryTypeOpen}
        />
      </div>

      <DialogFooter>
        <DialogClose className="mt-1 rounded-lg border-2 border-slate-400 p-1 lg:mt-0">
          Cancel
        </DialogClose>
        <Submit
          className="rounded-lg border bg-[#6571FF] px-5 py-2 text-white"
          formAction={handleSubmit}
        >
          Update
        </Submit>
      </DialogFooter>
    </DialogContent>
  );
}
