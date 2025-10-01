"use client";
import { useState } from "react";
import SmsGetwayForm from "./SmsGetwayForm";
import InfobipConfig from "./InfobipConfig";

export default function SmsGatewayButton({
  smsGateway,
}: {
  smsGateway?: string | null;
}) {
  const [selected, setSelected] = useState(smsGateway || "TWILIO");

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
              ? "bg-[#6571FF] text-white"
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
              ? "bg-[#6571FF] text-white"
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
