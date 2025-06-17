"use client";
import { useEffect, useRef } from "react";
import SmsMessage from "./SmsMessage";

export default function SmsBox({
  messages,
}: {
  messages: any[];
  clientId?: number;
}) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight + 100;
    }
  }, [messages]);

  const formatDate = (dateString: string) => {
    const options: Intl.DateTimeFormatOptions = {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    };
    return new Date(dateString).toLocaleDateString("en-US", options);
  };

  return (
    <div
      ref={containerRef}
      className="h-full w-full overflow-y-scroll lg:h-[89%]"
    >
      {messages?.map((message: any, index: number) => {
        const currentMessageDate = new Date(message.createdAt).toDateString();
        const prevMessageDate =
          index > 0
            ? new Date(messages[index - 1].createdAt).toDateString()
            : null;

        return (
          <div key={index}>
            {index === 0 || currentMessageDate !== prevMessageDate ? (
              <div className="my-2 text-center text-xs text-gray-500">
                {formatDate(message.createdAt)}
              </div>
            ) : null}
            <SmsMessage message={message} />
          </div>
        );
      })}
    </div>
  );
}
