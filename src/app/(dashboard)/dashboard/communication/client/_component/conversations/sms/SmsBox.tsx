"use client";
import { useEffect, useRef } from "react";
import SmsMessage from "./SmsMessage";
import { useInView } from "framer-motion";
import useInfinitySmsQueryByClientId from "../../../_hooks/useInfinitySmsQuery";
import Spinner from "@/components/ui/Spinner";

export default function SmsBox({ clientId }: { clientId: number }) {
  const ref = useRef<HTMLDivElement | null>(null);
  const inView = useInView(ref, {
    amount: 0.5,
    margin: "0px 100px -50px 0px",
  });
  const {
    data,
    isLoading,
    isError,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
  } = useInfinitySmsQueryByClientId(clientId);
  const messages = data?.pages?.flatMap((page) => page.data) || [];
  const containerRef = useRef<HTMLDivElement>(null);

  // useEffect(() => {
  //     if (containerRef.current) {
  //         containerRef.current.scrollTop =
  //             containerRef.current.scrollHeight + 100;
  //     }
  // }, [messages]);

  useEffect(() => {
    if (inView && hasNextPage) {
      fetchNextPage();
    }
  }, [inView, hasNextPage]);

  const formatDate = (dateString: string) => {
    const options: Intl.DateTimeFormatOptions = {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    };
    return new Date(dateString).toLocaleDateString("en-US", options);
  };

  let content = null;

  if (isLoading && !isError) {
    content = <Spinner />;
  } else if (!isLoading && isError) {
    content = (
      <div className="text-red-500 text-center">Failed to load messages</div>
    );
  } else if (!isLoading && !isError && messages && messages?.length === 0) {
    content = (
      <div className="text-gray-500 text-center h-full flex justify-center items-center">
        No messages found
      </div>
    );
  } else if (!isLoading && !isError && messages && messages?.length > 0) {
    content = messages?.map((message: any, index: number) => {
      const currentMessageDate = new Date(message.createdAt).toDateString();
      const prevMessageDate =
        index > 0
          ? new Date(messages[index - 1].createdAt).toDateString()
          : null;

      return (
        <div key={index}>
          {index === 0 || currentMessageDate !== prevMessageDate ? (
            <div className="my-2 text-center text-xs text-gray-500 ">
              {formatDate(message.createdAt)}
            </div>
          ) : null}
          <SmsMessage message={message} />
        </div>
      );
    });
  }

  return (
    <div
      ref={containerRef}
      className="h-full w-full overflow-y-scroll flex flex-col-reverse"
    >
      {content}
      <div ref={ref} className="text-center text-sm text-gray-500 my-1">
        {isFetchingNextPage && <Spinner />}
        {hasNextPage && "Scroll to load more"}
        {!hasNextPage && messages.length !== 0 && "No more messages"}
      </div>
    </div>
  );
}
