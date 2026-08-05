"use client";

import { addCustomer } from "@/actions/client/add";
import { CLIENT_LIST_KEY } from "@/app/(dashboard)/dashboard/client/_hook/useClientQuery";
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
import { ClientTagSelector } from "@/components/Lists/ClientTagSelector";
import SelectClientSource from "@/components/Lists/SelectClientSource";
import { SlimInput } from "@/components/SlimInput";
import { Label } from "@/components/ui/label";
import {
  DEFAULT_CLIENT_SOURCE_NAMES,
  isDefaultClientSourceName,
} from "@/lib/consts";
import { useClientFilterStore } from "@/stores/clientFilter";
import { useFormErrorStore } from "@/stores/form-error";
import { useListsStore } from "@/stores/lists";
import { stateStore } from "@/stores/stateStore";
import { Client, Source, Tag } from "@prisma/client";
import { useQueryClient } from "@tanstack/react-query";
import { SquarePen, CircleUserRound as UserIcon, X } from "lucide-react";
import Image from "next/image";
import { usePathname } from "next/navigation";
import type { JSX } from "react";
import { useEffect, useMemo, useState, useTransition } from "react";
import { RotatingLines } from "react-loader-spinner";
import { deleteSource } from "../../actions/source/deleteSource";
import { getSources } from "../../actions/source/getSources";
import { newSource } from "../../actions/source/newSource";
import PhoneInput from "../PhoneInput";
import NewClientSource from "./NewClientSource";
import NewVehicle from "./NewVehicle";

