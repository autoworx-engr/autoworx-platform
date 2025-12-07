"use client";
import { createLeaveRequest } from "@/actions/settings/my-account/leave-requests/createLeaveRequest";
import { editMyAccountInfo } from "@/actions/settings/myAccount";
import { SlimInput } from "@/components/SlimInput";
import { SlimTextarea } from "@/components/SlimTextarea";
import { errorToast, successToast } from "@/lib/toast";
import { User } from "@prisma/client";
import Image from "next/image";
import Link from "next/link";
import { useRef, useState, useTransition } from "react";
import { ChangePassword } from "./changePassword";
import PhoneInput from "@/components/PhoneInput";

const MyAccount = ({ user }: { user: User }) => {
  const [profilePic, setProfilePic] = useState<File | null>(null);
  const profilePicRef = useRef<HTMLInputElement>(null);
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

  const handlePhoneChange = (num: string, code: string, isoCode:string) => {
    
    const fullPhoneNumber = `${code}${num}`; 

    setUserInfo((prev) => ({
      ...prev,
      phone: fullPhoneNumber,
      countryCode: isoCode || ""
    }));
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

  // useEffect(() => {
  //   if (profilePic) uploadProfilePic();
  // }, [profilePic]);

  const handleUserInfoSave = async () => {
    const imageUrl = await uploadProfilePic();
    let result = await editMyAccountInfo({
      ...userInfo,
      image: imageUrl,
      countryCode: userInfo.countryCode,
    });
    setUserInfo({
      ...userInfo,
      image: imageUrl || user?.image,
    });
    if (result?.type === "success") {
      successToast("Account details updated successfully");
    } else if (result?.type === "globalError") {
      errorToast(
        result.errorSource && result.errorSource.length > 0
          ? result.errorSource[0].message
          : result.message
      );
    }
  };

  return (
    <div className="mt-3 pl-1">
      <div className="grid gap-x-8 md:grid-cols-1 lg:grid-cols-2">
        {/* account detail */}
        <div className="#w-1/2">
          <h3 className="my-4 text-lg font-bold">Account Details</h3>
          <div className="space-y-8 rounded-md p-8 shadow-md">
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
                    profilePic
                      ? URL.createObjectURL(profilePic)
                      : userInfo?.image === "/images/default.png"
                        ? "/images/default.png"
                        : userInfo?.image
                  }
                  alt=""
                  className="h-full w-full shrink-0 rounded-full object-cover"
                  width={80}
                  height={80}
                />
                <Image
                  src="/icons/upArrow.png"
                  alt=""
                  className="absolute bottom-2 right-2"
                  width={30}
                  height={30}
                />
              </div>
              <div>
                <p className="font-semibold">Profile Picture</p>
                <p className="text-sm italic">
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
                  onChange={(e) => {
                    setUserInfo({
                      ...userInfo,
                      [e.target.name]: e.target.value,
                    });
                  }}
                  readOnly
                />
                {/* <SlimInput
                  name="phone"
                  value={userInfo?.phone || ""}
                  onChange={(e) => {
                    setUserInfo({
                      ...userInfo,
                      [e.target.name]: e.target.value,
                    });
                  }}
                /> */}

                <PhoneInput
    
    defaultValue={user?.phone || ""} 
     defaultIsoCode={user?.countryCode!}
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
                />
                <SlimInput
                  name="zip"
                  value={userInfo?.zip || ""}
                  onChange={(e) => {
                    setUserInfo({
                      ...userInfo,
                      [e.target.name]: e.target.value,
                    });
                  }}
                />
              </div>
              <div className="text-right">
                <button
                  disabled={pending || !isUserInfoChanged}
                  onClick={() => startTransition(handleUserInfoSave)}
                  className="ml-auto mt-4 rounded-md bg-[#6571FF] px-4 py-1 text-white disabled:bg-gray-400"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
        {/* new password */}
        <div className="#w-1/2">
          <ChangePassword />
          <>
            {/* employee leave request */}
            {/* except Admin, everyone can create leave request */}
            {user.employeeType !== "Admin" && (
              <div className="#w-1/2">
                <h3 className="my-4 text-lg font-bold">Leave Requests</h3>

                <div className="space-y-4 rounded-md p-8 shadow-md">
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
                  <div className="mt-4 flex items-center justify-end gap-x-4">
                    <Link
                      href="/dashboard/settings/my-account/leave-requests"
                      className="rounded-md border border-gray-300 bg-background px-4 py-1 text-[#6571FF]"
                    >
                      View All Request
                    </Link>
                    <button
                      onClick={handleSubmitLeaveRequest}
                      className="rounded-md bg-[#6571FF] px-4 py-1 text-white"
                    >
                      Submit Request
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        </div>
      </div>
    </div>
  );
};

export default MyAccount;
