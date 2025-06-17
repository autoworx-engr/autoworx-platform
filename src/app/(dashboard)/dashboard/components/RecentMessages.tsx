import {
  fetchRecentMessages,
  FullMessage,
} from "@/actions/dashboard/technician/recentMessages";
import { Client, MailgunEmail, User } from "@prisma/client";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { FaExternalLinkAlt } from "react-icons/fa";

const RecentMessages = ({
  clientMessages = [],
  internalMessages = [],
  fullHeight = false,
  user,
}: {
  clientMessages?: (Client & {
    MailgunEmail: (MailgunEmail & { client: Client })[];
  })[];
  internalMessages?: FullMessage[];
  fullHeight?: boolean;
  user?: User;
}) => {
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
            msg?.lastName?.toLowerCase().includes(search.toLowerCase()),
        ),
      );
      setFilteredInternalMessages(
        internalMessages?.filter(
          (msg) =>
            msg?.from?.firstName
              ?.toLowerCase()
              .includes(search.toLowerCase()) ||
            msg?.from?.lastName?.toLowerCase().includes(search.toLowerCase()) ||
            msg?.to?.firstName?.toLowerCase().includes(search.toLowerCase()) ||
            msg?.to?.lastName?.toLowerCase().includes(search.toLowerCase()),
        ),
      );
    }
  }, [search]);

  return (
    <div className="flex-1 overflow-y-hidden p-6 shadow-md">
      <div className="h-full">
        <div className="mb-4 flex items-center justify-between">
          <span className="text-xl font-bold">Recent Messages</span>{" "}
          <Link href="/dashboard/task/day">
            <FaExternalLinkAlt />
          </Link>
        </div>
        <div className="custom-scrollbar flex h-full flex-1 flex-col space-y-4 overflow-x-hidden pb-4">
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
            {filteredClientMessages?.map((msg, idx) => (
              <Message data={msg} key={idx} />
            ))}
            {filteredInternalMessages?.map((msg, idx) => (
              <Message2 message={msg} user={user} key={idx} />
            ))}
            {filteredClientMessages?.length === 0 &&
              filteredInternalMessages?.length === 0 && (
                <div className="my-auto text-center">
                  You have no recent messages
                </div>
              )}
          </div>
        </div>
      </div>
    </div>
  );
};

const Message = ({
  data,
}: {
  data: Client & { MailgunEmail: MailgunEmail[] };
}) => {
  if (data.MailgunEmail?.length == 0) return null;
  return (
    <Link
      href={`/dashboard/communication/client/${data.id}`}
      className="relative flex w-full flex-col gap-x-2 rounded-md border p-2 px-2 xl:flex-row xl:items-start"
    >
      <Image
        width={60}
        height={60}
        src={data.photo ?? "/images/default.png"}
        alt=""
      />
      <div>
        <p className="mb-2 font-semibold">
          {/* {user.id === message?.from?.id
            ? (message?.to?.firstName || "") + (message?.to?.lastName || "")
            : (message?.from?.firstName || "") +
              (message?.from?.lastName || "")} */}
          {data?.firstName + " " + data?.lastName}
        </p>
        <p>
          {data.MailgunEmail[0].emailBy == "Company" && "You: "}
          {data.MailgunEmail[0].text.length > 50
            ? data.MailgunEmail[0].text.slice(0, 50) + "..."
            : data.MailgunEmail[0].text}
        </p>
      </div>
      <span className="absolute right-2 top-2 rounded-md bg-emerald-600 px-2 py-1 text-xs text-white">
        Client
      </span>
    </Link>
  );
};

const Message2 = ({ message, user }: { message: FullMessage; user?: User }) => {
  return (
    <Link
      href="/dashboard/communication/internal"
      className="relative flex w-full flex-col gap-x-2 rounded border p-2 px-2 xl:flex-row xl:items-start"
    >
      <Image
        width={60}
        height={60}
        src={
          message?.from?.image ? message?.from?.image : "/images/default.png"
        }
        alt=""
      />
      <div>
        <p className="pr-20 font-semibold">
          {user?.id === message?.from?.id
            ? (message?.to?.firstName || "") + (message?.to?.lastName || "")
            : (message?.from?.firstName || "") +
              (message?.from?.lastName || "")}
        </p>
        <p>
          {" "}
          {message?.from?.id === user?.id && "You: "}
          {message?.message}
        </p>
      </div>
      <span className="absolute right-2 top-2 rounded-md bg-emerald-600 px-2 py-1 text-xs text-white">
        Internal
      </span>
    </Link>
  );
};

export default RecentMessages;
