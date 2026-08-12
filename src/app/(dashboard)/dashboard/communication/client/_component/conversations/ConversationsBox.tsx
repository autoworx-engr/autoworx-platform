import Image from "next/image";
import ChatHead from "../conversations/ChatHead";
import MailGunEmail from "../conversations/mailgun/MailgunEmail";
import SMS from "./sms/SMS";
import Messenger from "./messenger/Messenger";
import Instagram from "./instagram/Instagram";
import { getClientById } from "../../_actions/getClientById";
import Phone from "../phone/Phone";
import DetailsBtn from "./DetailsBtn";
import BackDetailsBtn from "./BackDetailsBtn";
import { getCompanyId } from "@/lib/companyId";
import { cn } from "@/lib/cn";
import { Star } from "lucide-react";

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
    case "INSTAGRAM":
      MessageBox = <Instagram clientId={clientId} />;
      break;
    case "EMAIL":
      MessageBox = <MailGunEmail clientId={clientId} />;
    default:
      MessageBox = <MailGunEmail clientId={clientId} />;
      break;
  }

  const showChatClass =
    showChat === "true" && showDetails !== "true" ? "" : "hidden xl:block";

  if (!client) return null;

  return (
    <div
      className={cn(
        "app-shadow relative rounded-lg bg-background",
        "h-[calc(100dvh-56px)] lg:h-[90vh]",
        "ring-1 ring-zinc-200/60 dark:ring-white/10",
        showChatClass,
      )}
    >
      {/* Column layout */}
      <div className="flex h-full flex-col overflow-hidden">
        {/* Chat Header */}
        <div
          className={cn(
            "sticky top-0 z-10 flex h-16 items-center justify-between gap-2 px-2 md:px-3",
            // modern teal gradient + subtle blur over scroll
            "bg-gradient-to-r from-[#006D77] to-[#008c99]",
            "ring-1 ring-teal-500/60 text-white",
            "md:rounded-t-md backdrop-blur supports-[backdrop-filter]:bg-[#006D77]/90",
          )}
        >
          {/* Left: identity */}
          <div className="flex min-w-0 items-center">
            <div className="block pr-2 lg:hidden">
              <BackDetailsBtn />
            </div>

            <Image
              src={
                client?.photo?.includes("autoworx-production")
                  ? client.photo
                  : "/images/default.png"
              }
              alt="client"
              width={48}
              height={48}
              className="size-12 rounded-full object-cover ring-2 ring-white/70"
            />

            <div className="ml-3 flex min-w-0 flex-1 flex-col">
              <p className="min-w-0 truncate text-sm font-semibold leading-5">
                {client?.firstName} {client?.lastName}
              </p>

              <div className="flex items-center gap-2">
                <p className="truncate text-[11px] opacity-90">
                  {client?.customerCompany}
                </p>
                {client?.isStarred && (
                  <span
                    className="mt-0.5 inline-flex w-fit shrink-0 items-center rounded-full bg-white/15 px-1.5 py-0.5 text-[10px] leading-none text-yellow-300 ring-1 ring-white/30"
                    title="Favorite client"
                  >
                    <Star className="mr-0.5 w-2.5 h-2.5 fill-yellow-400" />
                    Starred
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Right: actions */}
          <div className="flex items-center gap-2">
            <ChatHead
              client={client}
              companyId={companyId}
              selectedConversation={selectedConversation}
            />
            <div className="block xl:hidden">
              <DetailsBtn />
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-hidden">
          {MessageBox}
          {/* If you have an empty state, you can drop it in here conditionally */}
        </div>

        {/* composer stays outside; your composer component mounts below this container */}
      </div>
    </div>
  );
}
