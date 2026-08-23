"use client";
import { addFleet } from "@/actions/fleet/add";
import { editFleet } from "@/actions/fleet/edit";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogTrigger,
} from "@/components/Dialog";
import FormError from "@/components/FormError";
import { SelectClientTags } from "@/components/Lists/SelectClientTags";
import PhoneInput from "@/components/PhoneInput";
import { SlimInput } from "@/components/SlimInput";
import { successToast } from "@/lib/toast";
import { useFormErrorStore } from "@/stores/form-error";
import { isValidEmail, normalizeEmail } from "@/utils/email";
import { useListsStore } from "@/stores/lists";
import { Client, Fleet, Tag } from "@prisma/client";
import { CircleUserRound, PencilLineIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import type { JSX } from "react";
import { useEffect, useState, useTransition } from "react";
import { RotatingLines } from "react-loader-spinner";
import SelectComponent from "./Select";

export default function NewFleet({
  fleet,
  isEdit = false,
  buttonElement,
  setClient,
}: {
  fleet?: Client & { fleet: Fleet | null; tag: Tag | null };
  isEdit?: boolean;
  buttonElement?: JSX.Element;
  setClient?: React.Dispatch<React.SetStateAction<Client | null>>;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [preferredPaymentTerm, setPreferredPaymentTerm] = useState<
    string | null
  >(null);
  const [tagOpenDropdown, setTagOpenDropdown] = useState(false);
  const [tag, setTag] = useState<Tag | undefined>(fleet?.tag ?? undefined);
  const [profilePic, setProfilePic] = useState<File | null | string>(
    fleet ? fleet.photo : null,
  );

  const { showError, clearError } = useFormErrorStore();
  const [fleetName, setFleetName] = useState(fleet?.fleet?.fleetName ?? "");
  const [contactName, setContactName] = useState(
    fleet?.fleet?.contactName ?? "",
  );
  const [email, setEmail] = useState(normalizeEmail(fleet?.email ?? ""));
  const [address, setAddress] = useState(fleet?.address ?? "");
  const [city, setCity] = useState(fleet?.city ?? "");
  const [state, setState] = useState(fleet?.state ?? "");
  const [mobile, setMobile] = useState("+1");
  const [countryCode, setCountryCode] = useState("");
  const [countryIsoCode, setCountryIsoCode] = useState("");
  const [zip, setZip] = useState(fleet?.zip ?? "");

  useEffect(() => {
    if (isEdit && fleet && open) {
      setFleetName(fleet?.fleet?.fleetName ?? "");
      setContactName(fleet?.fleet?.contactName ?? "");
      setEmail(normalizeEmail(fleet?.email ?? ""));
      setAddress(fleet?.address ?? "");
      setCity(fleet?.city ?? "");
      setState(fleet?.state ?? "");
      setMobile(fleet?.mobile!);
      setProfilePic(fleet ? fleet.photo : null);
      setPreferredPaymentTerm(
        fleet ? fleet?.fleet!.preferredPaymentTerm : null,
      );
      setZip(fleet?.zip ?? "");
      setTag(fleet?.tag ?? undefined);
    }
  }, [isEdit, fleet, open]);

  async function handleSubmit() {
    clearError();
    let photo;
    const phone =
      countryCode && mobile ? `${countryCode}${mobile}` : mobile || "";

    if (!fleetName?.trim()) {
      showError({
        field: "fleetName",
        message: "Fleet name is required.",
      });
      return;
    }
    if (!contactName?.trim()) {
      showError({
        field: "contactName",
        message: "contact name is required.",
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
    if (!isValidEmail(email)) {
      showError({
        field: "email",
        message: "Please enter a valid email address.",
      });
      return;
    }
    if (!phone?.trim()) {
      showError({
        field: "mobile",
        message: "Mobile is required.",
      });
      return;
    }

    // Validate zip code — digits only
    if (zip && !/^\d+$/.test(zip)) {
      showError({
        field: "zip",
        message: "Zip code must contain digits only.",
      });
      return;
    }

    // Upload new file if exists
    if (profilePic && typeof profilePic !== "string") {
      const formData = new FormData();
      formData.append("file", profilePic);

      const uploadRes = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!uploadRes.ok) {
        console.error("Failed to upload photos");
        return;
      }

      const json = await uploadRes.json();
      photo = json.data[0]; // ✅ overwrite with uploaded photo path
    }

    let res;
    if (isEdit == true && fleet) {
      res = await editFleet({
        fleetName,
        contactName,
        email: normalizeEmail(email),
        mobile: phone,
        countryCode: countryIsoCode,
        address,
        city,
        state,
        zip,
        tagId: tag?.id,
        photo,
        preferredPaymentTerm: preferredPaymentTerm,
        clientId: Number(fleet?.fleet?.clientId),
        id: Number(fleet?.fleet?.id),
      });
    } else {
      res = await addFleet({
        fleetName,
        contactName,
        email: normalizeEmail(email),
        mobile: phone,
        countryCode: countryIsoCode,
        address,
        city,
        state,
        zip,
        tagId: tag?.id,
        photo,
        preferredPaymentTerm: preferredPaymentTerm,
      });
    }

    if (res.type === "globalError") {
      showError({
        errorSource: res.errorSource,
        message: res.message,
      });
    } else if (res.type === "success") {
      // Only a new fleet belongs in the customer list; on edit this appended a
      // duplicate entry for a client that's already there.
      if (!isEdit) {
        useListsStore.setState(({ customers }) => ({
          customers: [...customers, res.data],
          newAddedCustomer: res.data,
        }));
        setClient && setClient(res?.data);
      }
      resetForm();
      setOpen(false);
      // The fleet list is server-rendered, so pull the updated row down before
      // the modal can be reopened against stale props.
      router.refresh();
      successToast(`Fleet ${isEdit ? "updated" : "created"} successfully`);
    }
  }

  const resetForm = () => {
    clearError();
    setFleetName("");
    setContactName("");
    setEmail("");
    setAddress("");
    setCity("");
    setState("");
    setMobile("+1");
    setCountryCode("");
    setCountryIsoCode("");
    setZip("");
    setProfilePic(null);
    setTag(undefined);
    setPreferredPaymentTerm(null);
    setTagOpenDropdown(false);
  };

  const handleClose = () => {
    resetForm();
    setOpen(false);
  };

  const paymentTerms = [
    { label: "Instant", value: "Instant", id: "1" },
    { label: "NET15", value: "NET15", id: "2" },
    { label: "NET30", value: "NET30", id: "3" },
    { label: "NET45", value: "NET45", id: "4" },
    { label: "NET60", value: "NET60", id: "5" },
  ];

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) handleClose();
        setOpen(isOpen);
      }}
    >
      <DialogTrigger asChild>
        {buttonElement ? (
          <span className="text-primary">{buttonElement}</span>
        ) : (
          <button className="text-xs text-primary">+ Add New Fleet</button>
        )}
      </DialogTrigger>
      <DialogContent
        onOpenAutoFocus={(e) => e.preventDefault()}
        className="max-h-full max-w-xl grid-rows-[auto,1fr,auto]"
        // form
      >
        <div className="mt-8 flex items-center justify-between px-2 md:px-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-600 dark:text-slate-100">
              {isEdit ? "Edit" : "Add"} Fleet
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Enter details for the {isEdit ? "fleet" : "new fleet"}
            </p>
          </div>

          {profilePic ? (
            <div className="relative group">
              <div className="relative h-16 w-16 rounded-full overflow-hidden ring-4 ring-white dark:ring-slate-800 shadow-md transition-transform group-hover:scale-105">
                <img
                  src={
                    typeof profilePic === "string"
                      ? profilePic
                      : URL.createObjectURL(profilePic)
                  }
                  alt="profile"
                  className="h-full w-full object-cover"
                />
              </div>
              <label
                htmlFor="profilePicture"
                className="absolute bottom-0 right-0 p-1 bg-primary rounded-full shadow-sm cursor-pointer transition-colors"
              >
                <PencilLineIcon className="w-3 h-3 text-white" />
              </label>
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
                <CircleUserRound size={32} strokeWidth={2} />
              </div>
            </label>
          )}
        </div>

        <FormError />

        <div className="space-y-4 overflow-y-auto py-2 px-2 md:px-4 scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-700 scrollbar-track-transparent">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <SlimInput
              name="fleetName"
              label="Fleet Name"
              required
              value={fleetName}
              onChange={(e) => {
                setFleetName(e.target.value);
                if (!e.target.value.trim() && !isEdit) {
                  showError({
                    field: "fleetName",
                    message: "Fleet name is required.",
                  });
                } else {
                  clearError();
                }
              }}
            />
            <SlimInput
              name="contactName"
              value={contactName}
              onChange={(e) => setContactName(e.target.value)}
              label="Name of Contact"
              required={true}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <SlimInput
              name="email"
              type="email"
              label="Email Address"
              required
              value={email}
              onChange={(e) => {
                const value = normalizeEmail(e.target.value);
                setEmail(value);

                if (value && !isValidEmail(value)) {
                  showError({
                    field: "email",
                    message: "Please enter a valid email address.",
                  });
                } else {
                  clearError();
                }
              }}
            />
            <div>
              <PhoneInput
                required
                defaultValue={fleet?.mobile || ""}
                defaultIsoCode={fleet?.countryCode || "US"}
                onChange={(phoneNumber, callingCode, countryIsoCode) => {
                  setMobile(phoneNumber);
                  setCountryCode(callingCode);
                  setCountryIsoCode(countryIsoCode);

                  clearError();
                }}
              />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <SlimInput
              rootClassName="flex-1"
              name="address"
              required={false}
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <SlimInput
              name="city"
              required={false}
              value={city}
              onChange={(e) => setCity(e.target.value)}
            />
            <SlimInput
              name="state"
              required={false}
              value={state}
              onChange={(e) => setState(e.target.value)}
            />
            {/* Controlled zip input with digits-only validation */}
            <SlimInput
              name="zip"
              required={false}
              value={zip}
              onChange={(e) => {
                const value = e.target.value;
                if (value === "" || /^\d+$/.test(value)) {
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="w-full">
              <SelectComponent
                label="Payment Term"
                items={paymentTerms}
                value={preferredPaymentTerm}
                onChange={(value) => setPreferredPaymentTerm(value)}
              />
            </div>

            <div className="w-full">
              <p className="mb-1 font-medium text-slate-600 dark:text-slate-200 transition-colors duration-300">
                Tag
              </p>
              <SelectClientTags
                value={tag}
                setValue={setTag}
                open={tagOpenDropdown}
                setOpen={setTagOpenDropdown}
                showPlaceholder={true}
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <DialogClose
            className="
              rounded-xl px-5 py-2.5 text-sm font-medium text-slate-500
              hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800
              transition-colors border
            "
            onClick={handleClose}
          >
            Cancel
          </DialogClose>
          <button
            disabled={pending}
            type="button"
            onClick={() => startTransition(handleSubmit)}
            className="
              rounded-xl px-6 py-2.5 text-sm font-medium text-white
              bg-gradient-to-r from-primary to-[#5a66ee]
              shadow-lg shadow-indigo-500/30
              hover:shadow-xl hover:shadow-indigo-500/40
              hover:-translate-y-0.5 hover:scale-[1.02]
              active:translate-y-0 active:scale-100
              transition-all duration-200
            "
          >
            {pending ? (
              <div className="flex flex-col items-center justify-center">
                <RotatingLines strokeColor="#fff" strokeWidth="5" width="25" />
              </div>
            ) : isEdit ? (
              "Update"
            ) : (
              "Add"
            )}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
