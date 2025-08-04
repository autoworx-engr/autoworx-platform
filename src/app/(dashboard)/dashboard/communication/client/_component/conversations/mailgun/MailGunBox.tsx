"use client";
import React, { useEffect, useRef } from "react";
import MailGunConversation from "./MailgunConversation";
import { MailgunEmail, MailgunEmailAttachment } from "@prisma/client";

type TProps = {
  conversations?: (MailgunEmail & { attachments: MailgunEmailAttachment[] })[];
  clientId: number;
};

export default function MaiGunBox({ conversations = [], clientId }: TProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight + 100;
    }
  }, [conversations]);

  return (
    <div
      ref={containerRef}
      className="h-full w-full thin-scrollbar overflow-y-scroll"
    >
      <MailGunConversation messages={conversations} />
    </div>
  );
}
