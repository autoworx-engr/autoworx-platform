import Image from "next/image";
import ChatHead from "../conversations/ChatHead";
import MailGunEmail from "../conversations/mailgun/MailgunEmail";
import SMS from "./sms/SMS";
import Messenger from "./messenger/Messenger";
import { getClientById } from "../../_actions/getClientById";
import Phone from "../phone/Phone";
import NoClientFound from "../NoClientFound";
import DetailsBtn from "./DetailsBtn";
import BackDetailsBtn from "./BackDetailsBtn";
import { getCompanyId } from "@/lib/companyId";
import { cn } from "@/lib/cn";
import { MoreHorizontal, Star } from "lucide-react";

type TProps = {
  selectedConversation?: string;
  clientId: number;
  showChat: string;
  showDetails: string;
};

export default async function ConversationsBox({
  clientId,
  selectedConversation,
  showChat,
  showDetails,
}: TProps) {
  const client = await getClientById(clientId);
  const companyId = await getCompanyId();
  let MessageBox = null;

  switch (selectedConversation) {
    case "PHONE":
      MessageBox = <Phone clientId={clientId} />;
      break;
    case "SMS":
      MessageBox = <SMS clientId={clientId} />;
      break;
    case "MESSENGER":
      MessageBox = <Messenger clientId={clientId} />;
      break;
    case "EMAIL":
      MessageBox = <MailGunEmail clientId={clientId} />;
    default:
      MessageBox = <MailGunEmail clientId={clientId} />;
      break;
  }

  const showChatClass =
    showChat === "true" && showDetails !== "true" ? "" : "hidden xl:block";

  if (!client) return <NoClientFound />;

  const memberSince = client.createdAt
    ? new Date(client.createdAt).toLocaleDateString("en-US", {
        month: "short",
        year: "numeric",
      })
    : null;

  return (
    <div
      className={cn(
        "app-shadow relative rounded-lg bg-background",
        "h-[calc(100dvh-56px)] lg:h-[90vh]",
        "ring-1 ring-zinc-200/60 dark:ring-white/10",
        showChatClass,
      )}
    >
      <div className="flex h-full flex-col overflow-hidden">
        <div
          className={cn(
            "sticky top-0 z-10 flex items-center justify-between gap-2 px-3 py-3 text-white",
            "bg-gradient-to-r from-[#006D77] to-[#0a8a95]",
            "md:rounded-t-lg ring-1 ring-[#006D77]/40",
          )}
        >
          <div className="flex min-w-0 items-center gap-3">
            <div className="block pr-1 lg:hidden">
              <BackDetailsBtn />
            </div>

            <Image
              src={
                !client?.photo
                  ? "/images/default.png"
                  : client.photo.includes("/images/default.png")
                    ? "/images/default.png"
                    : client.photo
              }
              alt="client"
              width={40}
              height={40}
              className="size-10 rounded-full object-cover ring-2 ring-white/70"
            />

            <div className="ml-1 flex min-w-0 flex-col">
              <p className="flex items-center gap-2 text-sm font-semibold leading-tight">
                <span className="truncate">
                  {client?.firstName} {client?.lastName}
                </span>
                {client?.isStarred && (
                  <Star className="h-3.5 w-3.5 shrink-0 fill-amber-300 text-amber-300" />
                )}
              </p>
              <p className="mt-0.5 truncate text-[11px] text-white/85">
                {client?.customerCompany ? (
                  <>
                    <span>{client.customerCompany}</span>
                    {memberSince && <span> · </span>}
                  </>
                ) : null}
                {memberSince && <span>Client since {memberSince}</span>}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <ChatHead
              client={client}
              companyId={companyId}
              selectedConversation={selectedConversation}
            />
            <button
              type="button"
              aria-label="More"
              className="inline-flex h-8 w-8 items-center justify-center rounded-full text-white/90 hover:bg-white/15"
            >
              <MoreHorizontal className="h-4 w-4" />
            </button>
            <div className="block xl:hidden">
              <DetailsBtn />
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-hidden">{MessageBox}</div>
      </div>
    </div>
  );
}