export default function NewCustomer({
  buttonElement,
  setClient,
  setIsAppointmentModalOpen,
  onClientCreated,
}: {
  buttonElement?: JSX.Element;
  setClient?: React.Dispatch<React.SetStateAction<Client | null>>;
  setIsAppointmentModalOpen?: React.Dispatch<React.SetStateAction<boolean>>;
  onClientCreated?: (client: Client) => void;
}) {
  const { isClientOpen, setIsClientOpen } = stateStore();
  const [clientSource, setClientSource] = useState<Source | null>(null);
  const [pending, startTransition] = useTransition();
  const [openClientSource, setOpenClientSource] = useState(false);
  const [tagOpenDropdown, setTagOpenDropdown] = useState(false);
  const [tag, setTag] = useState<Tag>();
  const [profilePic, setProfilePic] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isPremium, setIsPremium] = useState(false);
  const [clientSources, setClientSources] = useState<Source[]>([]);
  const [isCreatingSource, setIsCreatingSource] = useState(false);
  const { showError, clearError } = useFormErrorStore();
  const [mobile, setMobile] = useState("+1");
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const [country, setCountry] = useState("");
  const [countryIsoCode, setCountryIsoCode] = useState("");
  const { search, currentPage, pageSize } = useClientFilterStore();

  // Vehicle creation flow states
  const [showVehicleConfirm, setShowVehicleConfirm] = useState(false);
  const [createdClient, setCreatedClient] = useState<Client | null>(null);
  const [openVehicleModal, setOpenVehicleModal] = useState(false);

  const [clientInfo, setClientInfo] = useState({
    firstName: "",
    lastName: "",
    email: "",
    address: "",
    city: "",
    state: "",
    zip: "",
    customerCompany: "",
  });

  useEffect(() => {
    if (!profilePic) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(profilePic);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [profilePic]);

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

  // Default sources (from the Lead form) not yet saved for this company are
  // shown as suggestions with a negative id; picking one persists it for real.
  const displaySources = useMemo(() => {
    const existingNames = new Set(clientSources.map((source) => source.name));
    const defaults = DEFAULT_CLIENT_SOURCE_NAMES.filter(
      (name) => !existingNames.has(name),
    ).map(
      (name, index) =>
        ({
          id: -(index + 1),
          name,
        }) as Source,
    );

    return [...clientSources, ...defaults];
  }, [clientSources]);

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
        setClientSources((prev) => [...prev, res.data]);
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

  function resetForm() {
    setClientInfo({
      firstName: "",
      lastName: "",
      email: "",
      address: "",
      city: "",
      state: "",
      zip: "",
      customerCompany: "",
    });
    clearError();
    setMobile("+1");
    setClientSources([]);
    setClientSource(null);
    setIsCreatingSource(false);
    setProfilePic(null);
    setTagOpenDropdown(false);
    setTag(undefined);
    setCountryIsoCode("");
    setIsPremium(false);
  }

  async function handleSubmit() {
    clearError();

    // Validate required fields
    if (!clientInfo.firstName.trim()) {
      showError({
        field: "firstName",
        message: "First name is required.",
      });
      return;
    }

    const fullPhone = `${country}${mobile}`;
    if (!mobile || mobile.length < 10) {
      showError({
        field: "mobile",
        message: "Please enter a valid phone number (at least 10 digits).",
      });
      return;
    }
    let photo;
    if (profilePic) {
      const formData = new FormData();
      formData.append("file", profilePic);

      const uploadRes = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!uploadRes.ok) {
        console.error("Failed to upload photos");
        return uploadRes.json();
      }

      const json = await uploadRes.json();
      photo = json?.data?.[0];
    }

    const {
      firstName,
      lastName,
      email,
      address,
      city,
      state,
      zip,
      customerCompany,
    } = clientInfo;

    const res = await addCustomer(
      {
        firstName: firstName.trim(),
        lastName,
        email,
        mobile: fullPhone,
        countryCode: countryIsoCode,
        customerCompany,
        address,
        city,
        state,
        zip,
        tagId: tag?.id,
        sourceId: clientSource?.id,
        photo,
        isPremium,
      },
      pathname,
    );

    if (res?.type === "globalError") {
      showError({
        errorSource: res.errorSource,
        message: res.message,
      });
    } else if (res?.type === "success") {
      queryClient.invalidateQueries({
        queryKey: [CLIENT_LIST_KEY, search, currentPage, pageSize],
      });
      useListsStore.setState(({ customers }) => ({
        customers: [...customers, res.data],
        newAddedCustomer: res.data,
      }));
      setClient && setClient(res?.data);
      onClientCreated && onClientCreated(res.data);

      setCreatedClient(res.data);
      setIsClientOpen(false);
      resetForm();
      setShowVehicleConfirm(true);
    }
  }

  // Handle vehicle confirmation
  const handleVehicleConfirm = () => {
    setShowVehicleConfirm(false);
    // Small delay to ensure smooth transition
    setTimeout(() => {
      setOpenVehicleModal(true);
    }, 100);
  };

  const handleVehicleCancel = () => {
    setShowVehicleConfirm(false);
    setOpenVehicleModal(false);
    setIsAppointmentModalOpen && setIsAppointmentModalOpen(true);
    setCreatedClient(null);
  };

  useEffect(() => {
    getClientSources();
  }, []);

  const handleClose = () => {
    clearError();
    setProfilePic(null);
    setMobile("+1");
    setIsClientOpen(false);
    setIsAppointmentModalOpen && setIsAppointmentModalOpen(true);
    setCountryIsoCode("");
  };

  return (
    <>
      <Dialog
        open={isClientOpen}
        onOpenChange={(isClientOpen) => {
          if (!isClientOpen) handleClose();
          setIsClientOpen(isClientOpen);
        }}
      >
        <DialogTrigger asChild>
          {buttonElement ? (
            buttonElement
          ) : (
            <button
              className="
                  flex items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-white w-full text-center
                  bg-gradient-to-r from-primary to-[#5a66ee]
                  shadow-[0_4px_14px_0_rgba(101,113,255,0.39)]
                  hover:shadow-[0_6px_20px_rgba(101,113,255,0.23)]
                  hover:-translate-y-0.5
                  active:translate-y-0 active:scale-100
                  transition-all duration-300 ease-in-out
              "
            >
              + Add New Client
            </button>
          )}
        </DialogTrigger>
        <DialogContent
          className="max-h-full max-w-2xl grid-rows-[auto,1fr,auto]"
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <div className="mt-8 flex items-center justify-between">
            <div className="px-2">
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                Add Client
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Enter details for the new client
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

          <div className="space-y-2 overflow-y-auto px-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-2">
              <SlimInput
                name="firstName"
                label="First Name"
                placeholder="Enter first name"
                required
                value={clientInfo.firstName}
                onChange={(e) => {
                  const value = e.target.value;
                  setClientInfo((prev) => ({ ...prev, firstName: value }));
                  clearError();
                }}
              />
              <SlimInput
                name="lastName"
                label="Last Name"
                placeholder="Enter last name"
                required={false}
                value={clientInfo.lastName}
                onChange={(e) => {
                  const value = e.target.value;
                  setClientInfo((prev) => ({ ...prev, lastName: value }));
                }}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <SlimInput
                name="email"
                label="Email"
                placeholder="Enter email address"
                value={clientInfo.email}
                // required
                onChange={(e) => {
                  const value = e.target.value;
                  setClientInfo((prev) => ({ ...prev, email: value }));

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

              <div className="w-full">
                <PhoneInput
                  label="Mobile Number"
                  placeholder="1234567890"
                  required
                  onChange={(phoneNum, code, isoCode) => {
                    setMobile(phoneNum);
                    setCountry(code);
                    if (isoCode) setCountryIsoCode(isoCode);
                    clearError();
                  }}
                />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <SlimInput
                value={clientInfo.address}
                rootClassName="flex-1"
                name="address"
                placeholder="Enter address"
                required={false}
                onChange={(e) => {
                  const value = e.target.value;
                  setClientInfo((prev) => ({ ...prev, address: value }));
                }}
              />
            </div>

            <div className="flex items-center justify-between gap-x-2">
              <SlimInput
                value={clientInfo.city}
                name="city"
                placeholder="city"
                required={false}
                onChange={(e) => {
                  setClientInfo((prev) => ({ ...prev, city: e.target.value }));
                }}
              />
              <SlimInput
                value={clientInfo.state}
                name="state"
                placeholder="state"
                required={false}
                onChange={(e) => {
                  setClientInfo((prev) => ({ ...prev, state: e.target.value }));
                }}
              />
              <SlimInput
                name="zip"
                placeholder="zip code"
                value={clientInfo.zip}
                required={false}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value === "" || /^\d+$/.test(value)) {
                    setClientInfo((prev) => ({ ...prev, zip: value }));
                  }
                  // setClientInfo((prev) => ({ ...prev, zip: e.target.value }));
                }}
              />
            </div>

            <div className="grid grid-cols-2 gap-x-4">
              <SlimInput
                name="customerCompany"
                required={false}
                label="Company"
                placeholder="Enter company"
                value={clientInfo.customerCompany}
                onChange={(e) => {
                  const value = e.target.value;
                  setClientInfo((prev) => ({
                    ...prev,
                    customerCompany: value,
                  }));
                }}
              />

              <div className="flex w-full flex-col gap-1.5">
                <Label className="text-base">Client Source</Label>
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
                              onClick={() => {
                                deleteClientSource(clientSource.id);
                              }}
                            >
                              <X size={20} />
                            </button>
                          </div>
                        )}
                    </div>
                  )}
                  selectedItem={clientSource}
                  setSelectedItem={setClientSource}
                  onSearch={(search: string) => {
                    return displaySources.filter((clientSource: Source) =>
                      clientSource.name
                        .toLowerCase()
                        .includes(search.toLowerCase()),
                    );
                  }}
                  openState={[openClientSource, setOpenClientSource]}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4">
              <div className="flex w-full flex-col gap-1.5">
                <Label className="text-base">Tag</Label>
                <ClientTagSelector
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
              className="mt-2 rounded-md border px-5 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground sm:mt-0"
              onClick={() => {
                clearError();
                setIsClientOpen(false);
                resetForm();
              }}
            >
              Cancel
            </DialogClose>
            <button
              disabled={pending || isCreatingSource}
              type="button"
              onClick={() => startTransition(handleSubmit)}
              className="rounded-md bg-gradient-to-r from-primary to-[#5a66ee] px-6 py-2 text-sm font-medium text-white shadow transition-all duration-200 hover:shadow-lg hover:shadow-indigo-500/30 disabled:opacity-50"
            >
              {pending ? (
                <div className="flex flex-col items-center justify-center">
                  <RotatingLines
                    strokeColor="#fff"
                    strokeWidth="5"
                    width="25"
                  />
                </div>
              ) : (
                "Add"
              )}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Vehicle Creation Confirmation Modal */}
      <Dialog
        open={showVehicleConfirm}
        onOpenChange={(open) => {
          // Only allow closing via the Cancel button, not by clicking outside
          if (!open) {
            handleVehicleCancel();
          }
        }}
      >
        <DialogContent
          className="max-w-md"
          onOpenAutoFocus={(e) => e.preventDefault()}
          onInteractOutside={(e) => {
            // Prevent closing when clicking outside
            e.preventDefault();
          }}
        >
          <DialogHeader>
            <DialogTitle>Add Vehicle</DialogTitle>
          </DialogHeader>

          <div className="py-4">
            <p className="text-lg text-foreground">
              Would you like to add a vehicle for{" "}
              <span className="font-semibold">
                {createdClient?.firstName} {createdClient?.lastName}
              </span>
              ?
            </p>
          </div>

          <DialogFooter>
            <button
              type="button"
              className="rounded-md border px-5 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
              onClick={handleVehicleCancel}
            >
              No, Skip
            </button>
            <button
              type="button"
              onClick={handleVehicleConfirm}
              className="rounded-md bg-gradient-to-r from-primary to-[#5a66ee] px-6 py-2 text-sm font-medium text-white shadow transition-all duration-200 hover:shadow-lg hover:shadow-indigo-500/30 disabled:opacity-50"
            >
              Yes, Add Vehicle
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Vehicle Creation Modal */}
      {createdClient && (
        <NewVehicle
          key={`vehicle-${createdClient.id}`}
          clientId={createdClient.id}
          onAdd={(vehicle) => {
            setOpenVehicleModal(false);
            setCreatedClient(null);
            setIsAppointmentModalOpen && setIsAppointmentModalOpen(true);
          }}
          setIsAppointmentModalOpen={setIsAppointmentModalOpen}
          open={openVehicleModal}
          setOpen={setOpenVehicleModal}
        />
      )}
    </>
  );
}
