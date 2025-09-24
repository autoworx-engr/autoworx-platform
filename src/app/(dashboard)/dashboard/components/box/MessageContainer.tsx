"use client";
import React, { useEffect, useState } from "react";
import { Client, MailgunEmail, User } from "@prisma/client";
import { FullMessage } from "@/actions/dashboard/technician/recentMessages";
import { Message } from "./Message";


type TMessageContainerProps = {
  clientMessages?: (Client & {
    MailgunEmail: (MailgunEmail & { client: Client })[];
  })[];
  internalMessages?: FullMessage[];
  user: User;
  hasMessagePermission?: boolean;
};

export default function MessageContainer({
  clientMessages = [],
  internalMessages = [],
  user,
  hasMessagePermission = true,
}: TMessageContainerProps) {

  const [search, setSearch] = useState("");



  const [filteredClientMessages, setFilteredClientMessages] =
    useState(clientMessages);

  const [filteredInternalMessages, setFilteredInternalMessages] =
    useState(internalMessages);

  useEffect(() => {
    if (search == "") {
      setFilteredClientMessages(clientMessages);
      setFilteredInternalMessages(internalMessages);
    } else {
      setFilteredClientMessages(
        clientMessages?.filter(
          (msg) =>
            msg?.firstName?.toLowerCase().includes(search.toLowerCase()) ||
            msg?.lastName?.toLowerCase().includes(search.toLowerCase())
        )
      );
      setFilteredInternalMessages(
        internalMessages?.filter(
          (msg) =>
            msg?.from?.firstName
              ?.toLowerCase()
              .includes(search.toLowerCase()) ||
            msg?.from?.lastName?.toLowerCase().includes(search.toLowerCase()) ||
            msg?.to?.firstName?.toLowerCase().includes(search.toLowerCase()) ||
            msg?.to?.lastName?.toLowerCase().includes(search.toLowerCase())
        )
      );
    }
  }, [search]);
  return (
    <div className="custom-scrollbar flex h-full flex-1 flex-col space-y-4 overflow-x-hidden pb-4">
      {!hasMessagePermission ? (
        <div className="flex flex-1 items-center justify-center">
          <span className="text-sm text-gray-500 text-center">
            You do not have access to see the messages. Please contact your
            administrator.
          </span>
        </div>
      ) : (
        <>
          <input
            className="mb-4 h-[6%] w-full rounded border border-[#03A7A2] px-4 py-2"
            type="text"
            placeholder="Search messages"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
            }}
          />
          <div className="custom-scrollbar #justify-center flex h-[90%] w-full flex-1 flex-col items-center space-y-4 self-center">
            {filteredClientMessages?.map((data) => {
              if (data.MailgunEmail?.length == 0) return null;
              const emailBy =
                data.MailgunEmail[0].emailBy == "Company" && "You: ";
              const messageContent =
                data.MailgunEmail[0].text.length > 50
                  ? data.MailgunEmail[0].text.slice(0, 50) + "..."
                  : data.MailgunEmail[0].text;
              return (
                <Message
                  key={data.id}
                  userName={`${data.firstName} ${data.lastName}`}
                  message={`${emailBy} ${messageContent}`}
                  redirectUrl={`/dashboard/communication/client/${data.id}`}
                  communicationType="Client"
                  photoUrl={data.photo}
                />
              );
            })}
            {filteredInternalMessages?.map((data: FullMessage) => {
              const userName =
                user?.id === data?.from?.id
                  ? (data?.to?.firstName || "") + (data?.to?.lastName || "")
                  : (data?.from?.firstName || "") +
                    (data?.from?.lastName || "");
              const messageBy = data?.from?.id === user?.id && "You: ";
              return (
                <Message
                  key={data.id}
                  userName={userName}
                  message={`${messageBy} ${data.message}`}
                  redirectUrl={`/dashboard/communication/internal/?id=${data?.from?.id === user?.id ? data?.to?.id : data?.from?.id}`}
                  communicationType="Internal"
                  photoUrl={data?.from?.image}
                />
              );
            })}
            {filteredClientMessages?.length === 0 &&
              filteredInternalMessages?.length === 0 && (
                <div className="my-auto text-center">
                  You have no recent messages
                </div>
              )}
          </div>
        </>
      )}
    </div>
  );
}
