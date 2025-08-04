"use client";

import { createTwilioCredentials } from "@/actions/communication/client/createTwilioCredentials";
import { getTwilioCredentials } from "@/actions/communication/client/sendMessage";
import { useServerGet } from "@/hooks/useServerGet";
import { errorToast, successToast } from "@/lib/toast";
import React, { ChangeEvent, FormEvent, useEffect, useState } from "react";

type FormData = {
  accountSid: string;
  phoneNumber: string;
  apiKeySid: string;
  apiKeySecret: string;
  phoneNumberSid: string;
};

const SmsGetwayForm: React.FC = () => {
  const { data: twilioCredentials } = useServerGet(getTwilioCredentials);

  const [formData, setFormData] = useState<FormData>({
    accountSid: twilioCredentials?.accountSid ?? "",
    phoneNumber: twilioCredentials?.phoneNumber ?? "",
    apiKeySid: twilioCredentials?.apiKeySid ?? "",
    apiKeySecret: twilioCredentials?.apiKeySecret ?? "",
    phoneNumberSid: twilioCredentials?.phoneNumberSid ?? "",
  });

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    const isPhoneNumberExists = !!twilioCredentials?.phoneNumber;
    const isNumberSidExists = !!twilioCredentials?.phoneNumberSid;
    const isNewApiKeySidEntered = !!formData.phoneNumberSid?.trim();
    const isSidChanged =
      isNewApiKeySidEntered &&
      twilioCredentials?.phoneNumberSid !== formData.phoneNumberSid;

    // if (isPhoneNumberExists && isNumberSidExists && isSidChanged) {
    //   errorToast("You cannot change the existing phone number SID!");

    //   setFormData({
    //     accountSid: formData?.accountSid ?? "",
    //     authToken: formData?.authToken ?? "",
    //     phoneNumber: formData?.phoneNumber ?? "",
    //     apiKeySid: formData?.apiKeySid ?? "",
    //     apiKeySecret: formData?.apiKeySecret ?? "",
    //     phoneNumberSid: twilioCredentials?.phoneNumberSid ?? "",
    //   });

    //   return;
    // }

    try {
      //   call api
      // console.log("formData........................", formData);
      let res = await createTwilioCredentials(formData);

      console.log("response from twiloo", res);
      if (res.success) {
        successToast("Twilio Credentials Updated Successfully");
      } else {
        errorToast("Failed To Update ");
      }
      // setFormData({
      //   accountSid: "",
      //   authToken: "",
      //   phoneNumber: "",
      //   apiKeySid: "",
      //   apiKeySecret: "",
      //   phoneNumberSid: "",
      // });
    } catch (error) {
      console.error("Error:", error);
    }
  };
  useEffect(() => {
    setFormData({
      accountSid: twilioCredentials?.accountSid ?? "",
      phoneNumber: twilioCredentials?.phoneNumber ?? "",
      apiKeySid: twilioCredentials?.apiKeySid ?? "",
      apiKeySecret: twilioCredentials?.apiKeySecret ?? "",
      phoneNumberSid: twilioCredentials?.phoneNumberSid ?? "",
    });
  }, [twilioCredentials]);

  const isSubmitDisabled =
    !formData.accountSid.trim() ||
    // !formData?.authToken.trim() ||
    !formData.phoneNumber.trim() ||
    !formData.apiKeySid.trim() ||
    !formData.apiKeySecret.trim() ||
    !formData.phoneNumberSid.trim();
  return (
    <div className="flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-lg rounded-lg bg-background p-10 shadow-lg">
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label
              htmlFor="account_sid"
              className="block text-sm font-medium text-gray-700"
            >
              Account SID <span className="text-red-500"> *</span>
            </label>
            <input
              type="text"
              id="account_sid"
              name="accountSid"
              value={formData.accountSid}
              onChange={handleChange}
              required
              className="mt-1 block w-full rounded-md border border-gray-300 p-2 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            />
          </div>

          {/* Auth Token */}
          {/* <div className="mb-4">
            <label
              htmlFor="auth_token"
              className="block text-sm font-medium text-gray-700"
            >
              Auth Token <span className="text-red-500"> *</span>
            </label>
            <input
              type="password"
              id="auth_token"
              name="authToken"
              onChange={handleChange}
              value={formData.authToken}
              required
              className="mt-1 block w-full rounded-md border border-gray-300 p-2 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            />
          </div> */}

          {/* Phone Number */}
          <div className="mb-4">
            <label
              htmlFor="phone_number"
              className="block text-sm font-medium text-gray-700"
            >
              Phone Number <span className="text-red-500"> *</span>
            </label>
            <input
              type="text"
              id="phone_number"
              name="phoneNumber"
              onChange={handleChange}
              value={formData.phoneNumber}
              required
              className="mt-1 block w-full rounded-md border border-gray-300 p-2 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            />
          </div>

          {/* Phone Number SID*/}
          <div className="mb-4">
            <label
              htmlFor="phoneNumberSid"
              className="block text-sm font-medium text-gray-700"
            >
              Phone Number SID <span className="text-red-500"> *</span>
            </label>
            <input
              type="text"
              id="phoneNumberSid"
              name="phoneNumberSid"
              onChange={handleChange}
              value={formData.phoneNumberSid}
              required
              className="mt-1 block w-full rounded-md border border-gray-300 p-2 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            />
          </div>

          {/* API Key SID */}
          <div className="mb-4">
            <label
              htmlFor="api_key_sid"
              className="block text-sm font-medium text-gray-700"
            >
              API Key SID <span className="text-red-500"> *</span>
            </label>
            <input
              type="text"
              id="api_key_sid"
              name="apiKeySid"
              onChange={handleChange}
              value={formData.apiKeySid}
              required
              className="mt-1 block w-full rounded-md border border-gray-300 p-2 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            />
          </div>

          {/* API Key Secret */}
          <div className="mb-4">
            <label
              htmlFor="api_key_secret"
              className="block text-sm font-medium text-gray-700"
            >
              API Key Secret <span className="text-red-500"> *</span>
            </label>
            <input
              type="password"
              id="api_key_secret"
              name="apiKeySecret"
              onChange={handleChange}
              value={formData.apiKeySecret}
              required
              className="mt-1 block w-full rounded-md border border-gray-300 p-2 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            />
          </div>

          {/* <div className="mb-6">
            <label
              htmlFor="twiml_app_sid"
              className="block text-sm font-medium text-gray-700"
            >
              TwiML App SID
            </label>
            <input
              type="text"
              id="twiml_app_sid"
              name="twimlAppSid"
              onChange={handleChange}
              value={formData.twimlAppSid}
              className="mt-1 block w-full rounded-md border border-gray-300 p-2 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            />
          </div> */}

          <div className="flex justify-end">
            <button
              disabled={isSubmitDisabled}
              type="submit"
              className={`CO rounded-md px-10 py-1.5 text-white focus:outline-none focus:ring-2 focus:ring-offset-2 ${isSubmitDisabled ? "cursor-not-allowed bg-gray-400" : "bg-[#6571FF] hover:bg-indigo-600 focus:ring-blue-500"} `}
            >
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SmsGetwayForm;
