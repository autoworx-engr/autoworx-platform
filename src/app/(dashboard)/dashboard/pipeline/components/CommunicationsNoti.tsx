"use client";
import { actionTypes } from "@/constants/lead.constant";
import { useColumnDispatch } from "@/context/sales-pipeline.context";
// import { getClientMessageCount } from "@/actions/pipelines/getClinetMessageCount";
import { pusher } from "@/lib/pusher/client";
import { LeadWithSalesUser } from "@/types/invoiceLead";
import { MessageCircleMore } from "lucide-react";
import Link from "next/link";
import React, { useEffect, useState } from "react";

type TProps = {
  lead: LeadWithSalesUser;
};

export default function CommunicationsNoti({ lead }: TProps) {
  const [totalClientMessage, setTotalClientMessage] = useState(
    lead.totalMessage ?? 0,
  );

  const dispatch = useColumnDispatch();

  useEffect(() => {
    const clientId = lead?.client?.id;
    pusher
      .subscribe(`message-${clientId}`)
      .bind(
        "client",
        (data: { count: number; updatedColumnId: number | null }) => {
          setTotalClientMessage(data.count);

          if (data?.updatedColumnId && data.updatedColumnId !== lead.columnId) {
            dispatch({
              type: actionTypes.AUTOMATION_TRIGGER,
              payload: {
                updatedLead: { id: lead.id, columnId: data.updatedColumnId },
                previousColumnId: lead.columnId,
              },
            });
          }
        },
      );
    return () => {
      pusher.unbind(`client`);
    };
  }, []);

  const isShowTaskCount = (totalClientMessage ?? 0) > 0;
  return (
    <Link
      href={`/dashboard/communication/client/${lead?.client?.id}?source=lead&chat=true`}
      className="group relative"
      onClick={() => {
        setTotalClientMessage(0); // Reset the count when clicked
      }}
      prefetch={false}
    >
      <div className="relative">
        <MessageCircleMore size={20} color="#66738C" />
        {isShowTaskCount && (
          <span className="absolute left-[0.8rem] top-[-0.5rem] flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-400 px-1 text-[10px] text-white">
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
