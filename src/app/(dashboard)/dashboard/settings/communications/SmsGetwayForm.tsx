"use client";

import { createTwilioCredentials } from "@/actions/communication/client/createTwilioCredentials";
import { getTwilioCredentials } from "@/actions/communication/client/sendTwilioMessage";
import { useServerGet } from "@/hooks/useServerGet";
import { errorToast, successToast } from "@/lib/toast";
import { useSession } from "next-auth/react";
import { useParams } from "next/navigation";
import React, {
  ChangeEvent,
  FormEvent,
  useEffect,
  useMemo,
  useState,
} from "react";

type FormData = {
  companyId: number;
  accountSid: string;
  phoneNumber: string;
  apiKeySid: string;
  apiKeySecret: string;
  phoneNumberSid: string;
  fcmPushCredentialSid?: string;
  apnPushCredentialSid?: string;
};

const SmsGetwayForm: React.FC = () => {
  const { data: session } = useSession();
  const params = useParams<{ id?: string }>();
  const routeCompanyId = params?.id ? Number(params.id) : NaN;
  const companyId = Number.isFinite(routeCompanyId)
    ? routeCompanyId
    : (session?.user?.companyId ?? 0);

  const twilioArg = useMemo(() => ({ companyId }), [companyId]);
  const { data: twilioCredentials } = useServerGet(
    getTwilioCredentials,
    twilioArg,
  );

  const [formData, setFormData] = useState<FormData>({
    companyId,
    accountSid: twilioCredentials?.accountSid ?? "",
    phoneNumber: twilioCredentials?.phoneNumber ?? "",
    apiKeySid: twilioCredentials?.apiKeySid ?? "",
    apiKeySecret: twilioCredentials?.apiKeySecret ?? "",
    phoneNumberSid: twilioCredentials?.phoneNumberSid ?? "",
    fcmPushCredentialSid:
      (twilioCredentials as any)?.fcmPushCredentialSid ?? "",
    apnPushCredentialSid:
      (twilioCredentials as any)?.apnPushCredentialSid ?? "",
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
      const res = await createTwilioCredentials(formData);
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
      companyId,
      accountSid: twilioCredentials?.accountSid ?? "",
      phoneNumber: twilioCredentials?.phoneNumber ?? "",
      apiKeySid: twilioCredentials?.apiKeySid ?? "",
      apiKeySecret: twilioCredentials?.apiKeySecret ?? "",
      phoneNumberSid: twilioCredentials?.phoneNumberSid ?? "",
      fcmPushCredentialSid:
        (twilioCredentials as any)?.fcmPushCredentialSid ?? "",
      apnPushCredentialSid:
        (twilioCredentials as any)?.apnPushCredentialSid ?? "",
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
    // <div className="flex items-center justify-center bg-gray-50">
    <div className="w-full max-w-2xl rounded-lg bg-background p-10 #shadow-lg">
      <h2 className="text-xl font-semibold mb-8">
        Twilio Credentials ( For SMS & Call )
      </h2>
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

        {/* FCM Push Credential SID (optional, per subaccount) */}
        <div className="mb-4">
          <label
            htmlFor="fcmPushCredentialSid"
            className="block text-sm font-medium text-gray-700"
          >
            FCM Push Credential SID (Android)
          </label>
          <input
            type="text"
            id="fcmPushCredentialSid"
            name="fcmPushCredentialSid"
            onChange={handleChange}
            value={formData.fcmPushCredentialSid || ""}
            className="mt-1 block w-full rounded-md border border-gray-300 p-2 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
          />
        </div>

        {/* APN Push Credential SID (optional, per subaccount) */}
        <div className="mb-4">
          <label
            htmlFor="apnPushCredentialSid"
            className="block text-sm font-medium text-gray-700"
          >
            APN Push Credential SID (iOS)
          </label>
          <input
            type="text"
            id="apnPushCredentialSid"
            name="apnPushCredentialSid"
            onChange={handleChange}
            value={formData.apnPushCredentialSid || ""}
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
            className={`CO rounded-md px-10 py-1.5 text-white focus:outline-none focus:ring-2 focus:ring-offset-2 ${isSubmitDisabled ? "cursor-not-allowed bg-gray-400" : "bg-primary hover:bg-indigo-600 focus:ring-blue-500"} `}
          >
            Save
          </button>
        </div>
      </form>
    </div>
    // </div>
  );
};

export default SmsGetwayForm;
