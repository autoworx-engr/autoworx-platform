import { deleteUserFromGroup } from "@/actions/communication/internal/deleteUserFromGroup";
import { getUserInGroup } from "@/actions/communication/internal/query";
import { renameGroup } from "@/actions/communication/internal/renameGroup";
import { updateChatTrack } from "@/actions/communication/internal/updateChatTrack";
import Avatar from "@/components/Avatar";
import { errorHandler } from "@/error-boundary/globalErrorHandler";
import { cn } from "@/lib/cn";
import { successToast } from "@/lib/toast";
import {
  GROUP_NAME_MAX_LENGTH,
  normalizeGroupName,
} from "@/lib/utils/groupName";
import { useChatTrackStore } from "@/stores/chatTrackStore";
import { sendType } from "@/types/Chat";
import { Attachment, Group, User } from "@prisma/client";
import { useQueryClient } from "@tanstack/react-query";
import { Popconfirm } from "antd";
import { format } from "date-fns";
import {
  ArrowLeft,
  CircleCheckBig,
  CircleX,
  PencilLineIcon,
  SendHorizontal,
  Settings,
  X,
} from "lucide-react";
import { useSession } from "next-auth/react";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import {
  Fragment,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useTransition,
} from "react";
import toast from "react-hot-toast";
import { formatDate } from "./client/_component/conversations/mailgun/MailgunConversation";
import AddUsersInGroupModal from "./internal/AddUsersInGroupModal";
import { Message as TMessage } from "./internal/UsersArea";
import Message from "./Message";
import MessageListSkeleton from "./MessageListSkeleton";
import { useMessageDraft } from "./_hooks/useMessageDraft";

type TSection = "collaboration" | "internal";

