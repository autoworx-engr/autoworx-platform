import { DialogClose, DialogContent, DialogFooter } from "@/components/Dialog";
import FormError from "@/components/FormError";
import { SlimInput } from "@/components/SlimInput";
import Submit from "@/components/Submit";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { updateEmployee } from "@/actions/employee/update";
import SlimSalaryManagement from "@/components/employee/SlimSalaryManagement";
import Password from "@/components/Password";
import PhoneInput from "@/components/PhoneInput";
import { DEFAULT_IMAGE_URL } from "@/lib/consts";
import { successToast } from "@/lib/toast";
import { useEmployeeFilterStore } from "@/stores/employeeFilter";
import { useFormErrorStore } from "@/stores/form-error";
import { EmployeeType, SalaryType, User } from "@prisma/client";
import { useQueryClient } from "@tanstack/react-query";
import { SquarePen, CircleUserRound as UserIcon, X } from "lucide-react";
import moment from "moment";
import { useSession } from "next-auth/react";
import Image from "next/image";
import { EMPLOYEE_LIST_KEY } from "./_hook/useEmployeeQuery";
import SelectEmployeeType from "./SelectEmployeeType";

type TEditClientModalBodyProps = {
  employee: User;
  onClose: () => void;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DIGITS_RE = /^\d+$/;
const NUMBER_RE = /^(\d*\.?\d+|\d+\.?\d*)$/;
export default function EditClientModalBody({
  employee,
  onClose,
}: TEditClientModalBodyProps) {
  const { data: session } = useSession();
  const [employeeTypeOpen, setEmployeeTypeOpen] = useState(false);
  const [salaryTypeOpen, setSalaryTypeOpen] = useState(false);
  const [profilePic, setProfilePic] = useState<string | null>(
    employee.image !== DEFAULT_IMAGE_URL ? employee.image : null,
  );
  const [newProfilePic, setNewProfilePic] = useState<File | null>(null);
  const [openChangePassword, setOpenChangePassword] = useState(false);
  const { showError, clearError } = useFormErrorStore();
  // Controlled zip state — blocks non-digit input
  const [zip, setZip] = useState(employee.zip ?? "");

  const phoneDataRef = useRef({
    phoneNumber: "",
    countryCode: "",
    isoCode: "",
  });
  const {
    dateRange,
    search,
    type: employeeType,
    currentPage,
    pageSize,
  } = useEmployeeFilterStore();
  const queryClient = useQueryClient();

  useEffect(() => {
    setProfilePic(employee.image !== DEFAULT_IMAGE_URL ? employee.image : null);
    // Sync zip if employee prop changes (e.g. modal reused for different employee)
    setZip(employee.zip ?? "");
  }, [employee.image, employee.zip]);

  useEffect(() => {
    if (newProfilePic) {
      const objectUrl = URL.createObjectURL(newProfilePic);
      setProfilePic(objectUrl);

      return () => URL.revokeObjectURL(objectUrl);
    }
  }, [newProfilePic]);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        setNewProfilePic(file);
      }
    },
    [],
  );
  const handleSubmit = useCallback(
    async (data: FormData) => {
      const { phoneNumber, countryCode, isoCode } = phoneDataRef.current;
      const fullPhone = `${countryCode}${phoneNumber}`;
      // Inject controlled zip into FormData since the input is controlled
      data.set("zip", zip);
      data.set("mobileNumber", fullPhone);
      let photo;
      const firstName = data.get("firstName") as string;
      const lastName = data.get("lastName") as string;
      const email = data.get("email") as string;
      const mobileNumber = data.get("mobileNumber") as string;
      const address = data.get("address") as string;
      const city = data.get("city") as string;
      const state = data.get("state") as string;
      // const zip = data.get("zip") as string;
      const commission = data.get("commission") as string;
      const date = data.get("date") as string;
      const type = data.get("type") as string;
      const salaryType = data.get("salaryType") as string;
      const salaryAmount = data.get("salaryAmount") as string;
      const changePassword = data.get("changePassword") as string;
      const previousProfilePic =
        employee.image !== DEFAULT_IMAGE_URL ? employee.image : null;

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
      if (!EMAIL_RE.test(email)) {
        showError({
          field: "email",
          message: "Please enter a valid email address.",
        });
        return;
      }
      // Validate zip — digits only
      if (zip && !DIGITS_RE.test(zip)) {
        showError({
          field: "zip",
          message: "Zip code must contain digits only.",
        });
        return;
      }

      if (commission && !NUMBER_RE.test(commission)) {
        showError({
          field: "commission",
          message: "Commission must be a valid number.",
        });
        return;
      }

      if (salaryAmount && !NUMBER_RE.test(salaryAmount)) {
        showError({
          field: "salaryAmount",
          message: "Salary amount must be a valid number.",
        });
        return;
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

        // Delete previous photo only after the new one is uploaded successfully.
        if (previousProfilePic) {
          await fetch("/api/upload", {
            method: "DELETE",
            body: JSON.stringify({ filePath: previousProfilePic }),
          });
        }
      }

      const res = await updateEmployee({
        id: employee?.id,
        firstName,
        lastName,
        email,
        mobileNumber,
        countryCode: isoCode,
        address,
        changePassword,
        city,
        state,
        zip,
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
        //employees 1 50 Admin  null null
        queryClient.invalidateQueries({
          queryKey: [
            EMPLOYEE_LIST_KEY,
            currentPage,
            pageSize,
            employeeType,
            search,
            dateRange[0],
            dateRange[1],
          ],
        });
        successToast("Employee updated successfully");
      }
    },
    [
      currentPage,
      dateRange,
      employee?.id,
      employee.image,
      employeeType,
      newProfilePic,
      onClose,
      pageSize,
      queryClient,
      search,
      showError,
      zip,
    ],
  );

  const isAdminOrManager = useMemo(
    () =>
      session?.user?.employeeType === "Admin" ||
      session?.user?.employeeType === "Manager",
    [session?.user?.employeeType],
  );
  return (
    <DialogContent
      className="max-h-full max-w-2xl grid-rows-[auto,1fr,auto]"
      onOpenAutoFocus={(e) => e.preventDefault()}
      form
    >
      <div className="mt-8 flex items-center justify-between px-2 md:px-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-600 dark:text-slate-100">
            Edit Employee
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Update details for the team member
          </p>
        </div>

        {profilePic ? (
          <div className="relative group">
            <div className="relative h-16 w-16 rounded-full overflow-hidden ring-4 ring-white dark:ring-slate-800 shadow-md transition-transform group-hover:scale-105">
              <Image
                src={profilePic}
                width={64}
                height={64}
                alt="profile"
                className="h-full w-full object-cover"
                unoptimized={newProfilePic !== null}
                crossOrigin="anonymous"
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
              onChange={handleFileChange}
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
              onChange={handleFileChange}
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
          <SlimInput name="lastName" defaultValue={employee.lastName!} />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
              } else if (!EMAIL_RE.test(value)) {
                showError({
                  field: "email",
                  message: "Please enter a valid email address.",
                });
              } else {
                clearError();
              }
            }}
          />

          <PhoneInput
            label="Mobile"
            placeholder="1234567890"
            required={true}
            defaultValue={employee.phone!}
            // value={phoneNumber}
            defaultIsoCode={employee.countryCode!}
            onChange={(phone, code, iso) => {
              phoneDataRef.current = {
                phoneNumber: phone,
                countryCode: code,
                isoCode: iso || "",
              };
              clearError();
            }}
          />
        </div>
        {isAdminOrManager && !openChangePassword && (
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => setOpenChangePassword(true)}
              className="text-sm font-medium text-primary hover:text-[#5a66ee] hover:underline transition-colors"
            >
              Change password
            </button>
          </div>
        )}

        {isAdminOrManager && openChangePassword && (
          <div className="mb-1 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between mb-2">
              <label
                htmlFor="password"
                className="text-sm font-medium text-slate-700 dark:text-slate-300"
              >
                New Password
              </label>
              <button
                type="button"
                onClick={() => setOpenChangePassword(false)}
                className="text-slate-400 hover:text-red-500 transition-colors"
              >
                <X size={16} />
              </button>
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
        <div className="grid grid-cols-3 gap-3">
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
            required={false}
            value={zip}
            onChange={(e) => {
              const value = e.target.value;
              if (value === "" || DIGITS_RE.test(value)) {
                setZip(value);
                clearError();
              } else {
                showError({
                  field: "zip",
                  message: "Zip code must contain digits only.",
                });
              }
            }}
          />
        </div>
        <div className="flex items-center justify-between">
          <SlimInput
            rootClassName="flex-1"
            name="commission"
            defaultValue={Number(employee.commission!)}
            required={false}
            onChange={(e) => {
              const value = e.target.value;
              if (value && !NUMBER_RE.test(value)) {
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
            key={`employee-type-${employee.id}`}
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
            defaultValue={moment.utc(employee.joinDate).format("YYYY-MM-DD")}
          />
        </div>

        <SlimSalaryManagement
          userId={employee.id}
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
        >
          Cancel
        </DialogClose>
        <Submit
          className="
                rounded-xl px-6 py-2.5 text-sm font-medium text-white
                bg-gradient-to-r from-primary to-[#5a66ee]
                shadow-lg shadow-indigo-500/30
                hover:shadow-xl hover:shadow-indigo-500/40
                hover:-translate-y-0.5 hover:scale-[1.02]
                active:translate-y-0 active:scale-100
                transition-all duration-200
              "
          formAction={handleSubmit}
        >
          Update Employee
        </Submit>
      </DialogFooter>
    </DialogContent>
  );
}
