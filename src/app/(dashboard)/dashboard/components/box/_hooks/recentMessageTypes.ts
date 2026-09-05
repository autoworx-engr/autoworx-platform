import { FullMessage } from "@/actions/dashboard/technician/recentMessages";
import { Client, MailgunEmail } from "@prisma/client";

export type TClientMessage = Client & {
  MailgunEmail: (MailgunEmail & { client: Client })[];
  isSeen: boolean;
};

export type TInternalMessage = FullMessage & { isSeen: boolean };
