import { useState, useEffect, SetStateAction, useRef } from "react";
import MessageBox from "../MessageBox";
import { useSession } from "next-auth/react";
import { getUserMessagesById } from "@/actions/communication/internal/query";
import { Attachment, RequestEstimate, User } from "@prisma/client";
import { pusher } from "@/lib/pusher/client";
import { updateCollaborationUnreadMessageToRead } from "@/actions/communication/collaboration/updateUnreadMessage";

type TProps = {
  user: User & { companyName: string };
  setUsersList: React.Dispatch<SetStateAction<any[]>>;
  totalMessageBoxLength: number;
  containerRef?: React.RefObject<HTMLDivElement>;
};

export default function UserMessageBox({
  user,
  setUsersList,
  totalMessageBoxLength,
}: TProps) {
  const [messages, setMessages] = useState<any[]>([]);
  const { data: session } = useSession();
  const messageBoxRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  // Intersection Observer to detect when the message box is visible
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsVisible(entry.isIntersecting);
      },
      { threshold: 0.1 }, // Trigger when 10% of the component is visible
    );

    if (messageBoxRef.current) {
      observer.observe(messageBoxRef.current);
    }

    return () => {
      if (messageBoxRef.current) {
        observer.unobserve(messageBoxRef.current);
      }
    };
  }, []);

  // message from db
  useEffect(() => {
    const fetchMessages = async function () {
      const findUserMessage = await getUserMessagesById(
        parseInt(session?.user?.id!),
      );
      const userMessages = findUserMessage.filter(
        (m) => m.from === user.id || m.to === user.id,
      );

      setMessages(
        userMessages.map((m) => {
          return {
            message: m.message,
            // @ts-ignore
            sender: m.from === session?.user.id ? "USER" : "CLIENT",
            attachment: m.attachment,
            requestEstimate: m.requestEstimate,
            createdAt: m.createdAt,
          };
        }),
      );
    };
    fetchMessages();
  }, []);

  // Mark messages as read when component mounts and is visible
  useEffect(() => {
    const markAsReadOnMount = async () => {
      if (session?.user?.id && user.id) {
        await updateCollaborationUnreadMessageToRead(
          parseInt(session.user.id),
          user.id,
        );
      }
    };
    markAsReadOnMount();
  }, [session?.user?.id, user.id]);

  // Mark messages as read when the message box becomes visible
  useEffect(() => {
    const markAsRead = async () => {
      if (isVisible && session?.user?.id && user.id) {
        await updateCollaborationUnreadMessageToRead(
          parseInt(session.user.id),
          user.id,
        );
      }
    };
    markAsRead();
  }, [isVisible, session?.user?.id, user.id]);

  // real-time message from pusher
  useEffect(() => {
    const channel = pusher
      .subscribe(`user-${user?.id}`)
      .bind(
        "message",
        async ({
          to,
          from,
          message,
          attachment,
          requestEstimate,
        }: {
          to: number;
          from: number;
          message: string;
          attachment: Partial<Attachment>;
          requestEstimate: RequestEstimate | null;
        }) => {
          if (
            from !== parseInt(session?.user?.id!) &&
            to === parseInt(session?.user?.id!)
          ) {
            const newMessage = {
              message,
              sender: "CLIENT",
              attachment,
              requestEstimate,
            };
            setMessages((prevGroupMessages) => [
              ...prevGroupMessages,
              newMessage,
            ]);

            // If the user is currently viewing this specific sender's conversation, immediately mark as read
            if (isVisible && session?.user?.id && from === user.id) {
              await updateCollaborationUnreadMessageToRead(
                parseInt(session.user.id),
                from,
              );
            }
          }
        },
      );
    return () => {
      channel.unbind("message");
    };
  }, [user, session?.user?.id, isVisible]);

  return (
    <div ref={messageBoxRef}>
      <MessageBox
        section="collaboration"
        user={user}
        setUsersList={setUsersList}
        messages={messages}
        setMessages={setMessages}
        totalMessageBox={totalMessageBoxLength}
      />
    </div>
  );
}
