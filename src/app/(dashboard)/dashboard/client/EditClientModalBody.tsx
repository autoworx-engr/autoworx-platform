"use client";

import { editClient } from "@/actions/client/edit";
import { deleteSource } from "@/actions/source/deleteSource";
import { getSources } from "@/actions/source/getSources";
import { DialogClose, DialogContent, DialogFooter } from "@/components/Dialog";
import FormError from "@/components/FormError";
import NewClientSource from "@/components/Lists/NewClientSource";
import SelectClientSource from "@/components/Lists/SelectClientSource";
import { SelectClientTags } from "@/components/Lists/SelectClientTags";
import PhoneInput from "@/components/PhoneInput";
import { SlimInput } from "@/components/SlimInput";
import {
  DEFAULT_CLIENT_SOURCE_NAMES,
  DEFAULT_IMAGE_URL,
  isDefaultClientSourceName,
} from "@/lib/consts";
import { successToast } from "@/lib/toast";
import { useClientFilterStore } from "@/stores/clientFilter";
import { useFormErrorStore } from "@/stores/form-error";
import { Client, Source, Tag } from "@prisma/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { SquarePen, CircleUserRound as UserIcon, X } from "lucide-react";
import Image from "next/image";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { RotatingLines } from "react-loader-spinner";
import { newSource } from "@/actions/source/newSource";
import { CLIENT_LIST_KEY } from "./_hook/useClientQuery";
import useClientByIdQuery, {
  CLIENT_DETAIL_KEY,
} from "./_hook/useClientQueryById";

const CLIENT_SOURCES_KEY = "client-sources";

