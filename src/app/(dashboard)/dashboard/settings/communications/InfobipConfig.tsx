"use client";
import {
  createInfobipConfig,
  getInfobipConfig,
} from "@/actions/communication/client/createInfobipConfig";
import { useServerGet } from "@/hooks/useServerGet";
import React from "react";

type Props = {};

const InfobipConfig = (props: Props) => {
  const [phone, setPhone] = React.useState("");
  const { data } = useServerGet(getInfobipConfig);
  return (
    <div>
      <h2 className="mb-2 text-xl font-semibold">
        Infobip Credentials ( For SMS & Call )
      </h2>
      <div className="space-y-3 rounded-sm border">
        {/* TODO: future added */}
        <input
          type="text"
          placeholder="Phone Number"
          className="border p-2 rounded-md w-full"
          onChange={(e) => setPhone(e.target.value)}
          value={data?.data?.phoneNumber || phone}
        />
        <br />
        <button
          onClick={() => {
            createInfobipConfig({ phoneNumber: phone });
          }}
          className="bg-blue-500 text-white px-4 py-2 rounded-md"
        >
          Save
        </button>
      </div>
    </div>
  );
};

export default InfobipConfig;
