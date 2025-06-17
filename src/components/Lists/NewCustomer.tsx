"use client";

import { addCustomer } from "@/actions/client/add";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogTrigger,
} from "@/components/Dialog";
import FormError from "@/components/FormError";
import SelectClientSource from "@/components/Lists/SelectClientSource";
import { SelectClientTags } from "@/components/Lists/SelectClientTags";
import { SlimInput } from "@/components/SlimInput";
import { useFormErrorStore } from "@/stores/form-error";
import { useListsStore } from "@/stores/lists";
import { Client, Source, Tag } from "@prisma/client";
import { useEffect, useState, useTransition } from "react";
import { FaTimes } from "react-icons/fa";
import { RxAvatar } from "react-icons/rx";
import { deleteSource } from "../../actions/source/deleteSource";
import { getSources } from "../../actions/source/getSources";
import NewClientSource from "./NewClientSource";
import Submit from "../Submit";
import { RotatingLines } from "react-loader-spinner";

export default function NewCustomer({
  buttonElement,
  setClient,
}: {
  buttonElement?: JSX.Element;
  setClient?: React.Dispatch<React.SetStateAction<Client | null>>;
}) {
  const [open, setOpen] = useState(false);
  const [clientSource, setClientSource] = useState<Source | null>(null);
  const [pending, startTransition] = useTransition();
  const [openClientSource, setOpenClientSource] = useState(false);
  const [tagOpenDropdown, setTagOpenDropdown] = useState(false);
  const [tag, setTag] = useState<Tag>();
  const [profilePic, setProfilePic] = useState<File | null>(null);
  const [clientSources, setClientSources] = useState<Source[]>([]);
  const { showError, clearError } = useFormErrorStore();
  const [mobile, setMobile] = useState("+1");
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
    const company =
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
    // if (!email?.trim()) {
    //   showError({
    //     field: "email",
    //     message: "Email is required.",
    //   });
    //   return;
    // }
    // update photo
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
      photo = json.data[0];
    }

    const res = await addCustomer({
      firstName,
      lastName,
      email,
      mobile,
      customerCompany: company,
      address,
      city,
      state,
      zip,
      tagId: tag?.id,
      sourceId: clientSource?.id,
      photo,
    });

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
    }
  }

  useEffect(() => {
    getClientSources();
  }, []);

  const handleClose = () => {
    clearError(); // ✅ Reset form errors when closing
    setProfilePic(null); // ✅ Reset profile picture
    setMobile("+1");
    setOpen(false);
  };

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
          <button className="text-xs text-[#6571FF]">+ Add New Client</button>
        )}
      </DialogTrigger>
      <DialogContent
        className="max-h-full max-w-xl grid-rows-[auto,1fr,auto]"
        // form
      >
        <div className="mt-8 flex items-center justify-between">
          <h1 className="text-2xl font-bold">Add Client</h1>

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
              name="firstName"
              label="First Name"
              required
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
            <SlimInput name="lastName" required={false} />
          </div>

          <div className="flex items-center justify-between gap-x-2">
            <SlimInput
              name="email"
              label="Email"
              // required
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
              value={mobile}
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
            <SlimInput rootClassName="flex-1" name="address" required={false} />
          </div>

          <div className="flex items-center justify-between gap-x-2">
            <SlimInput name="city" required={false} />
            <SlimInput name="state" required={false} />
            <SlimInput name="zip" required={false} />
          </div>

          <div className="flex items-center justify-between gap-x-4">
            <SlimInput
              name="customerCompany"
              required={false}
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
                <RotatingLines strokeColor="#fff" strokeWidth="5" width="25" />
              </div>
            ) : (
              "Add"
            )}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
