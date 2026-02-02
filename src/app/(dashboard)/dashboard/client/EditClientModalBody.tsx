"use client";

import { editClient } from "@/actions/client/edit";
import { deleteSource } from "@/actions/source/deleteSource";
import { getSources } from "@/actions/source/getSources";
import { DialogClose, DialogContent, DialogFooter } from "@/components/Dialog";
import FormError from "@/components/FormError";
import NewClientSource from "@/components/Lists/NewClientSource";
import SelectClientSource from "@/components/Lists/SelectClientSource";
import { SelectClientTags } from "@/components/Lists/SelectClientTags";
import { SlimInput } from "@/components/SlimInput";
import { DEFAULT_IMAGE_URL } from "@/lib/consts";
import { successToast } from "@/lib/toast";
import { useFormErrorStore } from "@/stores/form-error";
import { Client, Source, Tag } from "@prisma/client";
import { useQueryClient } from "@tanstack/react-query";
import { CircleUserRound as UserIcon, SquarePen, X } from "lucide-react";
import Image from "next/image";
import { useEffect, useRef, useState, useTransition } from "react";
import { RotatingLines } from "react-loader-spinner";
import { CLIENT_LIST_KEY } from "./_hook/useClientQuery";
import { useClientFilterStore } from "@/stores/clientFilter";
import PhoneInput from "@/components/PhoneInput";

type TEditClientModalBodyProps = {
  client: Client & {
    tag: Tag | null;
    source: Source | null;
  };
  onClose: () => void;
};

