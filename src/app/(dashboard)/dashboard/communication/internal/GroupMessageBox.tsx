import { useEffect, useState } from "react";
import MessageBox from "../MessageBox";
import {
  getGroupMessagesById,
  getUserInGroup,
} from "@/actions/communication/internal/query";
import { useSession } from "next-auth/react";
import { pusher } from "@/lib/pusher/client";
import { Attachment, Group, User } from "@prisma/client";

type TProps = {
  setGroupsList: React.Dispatch<
    React.SetStateAction<(Group & { users: User[] })[]>
  >;
  existingGroups: Array<Group & { users: User[] }>;
  totalMessageBox: number;
  group: Group & { users: User[] };
};

export default function GroupMessageBox({
  group,
  totalMessageBox,
  setGroupsList,
  existingGroups,
}: TProps) {
  const [groupMessages, setGroupMessages] = useState<any[]>([]);
  const { data: session } = useSession();

  useEffect(() => {
    const fetchGroupMessages = async () => {
      const groupMessages = await getGroupMessagesById(group.id);
      const isUserExistInGroup = await getUserInGroup(
        parseInt(session?.user?.id!),
        group.id,
      );
      if (!isUserExistInGroup) {
        return;
      }
      groupMessages &&
        setGroupMessages(
          groupMessages?.messages.map((m) => {
            return {
              groupId: m.groupId,
              userId: m.from,
              message: m.message,
              sender:
                m.from === parseInt(session?.user?.id!) ? "USER" : "CLIENT",
              attachment: m.attachment,
              createdAt: m.createdAt,
            };
          }),
        );
    };
    if (session?.user?.id) {
      fetchGroupMessages();
    }
  }, [group.id, session?.user?.id]);

  // for group real-time messages
  useEffect(() => {
    const channel = pusher
      .subscribe(`group-${group.id}`)
      .bind(
        "message",
        async ({
          groupId,
          from,
          message,
          attachment,
        }: {
          groupId: number;
          from: number;
          message: string;
          attachment: Attachment | null;
        }) => {
          const isUserExistInGroup = await getUserInGroup(
            parseInt(session?.user?.id!),
            groupId,
          );
          if (!isUserExistInGroup) {
            setGroupsList((groupList) =>
              groupList.filter((g) => g.id !== groupId),
            );
            return;
          }
          if (from !== parseInt(session?.user?.id!) && isUserExistInGroup) {
            const newMessage = {
              userId: from,
              message: message,
              sender: "CLIENT",
              attachment,
            };
            setGroupMessages((prevGroupMessages) => [
              ...prevGroupMessages,
              newMessage,
            ]);
          }
        },
      );

    return () => {
      channel.unbind("message");
    };
  }, [group.id, session?.user?.id, setGroupsList]);

  return (
    <MessageBox
      fromGroup
      group={group}
      section="internal"
      messages={groupMessages}
      setMessages={setGroupMessages}
      totalMessageBox={totalMessageBox}
      setGroupsList={setGroupsList}
      existingGroups={existingGroups}
    />
  );
}
