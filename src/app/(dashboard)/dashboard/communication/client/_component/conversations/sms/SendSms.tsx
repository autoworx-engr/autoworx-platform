"use client";
import { sendMessage } from "@/actions/communication/client/sendMessage";
import updateFirstContactTimeClient from "@/actions/communication/client/updateFirstContactTimeClient";
import { errorToast } from "@/lib/toast";
import Image from "next/image";
import React, { useRef, useState, useTransition } from "react";
import { MdDeleteOutline, MdSend } from "react-icons/md";
import AttachmentInput from "../AttachmentInput";
import { clientListStore } from "@/stores/client-store";

type TProps = {
  clientId: number;
  setMessages: React.Dispatch<React.SetStateAction<any[]>>;
};

export default function SendSms({ clientId, setMessages }: TProps) {
  const { clientList, setClientList } = clientListStore();

  const [files, setFiles] = useState<File[]>([]);
  const [messageInput, setMessageInput] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const [pending, startTransaction] = useTransition();

  const handleSendMessage = async (
    e: React.FormEvent<HTMLFormElement | HTMLTextAreaElement>,
  ) => {
    e.preventDefault();
    try {
      // upload photo
      let mediaUrl: string[] = [];

      if (files.length > 10)
        return errorToast("Maximum 10 files are allowed in a single message");

      if (files.length > 0) {
        const formData = new FormData();
        for (const file of files) {
          formData.append("file", file);
        }

        const res = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });

        const json = await res.json();

        if (json?.data?.length > 0) {
          mediaUrl = json?.data;
        }
      }

      const res = await sendMessage({
        clientId,
        message: messageInput,
        attachments: mediaUrl.map((file, ind) => ({
          url: file,
          name: files[ind].name,
        })),
      });
      if (res?.success && res?.data) {
        await updateFirstContactTimeClient(clientId);
        setMessages((messages) => [...messages, { ...res.data }]);
        setMessageInput("");
        setFiles([]);

        const currentClient = clientList?.find(
          (client) => client.id === clientId,
        );
        const filterCurrentClient = clientList?.filter(
          (client) => client.id !== clientId,
        );
        currentClient && setClientList([currentClient, ...filterCurrentClient]);
      }
    } catch (err) {
      errorToast("Error sending message");
    }
  };

  return (
    <>
      <AttachmentInput
        className="bottom-[90px]"
        multiAttachmentFile={files}
        onAllRemove={() => setFiles([])}
        onRemoveAttachment={(attachmentName) =>
          setFiles((prev) =>
            prev.filter((file) => file.name !== attachmentName),
          )
        }
      />
      <form
        className="flex h-[51px] items-center gap-x-2 rounded-b-md bg-[#D9D9D9] px-2 py-1"
        onSubmit={(event) => startTransaction(() => handleSendMessage(event))}
      >
        <input
          onChange={(e) => {
            setFiles(Array.from(e?.target?.files || []));
            e.target.value = "";
          }}
          multiple
          type="file"
          className="hidden"
          ref={fileRef}
        />
        <Image
          src="/icons/Attachment.svg"
          alt="attachment"
          width={20}
          height={20}
          className="cursor-pointer"
          onClick={() => {
            fileRef?.current?.click();
          }}
        />
        <div className="flex h-full w-full items-center gap-x-2 rounded-md bg-background">
          <textarea
            placeholder="Send Message..."
            className="h-full w-full resize-none rounded-md border-none px-2 py-0 text-[16px]  focus:outline-none"
            value={messageInput}

            
             style={{
    WebkitAppearance: "none",
    maxHeight: "100%",
    WebkitTextSizeAdjust: "100%",
    touchAction: "manipulation"
  }}
           
            onChange={(e) => setMessageInput(e.target.value)}
            onKeyDown={(event) =>
              startTransaction(() => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault(); // Prevents a new line
                  handleSendMessage(event); // Call your send function
                }
              })
            }
          />
          <button
            disabled={pending || (!messageInput && files.length === 0)}
            type="submit"
            className="px-2 text-[#006D77] disabled:text-gray-400"
          >
            <MdSend className="text-2xl" />
            {/* <Image src="/icons/Send.svg" alt="send" width={20} height={20} /> */}
          </button>
        </div>
      </form>
    </>
  );
}