export default function EditClientModalBody({
  client,
  onClose,
}: TEditClientModalBodyProps) {
  const [clientSource, setClientSource] = useState<Source | null>(
    client.source
  );
  const [pending, startTransition] = useTransition();

  const queryClient = useQueryClient();
  const { search, currentPage, pageSize } = useClientFilterStore();

  const [openClientSource, setOpenClientSource] = useState(false);
  const [tagOpenDropdown, setTagOpenDropdown] = useState(false);
  const [tag, setTag] = useState<Tag | undefined>(client.tag!);
  const [isPremium, setIsPremium] = useState<boolean>(client.isFleet!);
  const [profilePic, setProfilePic] = useState<string | null>(
    client.photo !== DEFAULT_IMAGE_URL ? client.photo : null
  );
  const [newProfilePic, setNewProfilePic] = useState<File | null>(null);
  const [clientSources, setClientSources] = useState<Source[]>([]);
  const { showError, clearError } = useFormErrorStore();
  const phoneDataRef = useRef({
    phoneNumber: "",
    countryCode: "",
    isoCode: "",
  });
  useEffect(() => {
    setIsPremium(client?.isFleet!);
    setTag(client.tag || undefined);
    setClientSource(client.source || null);
    setProfilePic(client.photo !== DEFAULT_IMAGE_URL ? client.photo : null);
  }, [client]);

  async function getClientSources() {
    const data = await getSources();
    setClientSources(data);
  }

  async function deleteClientSource(id: number) {
    await deleteSource(id);

    setClientSources((prev: Source[]) => {
      return prev.filter((source) => source.id !== id);
    });

    if (clientSource?.id === id) {
      setClientSource(null);
    }
  }

  async function handleSubmit() {
    clearError();
    let photo;
    const firstName = document.querySelector<HTMLInputElement>("#firstName")
      ?.value as string;
    const lastName =
      document.querySelector<HTMLInputElement>("#lastName")?.value;
    const email = document.querySelector<HTMLInputElement>("#email")?.value;
    // const mobile = document.querySelector<HTMLInputElement>("#mobile")?.value;
    const { phoneNumber, countryCode, isoCode } = phoneDataRef.current;
    const mobile =
      countryCode && phoneNumber
        ? `${countryCode}${phoneNumber}`
        : phoneNumber || "";
    const customerCompany =
      document.querySelector<HTMLInputElement>("#customerCompany")?.value;
    const address = document.querySelector<HTMLInputElement>("#address")?.value;
    const city = document.querySelector<HTMLInputElement>("#city")?.value;
    const state = document.querySelector<HTMLInputElement>("#state")?.value;
    const zip = document.querySelector<HTMLInputElement>("#zip")?.value;
    if (!firstName?.trim()) {
      showError({
        field: "firstName",
        message: "First name is required.",
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
    // For email
    // if (!email?.trim()) {
    //   showError({
    //     field: "email",
    //     message: "Email is required.",
    //   });
    //   return;
    // }
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

    const res = await editClient({
      id: client.id,
      firstName,
      lastName,
      email,
      mobile,
      countryCode: isoCode,
      customerCompany,
      address,
      city,
      state,
      zip,
      tagId: tag?.id,
      sourceId: clientSource?.id,
      photo,
      isPremium,
      skipEmailCheck: true,
    });

    if (res.type === "globalError") {
      showError({
        field: res.field || "make",
        message:
          res?.errorSource && res?.errorSource?.length > 0
            ? res.errorSource[0].message
            : res.message,
      });
    } else if (res.type === "success") {
      queryClient.invalidateQueries({
        queryKey: [CLIENT_LIST_KEY, search, currentPage, pageSize],
      });
      clearError();
      onClose();
      successToast("Client updated successfully");
    }
  }

  useEffect(() => {
    getClientSources();
  }, []);

  return (
<<<<<<< HEAD
    <DialogContent className="max-h-full max-w-2xl grid-rows-[auto,1fr,auto]">
      <div className="mt-8 flex items-center justify-between px-2">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-600 dark:text-slate-100">
            Edit Client
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Update details for the client
          </p>
        </div>
=======
    <DialogContent className="max-h-full max-w-xl grid-rows-[auto,1fr,auto]">
      <div className="mt-8 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Edit Client</h1>
>>>>>>> 562aae035edd611117b1950291edabf2b6d02c1d

        {newProfilePic || profilePic ? (
          <div className="relative group">
            <div className="relative h-16 w-16 rounded-full overflow-hidden ring-4 ring-white dark:ring-slate-800 shadow-md transition-transform group-hover:scale-105">
              <Image
                src={
                  newProfilePic
                    ? URL.createObjectURL(newProfilePic)
                    : profilePic || ""
                }
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
              className="absolute bottom-0 right-0 p-1 bg-[#6571FF] rounded-full shadow-sm cursor-pointer hover:bg-gray-100 transition-colors"
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
                if (file) {
                  setNewProfilePic(file);
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
                  setNewProfilePic(file);
                }
              }}
            />
            <div className="flex flex-col items-end">
              <span className="text-sm font-semibold text-slate-600 dark:text-slate-300 group-hover:text-[#6571FF] transition-colors">
                Upload Photo
              </span>
            </div>
            <div className="p-1 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-400 group-hover:text-[#6571FF] group-hover:bg-white transition-colors">
              <UserIcon size={32} strokeWidth={2} />
            </div>
          </label>
        )}
      </div>

      <FormError />

      <div className="space-y-2 overflow-y-auto px-2">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-2">
          <SlimInput
            name="firstName"
            label="First Name"
            required
            defaultValue={client.firstName!}
            onChange={(e) => {
              const value = e.target.value;

              // Validate on input change
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
            label="Last Name"
            required={false}
            defaultValue={client.lastName!}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          <SlimInput
            name="email"
            label="Email"
            defaultValue={client.email!}
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
          <div className="md:w-[248px]">
            <PhoneInput
              label="Mobile"
              placeholder="1234567890"
              required
              defaultValue={client.mobile!}
              // value={phoneNumber}
              defaultIsoCode={client.countryCode!}
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
        </div>

        <div className="flex items-center justify-between">
          <SlimInput
            rootClassName="flex-1"
            name="address"
            required={false}
            defaultValue={client.address!}
          />
        </div>

        <div className="flex items-center justify-between gap-x-2">
          <SlimInput name="city" required={false} defaultValue={client.city!} />
          <SlimInput
            name="state"
            required={false}
            defaultValue={client.state!}
          />
          <SlimInput name="zip" required={false} defaultValue={client.zip!} />
        </div>

        <div className="grid grid-cols-2 gap-x-4">
          <SlimInput
            name="customerCompany"
            required={false}
            defaultValue={client.customerCompany!}
            label="Company"
          />

          <div className="w-full">
            <p className="mb-1 font-medium text-slate-600">Client Source</p>
            {/* TODO: use `Selector` component and make the hieght auto */}
            <SelectClientSource
              clickabled={false}
              label={(clientSrc) =>
                clientSource ? clientSource.name : "Client Source"
              }
              newButton={
                <NewClientSource
                  setClientSources={setClientSources}
                  setClientSource={setClientSource}
                  setOpenClientSource={setOpenClientSource}
                />
              }
              items={clientSources}
              displayList={(clientSource: Source) => (
                <div className="flex">
                  <button
                    className="w-full text-left text-sm font-bold"
                    onClick={() => {
                      setClientSource(clientSource);
                      setOpenClientSource(false);
                    }}
                    type="button"
                  >
                    {clientSource.name}
                  </button>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        deleteClientSource(clientSource.id);
                      }}
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              )}
              selectedItem={clientSource}
              setSelectedItem={setClientSource}
              onSearch={(search: string) => {
                return clientSources.filter((clientSource: Source) =>
                  clientSource.name.toLowerCase().includes(search.toLowerCase())
                );
              }}
              openState={[openClientSource, setOpenClientSource]}
            />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4">
          <div className="w-full">
            {/* BUG: when making the root `form`, this dropdown doesn't work */}
            <p className="mb-1 font-medium text-slate-600">Tag</p>
            <SelectClientTags
              value={tag}
              setValue={setTag}
              open={tagOpenDropdown}
              setOpen={setTagOpenDropdown}
            />
          </div>
          <div>
            <label className="flex cursor-pointer select-none items-center gap-3 mt-9 group">
              <div className="relative flex items-center">
                <input
                  type="checkbox"
                  checked={isPremium}
                  onChange={(e) => setIsPremium(e.target.checked)}
                  className="peer h-5 w-5 cursor-pointer appearance-none rounded-md border-2 border-slate-300 transition-all checked:border-[#6571FF] checked:bg-[#6571FF] hover:border-[#6571FF]"
                />
                <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-white opacity-0 transition-opacity peer-checked:opacity-100">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-3.5 w-3.5"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
              </div>
              <span className="font-medium text-slate-700 dark:text-slate-300 group-hover:text-[#6571FF] transition-colors">
                Add as a Fleet
              </span>
            </label>
          </div>
        </div>
      </div>

      <DialogFooter>
        <DialogClose
          className="
                rounded-xl mt-2 sm:mt-0 px-5 py-2.5 text-sm font-medium text-slate-500 
                hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800
                transition-colors border
              "
          onClick={() => {
            clearError();
            onClose();
          }}
        >
          Cancel
        </DialogClose>
        <button
          disabled={pending}
          type="button"
          onClick={() => startTransition(handleSubmit)}
          className="
                rounded-xl px-6 py-2.5 text-sm font-medium text-white
                bg-gradient-to-r from-[#6571FF] to-[#5a66ee]
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
          ) : (
            "Update"
          )}
        </button>
      </DialogFooter>
    </DialogContent>
  );
}
