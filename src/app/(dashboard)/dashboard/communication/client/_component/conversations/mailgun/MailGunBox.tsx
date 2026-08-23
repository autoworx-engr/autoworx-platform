"use client";
import React from "react";
import MailGunConversation from "./MailgunConversation";
import { MailgunEmail, MailgunEmailAttachment } from "@prisma/client";

type TProps = {
  conversations?: (MailgunEmail & {
    attachments: MailgunEmailAttachment[];
    user?: {
      firstName: string;
      lastName: string | null;
    } | null;
  })[];
  clientId: number;
  clientPhoto?: string | null;
};

export default function MaiGunBox({
  conversations = [],
  clientId,
  clientPhoto,
}: TProps) {
  return (
    <div className="h-full w-full">
      <MailGunConversation messages={conversations} clientPhoto={clientPhoto} />
    </div>
  );
}
