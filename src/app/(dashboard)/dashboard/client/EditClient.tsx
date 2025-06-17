"use client";

import { editClient } from "@/actions/client/edit";
import { deleteSource } from "@/actions/source/deleteSource";
import { getSources } from "@/actions/source/getSources";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogTrigger,
} from "@/components/Dialog";
import FormError from "@/components/FormError";
import NewClientSource from "@/components/Lists/NewClientSource";
import SelectClientSource from "@/components/Lists/SelectClientSource";
import { SelectClientTags } from "@/components/Lists/SelectClientTags";
import { SlimInput } from "@/components/SlimInput";
import Submit from "@/components/Submit";
import { DEFAULT_IMAGE_URL } from "@/lib/consts";
import { useFormErrorStore } from "@/stores/form-error";
import { Client, Source, Tag } from "@prisma/client";
import { useEffect, useState, useTransition } from "react";
import { FaTimes } from "react-icons/fa";
import { FaPen, FaPenToSquare } from "react-icons/fa6";
import { IoMdSettings } from "react-icons/io";
import { RxAvatar } from "react-icons/rx";
import { RotatingLines } from "react-loader-spinner";

export default function EditCustomer({
  client,
  settingIcon = false,
}: {
  client: Client & {
    tag: Tag | null;
    source: Source | null;
  };
  settingIcon?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [clientSource, setClientSource] = useState<Source | null>(
    client.source,
  );
  const [pending, startTransition] = useTransition();

  const [openClientSource, setOpenClientSource] = useState(false);
  const [tagOpenDropdown, setTagOpenDropdown] = useState(false);
  const [tag, setTag] = useState<Tag | undefined>(client.tag!);
  const [profilePic, setProfilePic] = useState<string | null>(
    client.photo !== DEFAULT_IMAGE_URL ? client.photo : null,
  );
  const [newProfilePic, setNewProfilePic] = useState<File | null>(null);
  const [clientSources, setClientSources] = useState<Source[]>([]);
  const { showError, clearError } = useFormErrorStore();

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
    const mobile = document.querySelector<HTMLInputElement>("#mobile")?.value;
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
      customerCompany,
      address,
      city,
      state,
      zip,
      tagId: tag?.id,
      sourceId: clientSource?.id,
      photo,
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
      clearError();
      setOpen(false);
    }
  }

  useEffect(() => {
    getClientSources();
  }, []);

  const handleClose = () => {
    clearError(); // ✅ Reset form errors when closing
    // setProfilePic(null); // ✅ Reset profile picture
    setOpen(false);
  };

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(isOpen) => {
          if (!isOpen) handleClose();
          setOpen(isOpen);
        }}
      >
        <DialogTrigger asChild>
          <button
            className={`${settingIcon ? "text-gray-600" : ""} text-[#6571FF]"`}
          >
            {settingIcon ? <IoMdSettings /> : <FaPenToSquare />}
          </button>
        </DialogTrigger>

        <DialogContent className="max-h-full max-w-xl grid-rows-[auto,1fr,auto]">
          <div className="mt-8 flex items-center justify-between">
            <h1 className="text-2xl font-bold">Edit Client</h1>

            {newProfilePic || profilePic ? (
              <label
                className="relative cursor-pointer"
                htmlFor="profilePicture"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={
                    newProfilePic
                      ? URL.createObjectURL(newProfilePic)
                      : profilePic || ""
                  }
                  alt="profile"
                  className="h-20 w-20 rounded-full border border-slate-400 hover:border-dashed hover:opacity-80"
                />
                <span className="absolute bottom-0 left-2 text-lg text-[#6571FF]">
                  <FaPen />
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
                </span>
                <RxAvatar size={48} />
              </label>
            )}
          </div>

          <FormError />

          <div className="space-y-2 overflow-y-auto">
            <div className="flex items-center justify-between gap-2">
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
                required={false}
                defaultValue={client.lastName!}
              />
            </div>

            <div className="flex items-center justify-between gap-2">
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
              <SlimInput
                name="mobile"
                label="Mobile"
                required={false}
                defaultValue={client.mobile!}
                onChange={(e) => {
                  const value = e.target.value;
                  // Allow only numeric values
                  if (!/^\+?\d*$/.test(value)) {
                    showError({
                      field: "mobile",
                      message:
                        "Invalid phone number format. Only numbers are allowed.",
                    });
                  } else {
                    clearError();
                  }
                }}
              />
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
              <SlimInput
                name="city"
                required={false}
                defaultValue={client.city!}
              />
              <SlimInput
                name="state"
                required={false}
                defaultValue={client.state!}
              />
              <SlimInput
                name="zip"
                required={false}
                defaultValue={client.zip!}
              />
            </div>

            <div className="flex items-center justify-between gap-x-4">
              <SlimInput
                name="customerCompany"
                required={false}
                defaultValue={client.customerCompany!}
                label="Company"
              />

              <div className="w-full">
                <p className="mb-1 font-medium">Client Source</p>
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
                          <FaTimes />
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
                        .includes(search.toLowerCase()),
                    );
                  }}
                  openState={[openClientSource, setOpenClientSource]}
                />
              </div>
            </div>
            <div className="">
              {/* BUG: when making the root `form`, this dropdown doesn't work */}
              <p className="mb-1 font-medium">Tag</p>
              <SelectClientTags
                value={tag}
                setValue={setTag}
                open={tagOpenDropdown}
                setOpen={setTagOpenDropdown}
              />
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
                  <RotatingLines
                    strokeColor="#fff"
                    strokeWidth="5"
                    width="25"
                  />
                </div>
              ) : (
                "Update"
              )}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