function useClientSourcesQuery() {
  return useQuery({
    queryKey: [CLIENT_SOURCES_KEY],
    queryFn: async () => {
      return getSources();
    },
  });
}

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
  const { data: clientData, isLoading } = useClientByIdQuery(client.id);
  const { data: queryClientSources = [] } = useClientSourcesQuery();

  const resolvedClient = clientData ?? client;
  console.log("Resolved client data:", resolvedClient); // Debug log to check client data
  console.log("Client: ", client); // Debug log to check initial client prop
  const [clientSource, setClientSource] = useState<Source | null>(
    resolvedClient.source,
  );

  // resolvedClient.source is only correct once clientData has loaded
  // (the list-row client prop doesn't include the source relation).
  useEffect(() => {
    if (clientData) {
      setClientSource(clientData.source ?? null);
    }
  }, [clientData]);

  const [pending, startTransition] = useTransition();

  const queryClient = useQueryClient();
  const { search, currentPage, pageSize } = useClientFilterStore();

  const [openClientSource, setOpenClientSource] = useState(false);
  const [isCreatingSource, setIsCreatingSource] = useState(false);
  const [tagOpenDropdown, setTagOpenDropdown] = useState(false);
  const [tag, setTag] = useState<Tag | undefined>(
    resolvedClient.tag ?? undefined,
  );
  const [isPremium, setIsPremium] = useState<boolean>(
    resolvedClient.isFleet ?? false,
  );
  const [profilePic, setProfilePic] = useState<string | null>(
    resolvedClient.photo !== DEFAULT_IMAGE_URL ? resolvedClient.photo : null,
  );
  const [newProfilePic, setNewProfilePic] = useState<File | null>(null);
  const { showError, clearError } = useFormErrorStore();
  const [zip, setZip] = useState(resolvedClient.zip ?? "");

  // Initialize ref with existing client data so submit works without touching the field
  const phoneDataRef = useRef({
    phoneNumber: resolvedClient.mobile ?? "",
    countryCode: "",
    isoCode: resolvedClient.countryCode ?? "",
  });

  async function deleteClientSource(id: number) {
    await deleteSource(id);
    queryClient.setQueryData<Source[]>([CLIENT_SOURCES_KEY], (prev = []) =>
      prev.filter((source) => source.id !== id),
    );
    if (clientSource?.id === id) {
      setClientSource(null);
    }
  }

  // Default sources (from the Lead form) not yet saved for this company are
  // shown as suggestions with a negative id; picking one persists it for real.
  const displaySources = useMemo(() => {
    const existingNames = new Set(
      queryClientSources.map((source) => source.name),
    );
    const defaults = DEFAULT_CLIENT_SOURCE_NAMES.filter(
      (name) => !existingNames.has(name),
    ).map(
      (name, index) =>
        ({
          id: -(index + 1),
          name,
        }) as Source,
    );

    return [...queryClientSources, ...defaults];
  }, [queryClientSources]);

  async function selectClientSource(source: Source) {
    if (source.id >= 0) {
      setClientSource(source);
      return;
    }

    if (isCreatingSource) return;
    setIsCreatingSource(true);
    try {
      const res = await newSource(source.name);
      if (res.type === "success") {
        queryClient.setQueryData<Source[]>(
          [CLIENT_SOURCES_KEY],
          (prev = []) => [...prev, res.data],
        );
        setClientSource(res.data);
      } else {
        showError({
          message: res.message || "Failed to add client source.",
        });
      }
    } finally {
      setIsCreatingSource(false);
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

    if (!firstName?.trim()) {
      showError({ field: "firstName", message: "First name is required." });
      return;
    }

    if (!mobile || mobile.length < 10) {
      showError({
        field: "mobile",
        message: "Please enter a valid phone number (at least 10 digits).",
      });
      return;
    }

    // Final guard: ensure no non-digit slipped through
    if (zip && !/^\d+$/.test(zip)) {
      showError({
        field: "zip",
        message: "Zip code must contain digits only.",
      });
      return;
    }

    // Upload new photo first — delete old only after confirmed success
    // (Prevents data loss: if upload fails, old photo must remain intact)
    if (newProfilePic) {
      const formData = new FormData();
      formData.append("file", newProfilePic);

      const uploadRes = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!uploadRes.ok) {
        console.error("Failed to upload photo");
        return uploadRes.json();
      }

      const json = await uploadRes.json();
      photo = json.data[0];

      // Only delete the old photo now that the new one is safely stored
      if (profilePic && profilePic !== DEFAULT_IMAGE_URL) {
        await fetch("/api/upload", {
          method: "DELETE",
          body: JSON.stringify({ filePath: profilePic }),
        });
      }
    }

    const res = await editClient({
      id: resolvedClient.id,
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
      queryClient.invalidateQueries({
        queryKey: [CLIENT_DETAIL_KEY, resolvedClient?.id],
      });
      clearError();
      onClose();
      successToast("Client updated successfully");
    }
  }

  return (
    <DialogContent
      className="max-h-full max-w-2xl grid-rows-[auto,1fr,auto]"
      onOpenAutoFocus={(e) => e.preventDefault()}
    >
      <div className="mt-8 flex items-center justify-between px-2">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-600 dark:text-slate-100">
            Edit Client
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Update details for the client
          </p>
        </div>

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
              />
            </div>
            <label
              htmlFor="profilePicture"
              className="absolute bottom-0 right-0 p-1 bg-primary rounded-full shadow-sm cursor-pointer  transition-colors"
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
                if (file) setNewProfilePic(file);
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
                if (file) setNewProfilePic(file);
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

      <div className="space-y-2 overflow-y-auto px-2">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-2">
          <SlimInput
            name="firstName"
            label="First Name"
            required
            defaultValue={resolvedClient?.firstName!}
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
            label="Last Name"
            required={false}
            defaultValue={resolvedClient?.lastName!}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          <SlimInput
            name="email"
            label="Email"
            defaultValue={resolvedClient?.email!}
          />
          <div className="w-full">
            {clientData ? (
              <PhoneInput
                key={`mobile-${clientData.id}`}
                label="Mobile"
                placeholder="1234567890"
                required
                defaultValue={clientData.mobile!}
                defaultIsoCode={clientData.countryCode!}
                onChange={(phone, code, iso) => {
                  phoneDataRef.current = {
                    phoneNumber: phone,
                    countryCode: code,
                    isoCode: iso || "",
                  };
                  clearError();
                }}
              />
            ) : (
              <div className="w-full">
                <label className="flex items-center gap-1 text-base font-medium text-slate-700 dark:text-slate-200 transition-colors duration-300">
                  Mobile
                  <span className="text-red-500 ml-1">*</span>
                </label>
                <div className="mt-1.5 py-1 flex items-center rounded-lg border border-slate-300 bg-white dark:border-slate-700 dark:bg-slate-900">
                  <input
                    type="tel"
                    value=""
                    readOnly
                    aria-label="Mobile"
                    className="w-full px-4 py-[2px] bg-transparent text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between">
          <SlimInput
            rootClassName="flex-1"
            name="address"
            required={false}
            defaultValue={resolvedClient?.address!}
          />
        </div>

        <div className="flex items-center justify-between gap-x-2">
          <SlimInput
            name="city"
            required={false}
            defaultValue={resolvedClient?.city!}
          />
          <SlimInput
            name="state"
            required={false}
            defaultValue={resolvedClient?.state!}
          />
          {/* Controlled zip — blocks non-digit input */}
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

        <div className="grid grid-cols-2 gap-x-4">
          <SlimInput
            name="customerCompany"
            required={false}
            defaultValue={resolvedClient?.customerCompany!}
            label="Company"
          />

          <div className="w-full">
            <p className="mb-1 font-medium text-slate-600">Client Source</p>
            <SelectClientSource
              clickabled={false}
              label={(clientSrc) =>
                clientSource ? clientSource.name : "Client Source"
              }
              newButton={
                <NewClientSource
                  setClientSources={(updater) => {
                    queryClient.setQueryData<Source[]>(
                      [CLIENT_SOURCES_KEY],
                      (prev = []) =>
                        typeof updater === "function" ? updater(prev) : updater,
                    );
                  }}
                  setClientSource={setClientSource}
                  setOpenClientSource={setOpenClientSource}
                />
              }
              items={displaySources}
              displayList={(clientSource: Source) => (
                <div className="flex">
                  <button
                    className="w-full text-left text-sm font-bold"
                    onClick={() => {
                      selectClientSource(clientSource);
                      setOpenClientSource(false);
                    }}
                    type="button"
                  >
                    {clientSource.name}
                  </button>
                  {clientSource.id >= 0 &&
                    !isDefaultClientSourceName(clientSource.name) && (
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => deleteClientSource(clientSource.id)}
                        >
                          <X className="w-5 h-5" />
                        </button>
                      </div>
                    )}
                </div>
              )}
              selectedItem={clientSource}
              setSelectedItem={setClientSource}
              onSearch={(search: string) =>
                displaySources.filter((s: Source) =>
                  s.name.toLowerCase().includes(search.toLowerCase()),
                )
              }
              openState={[openClientSource, setOpenClientSource]}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4">
          <div className="w-full">
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
                  className="peer h-5 w-5 cursor-pointer appearance-none rounded-md border-2 border-slate-300 transition-all checked:border-primary checked:bg-primary hover:border-primary"
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
              <span className="font-medium text-slate-700 dark:text-slate-300 group-hover:text-primary transition-colors">
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
          disabled={pending || isLoading || isCreatingSource}
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
            disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:scale-100
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