export default function MessageBox({
  user: receiverUser,
  setUsersList,
  messages,
  totalMessageBox,
  setMessages,
  fromGroup,
  group,
  setGroupsList,
  existingGroups,
  section,
  isLoadingOlder = false,
  isLoadingInitial = false,
  onScrollContainerRef,
  topSlot,
}: {
  user?: User; // TODO: type this
  setUsersList?: React.Dispatch<React.SetStateAction<any[]>>;
  setGroupsList?: React.Dispatch<React.SetStateAction<any[]>>;
  messages: (TMessage & {
    attachment: Attachment | Attachment[] | null;
  })[];
  totalMessageBox: number;
  setMessages: React.Dispatch<React.SetStateAction<any[]>>;
  fromGroup?: boolean;
  group?: Group & { users: User[] };
  existingGroups?: Array<Group & { users: User[] }>;
  section: TSection;
  isLoadingOlder?: boolean;
  isLoadingInitial?: boolean;
  onScrollContainerRef?: (el: HTMLDivElement | null) => void;
  topSlot?: React.ReactNode;
}) {
  const { data: session } = useSession();
  const attachmentRef = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();
  const draftTargetId = fromGroup ? group?.id : receiverUser?.id;
  const draftChannel =
    section === "internal" ? (fromGroup ? "group" : "dm") : "";
  const {
    draftText: message,
    setDraftText: setMessage,
    clearDraft,
  } = useMessageDraft({
    section,
    channel: draftChannel,
    targetId: draftTargetId,
  });
  const messageBoxRef = useRef<HTMLDivElement>(null);
  const [openSettings, setOpenSettings] = useState(false);
  const [multiAttachmentFile, setMultiAttachmentFile] = useState<File[] | null>(
    null,
  );

  const router = useRouter();
  const queryClient = useQueryClient();
  const [showAttachment, setShowAttachment] = useState(false);
  const pathname = usePathname();

  const [isImageLoaded, setIsImageLoaded] = useState(false);

  const isEstimateAttachmentShow = pathname?.includes(
    "/communication/collaboration",
  );

  const { lastMessage, setLastMessage } = useChatTrackStore();
  const [groupName, setGroupName] = useState(group?.name || "");
  const [isGroupNameEdited, setIsGroupNameEdited] = useState(false);

  // Track which last-message id we've already scrolled to. We scroll to the
  // bottom only when a genuinely new last-message id appears (initial load /
  // new outgoing or incoming real-time message). We must NOT scroll when older
  // pages are prepended (scroll-up reverse pagination).
  //
  // Two guards:
  //   1. `isLoadingOlder` (= isFetchingNextPage) — blocks while the fetch is
  //      in flight.
  //   2. `wasLoadingOlderRef` — blocks on the EXACT render where
  //      `isLoadingOlder` flips true→false (i.e. the page just landed).
  //      Without this the effect would fire with `isLoadingOlder = false` and
  //      the stale `lastId` check might not save us in every edge case.
  const lastSeenIdRef = useRef<unknown>(null);
  const wasLoadingOlderRef = useRef(false);
  useLayoutEffect(() => {
    if (isLoadingOlder) {
      wasLoadingOlderRef.current = true;
      return;
    }
    // Just finished loading an older page — skip this render so the parent's
    // useLayoutEffect (adjustAfterPagesChange) can restore scroll position
    // without us fighting it.
    if (wasLoadingOlderRef.current) {
      wasLoadingOlderRef.current = false;
      return;
    }

    const last = messages[messages.length - 1] as any;
    const lastId = last?.id ?? last?.createdAt ?? null;
    if (lastId == null) return;
    if (lastId === lastSeenIdRef.current && !isImageLoaded) return;
    lastSeenIdRef.current = lastId;

    const frame = requestAnimationFrame(() => {
      if (messageBoxRef.current) {
        messageBoxRef.current.scrollTop = messageBoxRef.current.scrollHeight;
        setIsImageLoaded(false);
      }
    });

    return () => cancelAnimationFrame(frame);
  }, [messages, isImageLoaded, totalMessageBox, isLoadingOlder]);

  // Expose the inner scroll container to a parent that wants to wire up
  // reverse-pagination on scroll-up.
  useEffect(() => {
    if (!onScrollContainerRef) return;
    onScrollContainerRef(messageBoxRef.current);
    return () => onScrollContainerRef(null);
  }, [onScrollContainerRef]);

  async function handleSendMessage(e: any) {
    e.preventDefault();

    try {
      if (!message && !multiAttachmentFile) return;

      let attachmentFileUrl = null;

      if (multiAttachmentFile && multiAttachmentFile?.length > 0) {
        const formData = new FormData();
        multiAttachmentFile.forEach((photo) => {
          formData.append("file", photo);
        });
        const uploadRes = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });
        if (!uploadRes.ok) {
          // setError("Failed to upload photos");
          console.error("Failed to upload photos");
          // setImageSrc(null);
        }

        const json = await uploadRes.json();
        attachmentFileUrl = json.data;
      }

      const requestBody = {
        sessionUserId: session?.user?.id,
        to: fromGroup ? group?.id : receiverUser?.id,
        type: fromGroup ? sendType.Group : sendType.User,
        message,
        section,
        attachmentFiles:
          attachmentFileUrl && attachmentFileUrl.length > 0
            ? (attachmentFileUrl as string[]).map((fileUrl, urlIndex) => {
                const findFileIntoMultiFile = multiAttachmentFile?.find(
                  (_, fileIndex) => fileIndex === urlIndex,
                );
                return {
                  fileName: findFileIntoMultiFile?.name,
                  fileType: findFileIntoMultiFile?.type,
                  fileUrl: fileUrl,
                  fileSize: findFileIntoMultiFile?.size,
                };
              })
            : null,
      };

      const res = await fetch("/api/pusher", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      const json = await res.json();
      if (json.success) {
        const newMessage: TMessage = {
          // userId: parseInt(session?.user?.id!),
          message,
          sender: "USER",
          attachment: json.attachments,
          createdAt: new Date(),
        };
        setMessages((messages) => [...messages, newMessage]);
        clearDraft();
        setMultiAttachmentFile(null);
        if (json.chatTrack) {
          setLastMessage(json.chatTrack);
        } else if (json.newMessage) {
          setLastMessage({ message: json.newMessage } as Parameters<
            typeof setLastMessage
          >[0]);
        }
        // Keys carry companyId + search, so match by prefix rather than
        // guessing the exact tuple.
        queryClient.invalidateQueries({
          predicate: (query) =>
            query.queryKey[0] === "internal" &&
            (query.queryKey[1] === "users" || query.queryKey[1] === "groups"),
        });
        router.refresh();
      } else {
        toast.error(json.message);
      }
    } catch (err: any) {
      toast.error("Failed to send message");
    }
  }

  const handleGroupClose = () => {
    setGroupsList &&
      setGroupsList((groupList) => groupList.filter((g) => g.id !== group?.id));
  };

  const handleUserClose = async () => {
    try {
      const res = lastMessage && (await updateChatTrack(lastMessage?.id));
      if (res?.type === "success") {
        setLastMessage(res.data);
      }
      setUsersList &&
        setUsersList((usersList) =>
          usersList.filter((u) => u.id !== receiverUser?.id),
        );
    } catch (err) {
      const formattedError = errorHandler(err);
      throw { formattedError };
    }
  };

  const handleDeleteUserFromGroupList = async (userId: number) => {
    const isUserExistInGroup = await getUserInGroup(
      parseInt(session?.user?.id!),
      group?.id!,
    );
    if (!isUserExistInGroup) {
      toast.error("You can not remove this User from this group");
      return;
    }
    const response = await deleteUserFromGroup(userId, group?.id!);
    if (response.status === 200) {
      if (userId === parseInt(session?.user?.id!)) {
        handleGroupClose();
      } else {
        setGroupsList &&
          setGroupsList((groupList) =>
            groupList.map((g) => {
              if (g.id === group?.id) {
                return {
                  ...g,
                  users: g.users.filter((user: User) => user.id !== userId),
                };
              }
              return g;
            }),
          );
        const removedUser = group?.users.find((user) => user.id === userId);
        const userName = removedUser
          ? `${removedUser.firstName} ${removedUser.lastName}`
          : "User";
        successToast(`${userName} removed from group successfully!`);
      }
    }
  };

  const handleAttachment = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files!).map((file) => file);
    setShowAttachment(false);
    setMultiAttachmentFile(files);
  };

  const handleDownload = async (fileUrl: string | null) => {
    // const response = await fetch(fileUrl as string);
    // const responseBlob = await response.blob();
    // const blobURL = URL.createObjectURL(responseBlob);
    // const link = document.createElement("a");
    // link.href = blobURL;
    // link.setAttribute("download", fileUrl?.split("/").pop()!);
    // document.body.appendChild(link);
    // link.click();
    // link.remove();
    fileUrl && window.open(fileUrl, "_blank", "noopener,noreferrer");
  };

  // this handler for mobile device
  const handleBack = () => {
    setUsersList && setUsersList([]);
    setGroupsList && setGroupsList([]);
  };

  const handleRemoveAttachment = (fileName: string) => {
    setMultiAttachmentFile(
      (multiFiles) =>
        multiFiles && multiFiles?.filter((file) => file?.name !== fileName),
    );
  };
  return (
    <div
      className={cn(
        "app-shadow flex h-[calc(100vh-50px)] w-full flex-col justify-between overflow-hidden border bg-background max-[1400px]:w-[100%] sm:h-full sm:rounded-lg",
        totalMessageBox > 2 && "sm:h-[44vh]",
      )}
    >
      {/* Chat Header */}
      <div className="flex items-center justify-between gap-2 bg-gradient-to-r from-[#006D77] to-[#008c99] p-3 text-white sm:rounded-sm">
        <div className="flex items-center gap-3">
          <button onClick={handleBack} className="flex-shrink-0 sm:hidden">
            <ArrowLeft size={20} className="font-bold" />
          </button>
          {fromGroup ? (
            <div className="flex items-center">
              {group?.users.slice(0, 4).map((groupUser: any, index: number) => (
                <Avatar
                  key={groupUser.id}
                  photo={groupUser.image}
                  width={50}
                  height={50}
                  className={cn(
                    "rounded-full",
                    index === 0 ? "ml-0" : "-ml-9 sm:-ml-8",
                  )}
                />
              ))}
            </div>
          ) : (
            <Avatar photo={receiverUser?.image} width={50} height={50} />
          )}
          <div className="flex flex-col">
            <p className="flex flex-col text-[18px] font-bold sm:text-[20px]">
              {fromGroup ? (
                <>
                  {openSettings && isGroupNameEdited ? (
                    <input
                      type="text"
                      value={groupName}
                      onChange={(e) => setGroupName(e.target.value)}
                      maxLength={GROUP_NAME_MAX_LENGTH}
                      className="text-black rounded-md px-2 py-1 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-white"
                      autoFocus
                    ></input>
                  ) : (
                    groupName
                  )}
                </>
              ) : (
                `${receiverUser?.firstName} ${receiverUser?.lastName}`
              )}
              {receiverUser?.companyName && (
                <span className="text-sm font-light">
                  {receiverUser?.companyName}
                </span>
              )}
            </p>
          </div>
          {fromGroup && (
            <>
              {openSettings ? (
                <>
                  {isGroupNameEdited ? (
                    <>
                      <CircleCheckBig
                        className="ml-3 size-6 cursor-pointer"
                        onClick={async () => {
                          const trimmedName = normalizeGroupName(groupName);
                          const currentName = normalizeGroupName(
                            group?.name ?? "",
                          );
                          if (!trimmedName) return;
                          if (
                            trimmedName.toLowerCase() ===
                            currentName.toLowerCase()
                          ) {
                            toast.error("Group name must be different.");
                            return;
                          }
                          const hasDuplicateName =
                            existingGroups?.some(
                              (existingGroup) =>
                                existingGroup.id !== group?.id &&
                                normalizeGroupName(
                                  existingGroup.name ?? "",
                                ).toLowerCase() === trimmedName.toLowerCase(),
                            ) ?? false;
                          if (hasDuplicateName) {
                            toast.error("Group name already exists.");
                            return;
                          }
                          if (groupName !== group?.name && group?.id) {
                            const response = await renameGroup(
                              trimmedName,
                              group.id,
                            );
                            if (response?.status === 200) {
                              setIsGroupNameEdited(false);
                              setGroupName(trimmedName);
                              successToast(
                                response?.message ||
                                  "Group renamed successfully.",
                              );
                            } else {
                              toast.error(
                                response?.message || "Failed to rename group.",
                              );
                            }
                          } else {
                            setIsGroupNameEdited(false);
                          }
                        }}
                      />
                    </>
                  ) : (
                    <>
                      <PencilLineIcon
                        className="ml-3 size-6 cursor-pointer"
                        onClick={() => setIsGroupNameEdited(true)}
                      />
                    </>
                  )}
                </>
              ) : (
                <Settings
                  onClick={() => setOpenSettings(true)}
                  className="ml-3 size-6 cursor-pointer"
                />
              )}
            </>
          )}
        </div>

        <button
          type="button"
          onClick={fromGroup ? handleGroupClose : handleUserClose}
          className="flex-shrink-0 rounded-full p-1 text-white transition-colors hover:bg-white/15"
          aria-label="Close chat"
        >
          <X className="size-5" />
        </button>
      </div>

      {/* group user setting */}
      {fromGroup && openSettings && (
        <div className="flex w-full items-center justify-between rounded-sm bg-[#D9D9D9] p-3">
          <div className="flex flex-wrap items-center gap-2">
            {group?.users.map((user: User) => (
              <div
                key={user.id}
                className="flex items-center justify-between space-x-1 rounded-full bg-[#006D77] px-2 py-1 text-white"
              >
                <p className="text-sm">{user.firstName}</p>
                <Popconfirm
                  title="Remove User"
                  description={`Are you sure you want to remove ${user.firstName} ${user.lastName} from this group?`}
                  onConfirm={() => handleDeleteUserFromGroupList(user.id)}
                  disabled={pending}
                  okText="Yes"
                  cancelText="No"
                >
                  <CircleX className="size-4 cursor-pointer" />
                </Popconfirm>
              </div>
            ))}
            <AddUsersInGroupModal
              users={group?.users || []}
              groupId={group?.id}
              setGroupsList={setGroupsList || null}
            />
          </div>
          <p>
            <CircleX
              onClick={() => setOpenSettings(false)}
              className="size-8 cursor-pointer text-[#006D77]"
            />
          </p>
        </div>
      )}

      {/* Messages */}
      <div
        id="messageBox"
        className={cn(
          "overflow-y-scroll",
          totalMessageBox > 2 ? "h-[calc(100%-60px)]" : "h-[82%]",
        )}
        ref={messageBoxRef}
      >
        {topSlot}
        {isLoadingInitial && messages.length === 0 && <MessageListSkeleton />}
        {messages.map((message: TMessage, index: number) => {
          const prev = index > 0 ? messages[index - 1] : null;
          const currentTs = new Date(
            message?.createdAt ?? new Date(),
          ).getTime();
          const prevTs = prev
            ? new Date(prev.createdAt ?? new Date()).getTime()
            : 0;
          const messageDate = format(
            new Date(message?.createdAt ?? new Date()),
            "PPP",
          );
          const prevDate = prev
            ? format(new Date(prev.createdAt ?? new Date()), "PPP")
            : null;

          // Day chip only when the calendar day changes (WhatsApp / Messenger
          // style). Previously this was reset to "" on every iteration so
          // every message got a separator.
          const showDateSeparator = !prev || messageDate !== prevDate;

          // Group with previous when: same sender, same userId (for group
          // chats), same calendar day, and within 5 minutes — collapses
          // avatar + name + extra spacing on stacked replies.
          const FIVE_MIN = 5 * 60 * 1000;
          const groupedWithPrev =
            !!prev &&
            !showDateSeparator &&
            prev.sender === message.sender &&
            (prev.userId ?? null) === (message.userId ?? null) &&
            currentTs - prevTs < FIVE_MIN;

          return (
            <Fragment
              key={
                message.userId ??
                `${message.createdAt?.toISOString?.() ?? index}-${index}`
              }
            >
              {showDateSeparator && (
                <div className="block py-2 text-center text-xs text-gray-500">
                  {formatDate(
                    new Date(message?.createdAt ?? new Date()).toDateString(),
                  )}
                </div>
              )}
              <Message
                key={index}
                fromGroup={fromGroup}
                message={message}
                groupedWithPrev={groupedWithPrev}
                onDownload={handleDownload}
                setIsImageLoaded={setIsImageLoaded}
              />
            </Fragment>
          );
        })}
      </div>

      {/* attachments */}
      {multiAttachmentFile && multiAttachmentFile.length > 0 && (
        <div
          className={cn(
            "relative w-full rounded-lg border border-gray-200 bg-white shadow-md flex flex-col",
            totalMessageBox > 2 ? "max-h-[120px]" : "max-h-64",
          )}
        >
          {/* Sticky header */}
          <div className="sticky top-0 z-20 flex items-center justify-end bg-white px-3 py-2 shadow-sm border-b border-gray-100">
            <button
              onClick={() => setMultiAttachmentFile(null)}
              className="rounded-full bg-red-500/10 p-1.5 text-red-600 hover:bg-red-500/20 transition-colors"
              aria-label="Remove all attachments"
            >
              <CircleX size={20} />
            </button>
          </div>

          {/* Scrollable attachments */}
          <div className="thin-scrollbar max-h-64 overflow-y-auto px-4 pb-4">
            {/* Fixed responsive grid with minimum item width */}
            <div
              className="gap-3 pt-3"
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(90px, 1fr))",
              }}
            >
              {multiAttachmentFile?.map((attachmentFile) => (
                <div
                  key={attachmentFile.name}
                  className="group relative flex flex-col items-center rounded-lg border border-gray-200 bg-gray-50 p-2 shadow-sm transition-all hover:shadow-md hover:border-gray-300 min-w-0"
                >
                  {/* Remove single attachment */}
                  <button
                    onClick={() => handleRemoveAttachment(attachmentFile.name)}
                    className="absolute -right-1 -top-1 opacity-0 group-hover:opacity-100 rounded-full bg-white p-1 text-gray-700 shadow-md hover:text-red-500 hover:shadow-lg transition-all z-10 border border-gray-200"
                    aria-label={`Remove ${attachmentFile.name}`}
                  >
                    <CircleX size={14} />
                  </button>

                  {/* File preview container */}
                  <div className="relative mb-2">
                    {/* Image preview */}
                    {attachmentFile.type.includes("image") ? (
                      <div className="relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-md border border-gray-300">
                        <Image
                          src={URL.createObjectURL(attachmentFile)}
                          alt={attachmentFile.name}
                          className="object-cover"
                          fill
                          sizes="80px"
                        />
                      </div>
                    ) : (
                      // Non-image file preview
                      <div className="flex h-20 w-20 flex-shrink-0 flex-col items-center justify-center rounded-md bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-sm">
                        <p className="text-xs font-semibold text-center px-1 leading-tight">
                          {attachmentFile.name
                            .split(".")
                            .pop()
                            ?.toUpperCase() || "FILE"}
                        </p>
                        <p className="text-[10px] mt-0.5 opacity-90">
                          {(attachmentFile.size / (1024 * 1024)).toFixed(1)}MB
                        </p>
                      </div>
                    )}
                  </div>

                  {/* File name */}
                  <p className="w-full text-center text-xs text-gray-700 leading-tight break-all line-clamp-2 px-1">
                    {attachmentFile.name}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Input */}
      <form
        className={cn(
          "relative flex items-center gap-2 border-t bg-gray-100 p-3",
          totalMessageBox > 2 ? "h-[60px] min-h-[60px]" : "h-[8%] min-h-[50px]",
        )}
        onSubmit={(e) => startTransition(() => handleSendMessage(e))}
      >
        {/* attachment or estimate dropdown */}
        {showAttachment && (
          <div
            className={cn(
              "absolute -top-[55px] space-y-1",
              isEstimateAttachmentShow ? "-top-[55px]" : "-top-[27px]",
            )}
          >
            <p
              onClick={() => attachmentRef.current?.click()}
              className="cursor-pointer text-nowrap rounded-md border border-[#006D77] bg-background px-2 text-sm text-[#006D77] hover:bg-[#006D77] hover:text-white"
            >
              Attach Document/Media
            </p>
            {/* {isEstimateAttachmentShow && (
              <InvoiceEstimateModal
                setShowAttachment={setShowAttachment}
                setMessages={setMessages}
                receiverCompany={receiverUser?.company!}
                currentCompanyId={currentCompanyId}
              />
            )} */}
          </div>
        )}
        <Image
          onClick={() => setShowAttachment(!showAttachment)}
          className="cursor-pointer"
          src="/icons/Attachment.svg"
          width={24}
          height={24}
          alt="attachment"
        />
        <input
          multiple
          accept="*"
          ref={attachmentRef}
          onChange={handleAttachment}
          hidden
          type="file"
        />
        <input
          type="text"
          placeholder="Send Message..."
          className="h-10 flex-1 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#006D77] focus:border-transparent"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
        />
        <button disabled={pending} className="" type="submit">
          {/* <Image src="/icons/Send.svg" width={20} height={20} alt="send" /> */}
          <SendHorizontal className="text-[#006D77]" />
        </button>
      </form>
    </div>
  );
}
