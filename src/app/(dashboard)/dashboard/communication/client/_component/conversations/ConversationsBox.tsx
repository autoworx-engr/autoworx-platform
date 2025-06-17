import Image from "next/image";
import ChatHead from "../conversations/ChatHead";
import MailGunEmail from "../conversations/mailgun/MailgunEmail";
import SMS from "./sms/SMS";
import { getClientById } from "../../_actions/getClientById";
import { MdOutlineStar } from "react-icons/md";
import Phone from "../phone/Phone";
import NoClientFound from "../NoClientFound";
import { redirect } from "next/navigation";
import DetailsBtn from "./DetailsBtn";
import BackDetailsBtn from "./BackDetailsBtn";

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

  let MessageBox = null;

  switch (selectedConversation) {
    case "PHONE":
      MessageBox = <Phone clientId={clientId} />;
      break;
    case "SMS":
      MessageBox = <SMS clientId={clientId} />;
      break;
    case "EMAIL":
      MessageBox = <MailGunEmail clientId={clientId} />;
    default:
      MessageBox = <MailGunEmail clientId={clientId} />;
      break;
  }

  const showChatClass =
    showChat === "true" && showDetails !== "true" ? "" : "hidden lg:block";

  if (!client) return <NoClientFound />;

  return (
    <div
      className={`app-shadow relative h-[calc(100vh-56px)] rounded-lg bg-background lg:h-[90vh] ${showChatClass}`}
    >
      {/* Header */}
      {/* <h2 className="hidden h-[10%] rounded-t-lg p-3 text-[14px] text-[#797979] lg:block 2xl:h-[5%]">
        Client Message
      </h2> */}

      {/* Chat Header */}
      <div className="flex h-16 items-center justify-between gap-2 bg-[#006D77] px-2 text-white md:rounded-t-md md:p-2 lg:h-[8%] 2xl:h-[10%]">
        <div className="flex items-center">
          <div className="block pr-2 lg:hidden">
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
            width={50}
            height={50}
            className="size-[50px] rounded-full"
          />
          <div className="ml-4 flex flex-col">
            <p className="flex items-center gap-x-2 text-[14px] font-bold">
              <span>
                {client?.firstName} {client?.lastName}
              </span>
              <span>
                {" "}
                {client?.isStarred && (
                  <span className="text-2xl text-yellow-500">
                    <MdOutlineStar />
                  </span>
                )}
              </span>
            </p>
            <p className="text-[8px]">{client?.customerCompany}</p>
          </div>
        </div>

        <div className="flex items-center">
          <ChatHead
            client={client}
            selectedConversation={selectedConversation}
          />
          <div className="block lg:hidden">
            <DetailsBtn />
          </div>
        </div>
      </div>

      {MessageBox}
      {/* {selected === "PHONE" && <Phone clientId={+clientId} client={client} />} */}
    </div>
  );
}
