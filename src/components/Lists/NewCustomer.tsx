//----------------------------------------------------------
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
import { useClientFilterStore } from "@/stores/clientFilter";
import { useFormErrorStore } from "@/stores/form-error";
import { useListsStore } from "@/stores/lists";
import { stateStore } from "@/stores/stateStore";
import { Client, Source, Tag } from "@prisma/client";
import { useQueryClient } from "@tanstack/react-query";
import { UserIcon, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { RotatingLines } from "react-loader-spinner";
import { deleteSource } from "../../actions/source/deleteSource";
import { getSources } from "../../actions/source/getSources";
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
  const [clientSources, setClientSources] = useState<Source[]>([]);
  const { showError, clearError } = useFormErrorStore();
  const [mobile, setMobile] = useState("+1");
  const pathname = usePathname();
  const queryClient = useQueryClient();
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
    setProfilePic(null);
    setTagOpenDropdown(false);
    setTag(undefined);
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

    // Validate mobile number format
    if (!mobile.startsWith("+1") || !/^\+1\d{10}$/.test(mobile)) {
      showError({
        field: "mobile",
        message:
          "Please enter a valid US phone number with area code (e.g., +1234567890).",
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
        mobile,
        customerCompany,
        address,
        city,
        state,
        zip,
        tagId: tag?.id,
        sourceId: clientSource?.id,
        photo,
      },
      pathname
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
                  flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-white
                  bg-gradient-to-r from-[#6571FF] to-[#5a66ee]
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
        <DialogContent className="max-h-full max-w-xl grid-rows-[auto,1fr,auto]">
          <div className="mt-8 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-600 dark:text-slate-100">
                Add Client
              </h1>
              <p className="text-sm text-slate-500 mt-1">
                Enter details for the new client
              </p>
            </div>

            {profilePic ? (
              <img
                src={URL.createObjectURL(profilePic)}
                alt="profile"
                className="h-16 w-16 cursor-pointer rounded-full object-cover ring-4 ring-white dark:ring-slate-800 shadow-md transition-transform group-hover:scale-105"
                onClick={() => {
                  setProfilePic(null);
                }}
              />
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

          <div className="space-y-2 overflow-y-auto">
            <div className="flex items-center justify-between gap-x-2">
              <SlimInput
                name="firstName"
                label="First Name"
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
                required={false}
                value={clientInfo.lastName}
                onChange={(e) => {
                  const value = e.target.value;
                  setClientInfo((prev) => ({ ...prev, lastName: value }));
                }}
              />
            </div>

            <div className="flex items-center justify-between gap-x-2">
              <SlimInput
                name="email"
                label="Email"
                value={clientInfo.email}
                onChange={(e) => {
                  const value = e.target.value;
                  setClientInfo((prev) => ({ ...prev, email: value }));
                }}
              />
              <SlimInput
                name="mobile"
                label="Mobile"
                required
                value={mobile}
                onChange={(e) => {
                  const value = e.target.value;
                  setMobile(value);
                  clearError();
                }}
              />
            </div>

            <div className="flex items-center justify-between">
              <SlimInput
                value={clientInfo.address}
                rootClassName="flex-1"
                name="address"
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
                required={false}
                onChange={(e) => {
                  setClientInfo((prev) => ({ ...prev, city: e.target.value }));
                }}
              />
              <SlimInput
                value={clientInfo.state}
                name="state"
                required={false}
                onChange={(e) => {
                  setClientInfo((prev) => ({ ...prev, state: e.target.value }));
                }}
              />
              <SlimInput
                name="zip"
                value={clientInfo.zip}
                required={false}
                onChange={(e) => {
                  setClientInfo((prev) => ({ ...prev, zip: e.target.value }));
                }}
              />
            </div>

            <div className="flex items-center justify-between gap-x-4">
              <SlimInput
                name="customerCompany"
                required={false}
                label="Company"
                value={clientInfo.customerCompany}
                onChange={(e) => {
                  const value = e.target.value;
                  setClientInfo((prev) => ({
                    ...prev,
                    customerCompany: value,
                  }));
                }}
              />

              <div className="w-full">
                <p className="mb-1 font-medium">Client Source</p>
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
                          <X size={20} />
                        </button>
                      </div>
                    </div>
                  )}
                  selectedItem={clientSource}
                  setSelectedItem={setClientSource}
                  onSearch={(search: string) => {
                    return clientSources.filter((clientSource: Source) =>
                      clientSource.name
                        .toLowerCase()
                        .includes(search.toLowerCase())
                    );
                  }}
                  openState={[openClientSource, setOpenClientSource]}
                />
              </div>
            </div>
            <div className="">
              <p className="mb-1 font-medium">Tag</p>
              <ClientTagSelector
                value={tag}
                setValue={setTag}
                open={tagOpenDropdown}
                setOpen={setTagOpenDropdown}
              />
            </div>
          </div>

          <DialogFooter>
            <DialogClose
              className="
                rounded-xl px-5 py-2.5 text-sm font-medium text-slate-500
                hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800
                transition-colors border
              "
              onClick={() => {
                clearError();
                setIsClientOpen(false);
                resetForm();
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
          onInteractOutside={(e) => {
            // Prevent closing when clicking outside
            e.preventDefault();
          }}
        >
          <DialogHeader>
            <DialogTitle>Add Vehicle</DialogTitle>
          </DialogHeader>

          <div className="py-4">
            <p className="text-lg text-slate-700 dark:text-slate-300">
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
              className="
                rounded-xl px-5 py-2.5 text-sm font-medium text-slate-500
                hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800
                transition-colors border
              "
              onClick={handleVehicleCancel}
            >
              No, Skip
            </button>
            <button
              type="button"
              onClick={handleVehicleConfirm}
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
