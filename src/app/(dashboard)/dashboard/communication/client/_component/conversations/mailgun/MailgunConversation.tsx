import { cn } from "@/lib/cn";
import { MailgunEmail, MailgunEmailAttachment } from "@prisma/client";
import Image from "next/image";
import MailAttachment from "./MailAttachment";
import { makeLinksClickable } from "@/components/MakeLinkClickable";
import { format } from "date-fns";

type TProps = {
  messages: (MailgunEmail & { attachments: MailgunEmailAttachment[] })[];
};

export const formatDate = (dateString: string) => {
  const options: Intl.DateTimeFormatOptions = {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  };
  return new Date(dateString).toLocaleDateString("en-US", options);
};
export default function MailGunConversation({ messages }: TProps) {
  const handleDownload = (fileUrl: string, fileName: string) => {
    window.open(fileUrl, "_blank");
  };

  let lastDate = "";

  return (
    <div className="flex w-full flex-col gap-2 p-2">
      {messages.map((message, index) => {
        const messageDate = format(new Date(message.createdAt), "PPP"); // 'Jan 1, 2024'
        const messageTime = format(new Date(message.createdAt), "h:mm a"); // '12:30 PM'

        const showDateSeparator = messageDate !== lastDate;
        lastDate = messageDate;

        return (
          <div key={message.id} className="w-full">
            {/* Date Separator */}
            {showDateSeparator && (
              <div className="py-2 text-center text-xs text-gray-500">
                {formatDate(
                  new Date(message?.createdAt ?? new Date()).toDateString(),
                )}
              </div>
            )}

            {/* Message Container */}
            <div
              className={`flex w-full items-center p-1 ${
                message.emailBy !== "Company" ? "justify-start" : "justify-end"
              }`}
            >
              <div className="flex w-full items-start gap-2 p-1">
                {/* Profile Image */}
                {message.emailBy !== "Company" && (
                  <Image
                    src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQNL_ZnOTpXSvhf1UaK7beHey2BX42U6solRA&s"
                    alt="user"
                    width={30}
                    height={30}
                    className="rounded-full"
                  />
                )}

                <div
                  className={cn(
                    "relative max-w-[90%] break-words rounded-xl p-2 text-[14px]",
                    message.emailBy !== "Company" ? "" : "ml-auto",
                  )}
                >
                  {/* Message Text */}
                  {message?.text?.trim() && (
                    <p
                      className={`inline-block max-w-full ${
                        message.emailBy !== "Company"
                          ? "bg-[#D9D9D9] text-slate-800"
                          : "float-right bg-[#006D77] text-white"
                      } rounded-xl px-2 py-2`}
                    >
                      {makeLinksClickable(message.text)}
                    </p>
                  )}

                  {/* Attachments */}
                  <MailAttachment
                    message={message}
                    onDownload={handleDownload}
                  />
                  {/* Message Timestamp */}
                  <p
                    className={`mt-2 text-[10px] text-gray-400 ${message.emailBy !== "Company" ? "" : "text-right"}`}
                  >
                    {messageTime}
                  </p>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
