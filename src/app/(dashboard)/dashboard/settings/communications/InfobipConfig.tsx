"use client";
import {
  createInfobipConfig,
  getInfobipConfigById,
} from "@/actions/communication/client/createInfobipConfig";
import { useServerGet } from "@/hooks/useServerGet";
import { errorToast, successToast } from "@/lib/toast";
import { useParams } from "next/navigation";
import React, { useEffect } from "react";

type Props = {};

const InfobipConfig = (props: Props) => {
  const [phone, setPhone] = React.useState("");

  const params = useParams<{ id: string }>();
  const { data } = useServerGet(getInfobipConfigById, Number(params.id));

  useEffect(() => {
    if (data?.data?.phoneNumber) {
      setPhone(data.data.phoneNumber);
    }
  }, [data]);

  return (
    <div className="w-full max-w-2xl rounded-lg bg-background p-10 shadow-lg">
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          const res = await createInfobipConfig({
            companyId: Number(params.id),
            phoneNumber: phone,
          });
          if (res?.success) {
            successToast("Infobip Config Created Successfully");
          } else {
            errorToast("Failed to create Infobip Config");
          }
        }}
      >
        <h2 className="mb-6 text-xl font-semibold">
          Infobip Credentials (For SMS & Call)
        </h2>

        {/* Phone Number */}
        <div className="mb-4">
          <label
            htmlFor="phone_number"
            className="block text-sm font-medium text-gray-700"
          >
            Phone Number <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="phone_number"
            name="phoneNumber"
            placeholder="Enter Phone Number"
            onChange={(e) => setPhone(e.target.value)}
            value={phone}
            required
            className="mt-1 block w-full rounded-md border border-gray-300 p-2 shadow-sm
                   focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
          />
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <button
            type="submit"
            className="rounded-md bg-primary px-10 py-1.5 text-white hover:bg-indigo-600
                   focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Save
          </button>
        </div>
      </form>
    </div>
  );
};

export default InfobipConfig;
