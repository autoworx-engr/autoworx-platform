"use client";
import { createLeaveRequest } from "@/actions/settings/my-account/leave-requests/createLeaveRequest";
import { editMyAccountInfo } from "@/actions/settings/myAccount";
import Setup2FA from "@/app/(dashboard)/dashboard/settings/my-account/setup-2fa";
import PhoneInput from "@/components/PhoneInput";
import { SlimInput } from "@/components/SlimInput";
import { SlimTextarea } from "@/components/SlimTextarea";
import { errorToast, successToast } from "@/lib/toast";
import { User } from "@prisma/client";
import { Loader2 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { ChangePassword } from "./changePassword";

const MyAccount = ({ user }: { user: User }) => {
  const [profilePic, setProfilePic] = useState<File | null>(null);
  const profilePicRef = useRef<HTMLInputElement>(null);
  // Memoised object-URL — created once per File selection, revoked on change
  const [profilePicUrl, setProfilePicUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!profilePic) {
      setProfilePicUrl(null);
      return;
    }
    const url = URL.createObjectURL(profilePic);
    setProfilePicUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [profilePic]);

  const [userInfo, setUserInfo] = useState({
    firstName: user?.firstName || "",
    lastName: user?.lastName || "",
    email: user?.email || "",
    image: user?.image || "",
    phone: user?.phone || "",
    address: user?.address || "",
    city: user?.city || "",
    state: user?.state || "",
    zip: user?.zip || "",
    countryCode: user?.countryCode || "",
  });

  const handlePhoneChange = (num: string, code: string, isoCode: string) => {
    const fullPhoneNumber = `${code}${num}`;

    setUserInfo((prev) => ({
      ...prev,
      phone: fullPhoneNumber,
      countryCode: isoCode || "",
    }));
  };

  // Handle zip code change with number validation
  const handleZipChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Only allow numbers
    if (value === "" || /^\d+$/.test(value)) {
      setUserInfo({
        ...userInfo,
        zip: value,
      });
    }
  };

  const isUserInfoChanged =
    JSON.stringify(userInfo) !==
      JSON.stringify({
        firstName: user?.firstName || "",
        lastName: user?.lastName || "",
        email: user?.email || "",
        image: user?.image || "",
        phone: user?.phone || "",
        address: user?.address || "",
        city: user?.city || "",
        state: user?.state || "",
        zip: user?.zip || "",
        countryCode: user?.countryCode || "",
      }) || !!profilePic;

  const [pending, startTransition] = useTransition();

  // leave request
  const [leaveRequest, setLeaveRequest] = useState({
    title: "",
    startDate: "",
    endDate: "",
    description: "",
  });

  const handleSubmitLeaveRequest = async () => {
    if (
      leaveRequest.title === "" ||
      leaveRequest.startDate === "" ||
      leaveRequest.endDate === "" ||
      leaveRequest.description === ""
    ) {
      errorToast("All fields are required");

      return;
    }
    let res = await createLeaveRequest(leaveRequest);
    if (!res.success) {
      errorToast(res?.message);
      return;
    }
    if (res.success) {
      setLeaveRequest({
        title: "",
        startDate: "",
        endDate: "",
        description: "",
      });
      successToast(res.message);
    }
  };

  const uploadProfilePic = async function () {
    if (profilePic) {
      const formData = new FormData();
      formData.append("file", profilePic);

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        return;
      }

      const json = await res.json();
      return json.data[0];
    }
  };

  const handleUserInfoSave = async () => {
    let imageUrl: string | undefined;
    if (profilePic) {
      imageUrl = await uploadProfilePic();
      if (!imageUrl) {
        errorToast("Profile picture upload failed. Please try again.");
        return;
      }
    }
    const result = await editMyAccountInfo({
      ...userInfo,
      image: imageUrl, // undefined → Prisma skips the field, preserving the existing image
      countryCode: userInfo.countryCode,
    });
    if (result?.type === "success") {
      if (imageUrl) setUserInfo((prev) => ({ ...prev, image: imageUrl! }));
      successToast("Account details updated successfully");
    } else if (result?.type === "globalError") {
      errorToast(
        result.errorSource && result.errorSource.length > 0
          ? result.errorSource[0].message
          : result.message,
      );
    }
  };

  return (
    <div className="w-full pb-8">
      <div className="grid gap-8 lg:grid-cols-2">
        {/* account detail */}
        <div className="flex flex-col">
          <h3 className="mb-4 text-lg font-semibold text-slate-800">
            Account Details
          </h3>
          <div className="space-y-8 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            {/* profile picture */}
            <input
              ref={profilePicRef}
              type="file"
              hidden
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  setProfilePic(file);
                }
              }}
            />
            <div className="flex items-center gap-x-8">
              <div
                onClick={() => {
                  profilePicRef.current?.click();
                }}
                className="relative mr-4 flex aspect-square h-[80px] cursor-pointer items-center justify-center rounded-full bg-violet-400/20 2xl:h-[150px]"
              >
                <Image
                  src={
                    profilePicUrl ?? (userInfo?.image || "/images/default.png")
                  }
                  alt="Profile picture"
                  className="h-full w-full shrink-0 rounded-full object-cover"
                  width={80}
                  height={80}
                />
                <Image
                  src="/icons/upArrow.png"
                  alt="Change profile picture"
                  className="absolute bottom-2 right-2"
                  width={30}
                  height={30}
                />
              </div>
              <div>
                <p className="font-semibold text-slate-700">Profile Picture</p>
                <p className="mt-1 text-sm text-slate-500">
                  Optimal Size of image size is 512x512px (&#60;2.5 MB)
                </p>
              </div>
            </div>
            <div className="space-y-4">
              {/* name */}
              <div className="grid grid-cols-1 gap-x-8 sm:grid-cols-2">
                <SlimInput
                  name="firstName"
                  value={userInfo?.firstName}
                  required={true}
                  onChange={(e) => {
                    setUserInfo({
                      ...userInfo,
                      [e.target.name]: e.target.value,
                    });
                  }}
                />
                <SlimInput
                  name="lastName"
                  value={userInfo?.lastName || ""}
                  onChange={(e) => {
                    setUserInfo({
                      ...userInfo,
                      [e.target.name]: e.target.value,
                    });
                  }}
                />
              </div>
              {/* email and phone number */}
              <div className="grid grid-cols-1 gap-x-8 sm:grid-cols-2">
                <SlimInput
                  name="email"
                  value={userInfo?.email}
                  required={true}
                  onChange={(e) => {
                    setUserInfo({
                      ...userInfo,
                      [e.target.name]: e.target.value,
                    });
                  }}
                  readOnly
                />

                <PhoneInput
                  defaultValue={user?.phone || ""}
                  defaultIsoCode={user?.countryCode!}
                  required={true}
                  // value={userInfo.phone}

                  onChange={handlePhoneChange}
                  label="Phone"
                />
              </div>
              {/* address */}
              <div className="grid grid-cols-1">
                <SlimInput
                  name="address"
                  value={userInfo?.address || ""}
                  onChange={(e) => {
                    setUserInfo({
                      ...userInfo,
                      [e.target.name]: e.target.value,
                    });
                  }}
                  placeholder="Address"
                />
              </div>
              <div className="grid grid-cols-2 gap-x-8 gap-y-3 sm:grid-cols-3">
                <SlimInput
                  name="city"
                  value={userInfo?.city || ""}
                  onChange={(e) => {
                    setUserInfo({
                      ...userInfo,
                      [e.target.name]: e.target.value,
                    });
                  }}
                  placeholder="City"
                />
                <SlimInput
                  name="state"
                  value={userInfo?.state || ""}
                  onChange={(e) => {
                    setUserInfo({
                      ...userInfo,
                      [e.target.name]: e.target.value,
                    });
                  }}
                  placeholder="State"
                />
                <SlimInput
                  name="zip"
                  value={userInfo?.zip || ""}
                  onChange={handleZipChange}
                  placeholder="Zip Code"
                />
              </div>
              <div className="mt-8 flex justify-end border-t border-slate-100 pt-6">
                <button
                  disabled={pending || !isUserInfoChanged}
                  onClick={() => startTransition(handleUserInfoSave)}
                  className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-[#5864e5] disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500"
                >
                  {pending && <Loader2 className="h-4 w-4 animate-spin" />}
                  {pending ? "Saving…" : "Save Changes"}
                </button>
              </div>
            </div>
          </div>
        </div>
        {/* right column */}
        <div className="flex min-w-0 flex-col gap-y-8 overflow-hidden">
          <div className="w-full">
            <ChangePassword />
          </div>
          <>
            {/* employee leave request */}
            {/* except Admin, everyone can create leave request */}
            {user.employeeType !== "Admin" && (
              <div className="w-full">
                <h3 className="mb-4 text-lg font-semibold text-slate-800">
                  Leave Requests
                </h3>

                <div className="space-y-5 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                  <div className="">
                    <SlimInput
                      name="title"
                      value={leaveRequest.title}
                      onChange={(e) =>
                        setLeaveRequest({
                          ...leaveRequest,
                          title: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-x-8">
                    <SlimInput
                      name="startDate"
                      value={leaveRequest.startDate}
                      onChange={(e) =>
                        setLeaveRequest({
                          ...leaveRequest,
                          startDate: e.target.value,
                        })
                      }
                      type="date"
                    />
                    <SlimInput
                      name="endDate"
                      value={leaveRequest.endDate}
                      onChange={(e) =>
                        setLeaveRequest({
                          ...leaveRequest,
                          endDate: e.target.value,
                        })
                      }
                      type="date"
                    />
                  </div>

                  <SlimTextarea
                    name="description"
                    label="Description"
                    value={leaveRequest.description}
                    onChange={(e) =>
                      setLeaveRequest({
                        ...leaveRequest,
                        description: e.target.value,
                      })
                    }
                  />
                  <div className="mt-6 flex items-center justify-end gap-x-4 border-t border-slate-100 pt-5">
                    <Link
                      href="/dashboard/settings/my-account/leave-requests"
                      className="rounded-lg border border-slate-300 bg-white px-5 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
                    >
                      View All Requests
                    </Link>
                    <button
                      onClick={handleSubmitLeaveRequest}
                      className="rounded-lg bg-primary px-5 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-[#5864e5]"
                    >
                      Submit Request
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        </div>
        {/* 2fa section */}
        <Setup2FA
          email={user.email}
          emailVerified={user.emailVerified ?? false}
          twoFactorEnabled={user.twoFactorEnabled ?? false}
        />
      </div>
    </div>
    // </div>
  );
};

export default MyAccount;
