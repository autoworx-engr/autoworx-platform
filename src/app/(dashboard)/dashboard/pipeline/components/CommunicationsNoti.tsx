"use client";
// import { getClientMessageCount } from "@/actions/pipelines/getClinetMessageCount";
import { pusher } from "@/lib/pusher/client";
import { LeadWithSalesUser } from "@/types/invoiceLead";
import Link from "next/link";
import React, { useEffect, useState } from "react";
import { PiWechatLogoLight } from "react-icons/pi";

type TProps = {
  lead: {
    clientId: number;
    totalMessage: number;
  };
};

export default function CommunicationsNoti({ lead }: TProps) {
  const [totalClientMessage, setTotalClientMessage] = useState(
    lead.totalMessage ?? 0,
  );

  useEffect(() => {
    const clientId = lead.clientId;
    pusher
      .subscribe(`message-${clientId}`)
      .bind("client", (data: { count: number }) => {
        // if (data.count > totalClientMessage) {
        setTotalClientMessage(data.count);
        // }
      });
    return () => {
      pusher.unbind(`client`);
    };
  }, []);

  const isShowTaskCount = (totalClientMessage ?? 0) > 0;
  return (
    <Link
      href={`/dashboard/communication/client/${lead?.clientId}?source=lead&chat=true`}
      className="group relative"
      prefetch={false}
    >
      <div className="relative">
        <PiWechatLogoLight size={22} color="#1f2937 " />
        {isShowTaskCount && (
          <span className="absolute left-[0.8rem] top-[-0.5rem] rounded-full bg-red-400 px-1 py-0.5 text-[10px] text-white">
            {totalClientMessage}
          </span>
        )}
      </div>
      <span className="invisible absolute bottom-full left-14 mb-1 w-max -translate-x-1/2 transform whitespace-nowrap rounded-md border-2 border-white bg-[#66738C] px-2 py-1 text-xs text-white shadow-lg transition-opacity group-hover:visible">
        Communications
      </span>
    </Link>
  );
}
