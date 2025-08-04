"use client";
import { cn } from "@/lib/cn";
import Image from "next/image";
import React from "react";
import { makeLinksClickable } from "@/components/MakeLinkClickable";
import SMSAttachment from "./SMSAttachment";

type TProps = {
  message: any;
};

export default function SmsMessage({ message }: TProps) {
  const handleDownload = (fileUrl: string) => {
    window.open(fileUrl, "_blank");
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  return (
    <div
      className={`flex w-full items-center p-1 ${message.sentBy !== "Company" ? "justify-start" : "justify-end"}`}
    >
      <div className="flex w-full items-start gap-2 p-1">
        {message.sentBy !== "Company" && (
          <Image
            src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQNL_ZnOTpXSvhf1UaK7beHey2BX42U6solRA&s"
            alt="user"
            width={30}
            height={30}
            className="rounded-full"
          />
        )}

        <p
          className={cn(
            "max-w-[90%] break-words rounded-xl p-2 text-[14px]",
            message.sentBy !== "Company" ? "" : "ml-auto",
          )}
        >
          {message.message.trim() && (
            <p
              className={`inline-block max-w-full ${message.sentBy !== "Company" ? "bg-[#D9D9D9] text-slate-800" : "float-right bg-[#006D77] text-white"} rounded-xl px-2 py-2`}
            >
              {makeLinksClickable(message.message)}
            </p>
          )}

          <SMSAttachment message={message} handleDownload={handleDownload} />
          {/* Time below the message */}
          <p
            className={`mt-2 text-[10px] text-gray-400 ${message.sentBy !== "Company" ? "" : "text-right"}`}
          >
            {" "}
            {formatTime(message.createdAt)}
          </p>
        </p>
      </div>
    </div>
  );
}
