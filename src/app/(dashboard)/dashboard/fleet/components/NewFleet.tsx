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
import SelectorWithSearch from "@/components/Lists/SelectorWithSearch";
import { SlimInput } from "@/components/SlimInput";
import { useFormErrorStore } from "@/stores/form-error";
import { useListsStore } from "@/stores/lists";
import { Client, Fleet, Tag } from "@prisma/client";
import { useEffect, useState, useTransition } from "react";
import { RxAvatar } from "react-icons/rx";
import { RotatingLines } from "react-loader-spinner";
import SelectComponent from "./Select";
import Image from "next/image";
import { successToast } from "@/lib/toast";

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
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [preferredPaymentTerm, setPreferredPaymentTerm] = useState<
    string | null
  >(null);
  const [tagOpenDropdown, setTagOpenDropdown] = useState(false);
  const [tag, setTag] = useState<Tag | undefined>(fleet?.tag!);
  const [profilePic, setProfilePic] = useState<File | null | string>(
    fleet ? fleet.photo : null
  );

  const { showError, clearError } = useFormErrorStore();
  const [mobile, setMobile] = useState("+1");

  useEffect(() => {
    if (isEdit && fleet && open) {
      setMobile(fleet?.mobile!);
      setProfilePic(fleet ? fleet.photo : null);
      setPreferredPaymentTerm(
        fleet ? fleet?.fleet!.preferredPaymentTerm : null
      );
    }
  }, [isEdit, fleet, open]);

  async function handleSubmit() {
    clearError();
    let photo;
    const fleetName = document.querySelector<HTMLInputElement>("#fleetName")
      ?.value as string;
    const contactName =
      document.querySelector<HTMLInputElement>("#contactName")?.value;
    const email = document.querySelector<HTMLInputElement>("#email")?.value;
    const mobile = document.querySelector<HTMLInputElement>("#mobile")?.value;
    const address = document.querySelector<HTMLInputElement>("#address")?.value;
    const city = document.querySelector<HTMLInputElement>("#city")?.value;
    const state = document.querySelector<HTMLInputElement>("#state")?.value;
    const zip = document.querySelector<HTMLInputElement>("#zip")?.value;

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
    if (!mobile?.trim()) {
      showError({
        field: "mobile",
        message: "Mobile is required.",
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
        email,
        mobile,
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
        email,
        mobile,
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
      useListsStore.setState(({ customers }) => ({
        customers: [...customers, res.data],
        newAddedCustomer: res.data,
      }));
      setClient && setClient(res?.data);
      setMobile("+1");
      clearError();
      setOpen(false);
      successToast(`Fleet ${isEdit ? "updated" : "created"} successfully`);
    }
  }

  const handleClose = () => {
    clearError(); // ✅ Reset form errors when closing
    setProfilePic(null); // ✅ Reset profile picture
    setMobile("+1");
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
          buttonElement
        ) : (
          <button className="text-xs text-[#6571FF]">+ Add New Fleet</button>
        )}
      </DialogTrigger>
      <DialogContent
        className="max-h-full max-w-xl grid-rows-[auto,1fr,auto]"
        // form
      >
        <div className="mt-8 flex items-center justify-between">
          <h1 className="text-2xl font-bold">
            {isEdit ? "Edit" : "Add"} Fleet
          </h1>

          {profilePic ? (
            // eslint-disable-next-line @next/next/no-img-element
            <div className="relative h-14 w-14 rounded-full border border-slate-400 hover:border-dashed hover:opacity-80 overflow-hidden">
              <Image
                src={
                  typeof profilePic === "string"
                    ? profilePic
                    : URL.createObjectURL(profilePic)
                }
                alt="profile"
                width={56}
                height={56}
                className="h-full w-full cursor-pointer object-cover"
                onClick={() => {
                  setProfilePic(null);
                }}
                unoptimized={profilePic !== null}
                crossOrigin="anonymous"
              />
            </div>
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
              <span className="hidden lg:block">Upload a profile picture</span>
              <span className="lg:hidden">Upload picture</span>{" "}
              <RxAvatar size={48} />
            </label>
          )}
        </div>

        <FormError />

        <div className="space-y-2 overflow-y-auto">
          <div className="flex items-center justify-between gap-x-2">
            <SlimInput
              name="fleetName"
              label="Fleet Name"
              required
              defaultValue={fleet?.fleet?.fleetName!}
              onChange={(e) => {
                const value = e.target.value;

                // Validate on input change
                if (!value.trim() && isEdit == false) {
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
              defaultValue={fleet?.fleet?.contactName!}
              label="Name of contact"
              required={true}
            />
          </div>

          <div className="flex items-center justify-between gap-x-2">
            <SlimInput
              name="email"
              label="Email Address"
              required
              defaultValue={fleet?.email!}
              onChange={(e) => {
                const value = e.target.value;

                // Validate on input change
                // if (!value.trim()) {
                //   showError({
                //     field: "email",
                //     message: "Email is required.",
                //   });
                // } else {
                //   clearError();
                // }
              }}
            />
            <SlimInput
              type="tel"
              name="mobile"
              label="Mobile Number"
              required
              defaultValue={mobile}
              onChange={(e) => {
                const value = e.target.value;

                // Ensure the value starts with +1 and only allows numeric values
                if (value.startsWith("+1") && /^\+1\d*$/.test(value)) {
                  setMobile(value);
                  clearError();
                } else {
                  showError({
                    field: "mobile",
                    message:
                      "Invalid phone number format. Only numbers are allowed.",
                  });
                }
              }}
            />
          </div>

          <div className="flex items-center justify-between">
            <SlimInput
              rootClassName="flex-1"
              name="address"
              required={false}
              defaultValue={fleet?.address!}
            />
          </div>

          <div className="flex items-center justify-between gap-x-2">
            <SlimInput
              name="city"
              required={false}
              defaultValue={fleet?.city!}
            />
            <SlimInput
              name="state"
              required={false}
              defaultValue={fleet?.state!}
            />
            <SlimInput name="zip" required={false} defaultValue={fleet?.zip!} />
          </div>

          <div className="flex items-center justify-between gap-x-8">
            <div className="w-full">
              <SelectComponent
                label="Preferred Payment Term"
                items={paymentTerms}
                value={preferredPaymentTerm}
                onChange={(value) => setPreferredPaymentTerm(value)}
              />
            </div>

            <div className="w-full">
              <p className="mb-1 font-medium">Tag</p>
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
            className="mt-1 rounded-lg border-2 border-slate-400 p-2 lg:mt-0"
            onClick={() => {
              clearError();
              setOpen(false);
            }}
          >
            Cancel
          </DialogClose>
          <button
            disabled={pending}
            type="button"
            onClick={() => startTransition(handleSubmit)}
            className="rounded-lg border bg-[#6571FF] px-5 py-2 text-white"
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
