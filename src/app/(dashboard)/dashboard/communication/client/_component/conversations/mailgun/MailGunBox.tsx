"use client";
import React from "react";
import MailGunConversation from "./MailgunConversation";
import { MailgunEmail, MailgunEmailAttachment } from "@prisma/client";

type TProps = {
  conversations?: (MailgunEmail & { attachments: MailgunEmailAttachment[] })[];
  clientId: number;
};

export default function MaiGunBox({ conversations = [], clientId }: TProps) {
  return (
    <div className="h-full w-full">
      <MailGunConversation messages={conversations} />
    </div>
  );
}
