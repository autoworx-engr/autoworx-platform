"use client";
import { getSmsGateway } from "@/actions/communication/client/createInfobipConfig";
import { useServerGet } from "@/hooks/useServerGet";
import { useEffect, useState } from "react";
import InfobipConfig from "./InfobipConfig";
import SmsGetwayForm from "./SmsGetwayForm";

export default function SmsGatewayButton() {
  const [selected, setSelected] = useState("TWILIO");

  const { data } = useServerGet(getSmsGateway);

  useEffect(() => {
    if (data) {
      setSelected(data);
    }
  }, [data]);

  return (
    <>
      <div className="flex w-fit rounded-lg border border-gray-300 bg-white shadow-sm overflow-hidden">
        {/* Twilio */}
        <button
          type="button"
          onClick={() => setSelected("TWILIO")}
          className={`px-6 py-2 text-sm font-medium transition-colors
          ${
            selected === "TWILIO"
              ? "bg-primary text-white"
              : "bg-white text-gray-600 hover:bg-gray-100"
          }`}
        >
          Twilio
        </button>

        {/* Infobip */}
        <button
          type="button"
          onClick={() => setSelected("INFOBIP")}
          className={`px-6 py-2 text-sm font-medium transition-colors
          ${
            selected === "INFOBIP"
              ? "bg-primary text-white"
              : "bg-white text-gray-600 hover:bg-gray-100"
          }`}
        >
          Infobip
        </button>
      </div>
      <div className="space-y-6">
        {selected === "TWILIO" && (
          <div className="space-y-3 rounded-sm border">
            <SmsGetwayForm />
          </div>
        )}
        {selected === "INFOBIP" && (
          <div className="space-y-3 rounded-sm border">
            <InfobipConfig />
          </div>
        )}
      </div>
    </>
  );
}
