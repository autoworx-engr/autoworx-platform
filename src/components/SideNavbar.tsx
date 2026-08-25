"use client";

import getClientByUnreadMsg from "@/actions/communication/client/getUnreadMessageCount";
import fetchUnreadInternalMessageCount from "@/actions/communication/internal/fetchUnreadInternalMessageCount";
import { useServerGet } from "@/hooks/useServerGet";
import { cn } from "@/lib/cn";
import { PermissionsResult } from "@/lib/getPermissions";
import { useCompanyFeaturePermissionStore } from "@/stores/companyFeaturePermissionStore";
import { pusher } from "@/lib/pusher/client";

import { useClientCommunicationStore } from "@/stores/client-store";
import { useGetCurrentUser } from "@/utils/useGetCurrentUser";
import { ClientConversationTrack } from "@prisma/client";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ReactNode, useCallback, useEffect, useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./DropdownMenu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./Tooltip";
import { useChatTrackStore } from "@/stores/chatTrackStore";
import { useSession } from "next-auth/react";
import { filterNavList } from "@/lib/navListAuthorization";

type TProps = {
  navList: {
    title: string;
    icon: string | ReactNode;
    link?: string | null;
    path: string;
    subnav?:
      | {
          title: string;
          link: string;
        }[]
      | null;
  }[];
  permissions: PermissionsResult | null;
};

export default function SideNavbar({ navList, permissions }: TProps) {
  const pathName = usePathname() || "";
  const user = useGetCurrentUser();
  const { unreadMessageCount, setUnreadMessageCount } = useChatTrackStore();

  const isSuperAdminRoute = pathName.startsWith("/awx-dashboard");

  // Get company feature permissions from store
  const { companyFeaturePermission } = useCompanyFeaturePermissionStore();

  const modifiedPathName = (
    pathName === "/dashboard"
      ? "/dashboard/dashboard"
      : pathName === "/dashboard/client"
        ? "/dashboard/employee"
        : pathName
  )
    .split("/")
    .slice(0, 3)
    .join("/");
  const companyId = user?.companyId;

  const [clientConversations, setClientConversations] = useState<
    Partial<ClientConversationTrack>[]
  >([]);

  const clientConversationTrack = useClientCommunicationStore(
    (state) => state.clientConversationTrack,
  );
  const clientTrackUpdate = useClientCommunicationStore(
    (state) => state.clientTrackUpdate,
  );

  const { data: unreadInternalMessageCountData } = useServerGet(
    fetchUnreadInternalMessageCount,
  );

  useEffect(() => {
    if (unreadInternalMessageCountData?.data) {
      setUnreadMessageCount(unreadInternalMessageCountData.data);
    }
  }, [unreadInternalMessageCountData?.data]);

  // Listen for real-time message updates
  useEffect(() => {
    const userId = user?.id;
    if (!userId) return;

    const channel = pusher.subscribe(`track-${userId}`);

    const refreshUnreadCounts = async () => {
      const result = await fetchUnreadInternalMessageCount();
      if (result.success && result.data) {
        setUnreadMessageCount(result.data);
      }
    };

    const chatTrackReadHandler = async () => {
      await refreshUnreadCounts();
    };

    channel.bind("chat-track", refreshUnreadCounts);
    channel.bind("chat-track-read", chatTrackReadHandler);
    channel.bind("collaboration-unread-updated", refreshUnreadCounts);

    return () => {
      channel.unbind("chat-track");
      channel.unbind("chat-track-read");
      channel.unbind("collaboration-unread-updated");
      pusher.unsubscribe(`track-${userId}`);
    };
  });

  const userPermissions = permissions?.userPermissions;

  const companyUserPermissions = permissions?.companyPermissions;
  // check if user has permission to view notification
  const notificationShowPermission =
    permissions?.role === "Admin"
      ? true
      : (userPermissions?.communicationHubClients ??
        userPermissions?.communicationHubInternal ??
        //@ts-ignore
        companyUserPermissions?.communicationHubClients ??
        //@ts-ignore
        companyUserPermissions?.communicationHubInternal);

  // Specific permission checks for each communication type
  const hasClientCommunicationPermission =
    permissions?.role === "Admin"
      ? true
      : (userPermissions?.communicationHubClients ??
        //@ts-ignore
        companyUserPermissions?.communicationHubClients);

  const hasInternalCommunicationPermission =
    permissions?.role === "Admin"
      ? true
      : (userPermissions?.communicationHubInternal ??
        //@ts-ignore
        companyUserPermissions?.communicationHubInternal);

  const hasCollaborationCommunicationPermission =
    permissions?.role === "Admin"
      ? true
      : (userPermissions?.communicationHubCollaboration ??
        //@ts-ignore
        companyUserPermissions?.communicationHubCollaboration);
  const [visibleTooltip, setVisibleTooltip] = useState<number | null>(null);
  const [activeDropdown, setActiveDropdown] = useState<number | null>(null);

  const [filteredNavList, setFilteredNavList] = useState(() =>
    filterNavList(navList, permissions, companyFeaturePermission),
  );

  useEffect(() => {
    setFilteredNavList(
      filterNavList(navList, permissions, companyFeaturePermission),
    );
  }, [companyFeaturePermission, navList, permissions]);

  const unReadClientCount = clientConversations?.length || 0;

  const applyTrackChange = useCallback(
    (track: Partial<ClientConversationTrack> | null) => {
      if (!track) return;
      const { clientId, smsIsRead, emailIsRead } = track;
      const isRead =
        smsIsRead !== false &&
        emailIsRead !== false &&
        track.messengerIsRead !== false &&
        track.instagramIsRead !== false;

      setClientConversations((prevClients) => {
        const isCounted = prevClients.some(
          (client) => client.clientId === clientId,
        );

        if (isRead) {
          return isCounted
            ? prevClients.filter((client) => client.clientId !== clientId)
            : prevClients;
        }

        return isCounted ? prevClients : [...prevClients, track];
      });
    },
    [],
  );

  useEffect(() => {
    if (!companyId) return;
    const channel = pusher.subscribe(`client-notify-${companyId}`);
    const handleClientNotify = (data: ClientConversationTrack) => {
      if (!data) return;
      applyTrackChange(data);
    };

    channel.bind("client-notify", handleClientNotify);
    return () => {
      channel.unbind("client-notify", handleClientNotify);
    };
  }, [companyId, applyTrackChange]);

  const fetchClientByUnreadMsg = async () => {
    try {
      const data = await getClientByUnreadMsg(companyId as number);
      if (data && data?.length > 0) {
        setClientConversations(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (companyId) {
      fetchClientByUnreadMsg();
    }
  }, [companyId]);

  useEffect(() => {
    applyTrackChange(clientConversationTrack);
  }, [clientConversationTrack, applyTrackChange]);

  useEffect(() => {
    applyTrackChange(clientTrackUpdate);
  }, [clientTrackUpdate, applyTrackChange]);

  const totalMessageCount =
    (hasClientCommunicationPermission ? unReadClientCount : 0) +
    (hasCollaborationCommunicationPermission
      ? unreadMessageCount.collaborationCount
      : 0) +
    (hasInternalCommunicationPermission ? unreadMessageCount.internalCount : 0);

  return (
    <TooltipProvider delayDuration={200}>
      <nav className="fixed z-10 hidden h-screen flex-col items-center gap-8 overflow-y-auto bg-[#0C1427] px-2 py-12 sm:flex lg:w-[5%]">
        {/* logo */}
        <Link href="/">
          <Image
            src="/icons/Logo.png"
            alt="Company Logo"
            width={40}
            height={40}
          />
        </Link>

        {/* Links */}
        <div className="mb-auto mt-16 flex flex-col items-center gap-4">
          {filteredNavList.map((item, index) =>
            item.subnav ? (
              <Dropdown
                key={index}
                title={item.title}
                index={index}
                activeDropdown={activeDropdown}
                setActiveDropdown={setActiveDropdown}
                active={modifiedPathName === item.path ? true : false}
                icon={
                  <span className="relative inline-flex items-center justify-center">
                    {typeof item.icon === "string" ? (
                      <Image
                        src={item.icon}
                        alt={item.title}
                        width={24}
                        height={24}
                      />
                    ) : (
                      item.icon
                    )}
                    {item.title === "Communication Hub" &&
                      notificationShowPermission &&
                      totalMessageCount > 0 && (
                        <span className="absolute right-0 -top-1 -translate-y-1/2 translate-x-1/2 rounded-full bg-red-500 px-2 py-1 text-xs text-white">
                          {totalMessageCount}
                        </span>
                      )}
                  </span>
                }
              >
                {activeDropdown === index &&
                  item?.subnav?.map((subnavItem, index) => (
                    <DropdownMenuItem
                      key={index}
                      asChild
                      className="cursor-pointer border border-solid border-white bg-background shadow-lg hover:bg-slate-500/80 hover:text-white focus:bg-slate-500/80 focus:text-white"
                    >
                      <Link href={subnavItem.link}>
                        <span>{subnavItem.title}</span>
                        {subnavItem.link ===
                          "/dashboard/communication/client" &&
                          hasClientCommunicationPermission &&
                          unReadClientCount > 0 && (
                            <span className="ml-2 rounded-full bg-red-500 px-2 py-1 text-xs text-white">
                              {unReadClientCount}
                            </span>
                          )}
                        {subnavItem.title === "Internal" &&
                          hasInternalCommunicationPermission &&
                          unreadMessageCount.internalCount > 0 && (
                            <span className="ml-2 rounded-full bg-red-500 px-2 py-1 text-xs text-white">
                              {unreadMessageCount.internalCount}
                            </span>
                          )}
                        {subnavItem.title === "Collaboration" &&
                          hasCollaborationCommunicationPermission &&
                          unreadMessageCount.collaborationCount > 0 && (
                            <span className="ml-2 rounded-full bg-red-500 px-2 py-1 text-xs text-white">
                              {unreadMessageCount.collaborationCount}
                            </span>
                          )}
                      </Link>
                    </DropdownMenuItem>
                  ))}
              </Dropdown>
            ) : (
              <Tooltip key={index}>
                <TooltipTrigger
                  asChild
                  onMouseEnter={() => setVisibleTooltip(index)}
                  onMouseLeave={() => setVisibleTooltip(null)}
                >
                  {item.link && (
                    <Link
                      className={cn(
                        "rounded-sm p-2 hover:bg-background/25",
                        modifiedPathName === item.path &&
                          "!bg-white [&_img]:brightness-0 [&_img]:saturate-100 [&_img]:contrast-150",
                      )}
                      href={item.link}
                    >
                      {typeof item.icon === "string" ? (
                        <Image
                          src={item.icon}
                          alt={item.title}
                          width={20}
                          height={20}
                        />
                      ) : (
                        item.icon
                      )}
                    </Link>
                  )}
                </TooltipTrigger>
                {visibleTooltip === index && (
                  <TooltipContent
                    side="right"
                    sideOffset={8}
                    className="border border-solid border-white bg-slate-500/80 text-white z-[999]"
                  >
                    {item.title}
                  </TooltipContent>
                )}
              </Tooltip>
            ),
          )}
          {/* Visualization */}
          {/* <Tooltip>
            <TooltipTrigger asChild>
              <Link
                href="/dashboard/visualization"
                className={cn(
                  "rounded-sm p-2 hover:bg-background/25",
                  modifiedPathName === "/dashboard/visualization" && "bg-white"
                )}
              >
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 512 512"
                  xmlns="http://www.w3.org/2000/svg"
                  fill={modifiedPathName === "/dashboard/visualization" ? "#000000" : "#ffffff"}
                  className="transition-colors duration-200"
                >
                  <path d="M437.02,74.981C388.668,26.628,324.38,0,256,0S123.333,26.628,74.98,74.981C26.628,123.333,0,187.62,0,256 s26.628,132.667,74.98,181.019C123.333,485.372,187.62,512,256,512s132.667-26.628,181.02-74.981 C485.372,388.668,512,324.38,512,256S485.372,123.333,437.02,74.981z M256,57.263c100.782,0,184.276,75.409,197.04,172.765 L329.849,218.03c-13.813-26.755-41.72-45.102-73.849-45.102s-60.036,18.347-73.849,45.102L58.96,230.028 C71.724,132.672,155.218,57.263,256,57.263z M58.889,281.375l121.731,9.484c7.69,16.55,20.669,30.166,36.76,38.655l7.978,122.859 C138.513,438.875,70.099,368.943,58.889,281.375z M256,281.809c-14.232,0-25.809-11.578-25.809-25.809S241.77,230.191,256,230.191 S281.809,241.77,281.809,256S270.232,281.809,256,281.809z M286.644,452.373l7.978-122.859 c16.091-8.488,29.069-22.105,36.76-38.655l121.731-9.484C441.901,368.943,373.487,438.875,286.644,452.373z" />
                </svg>
              </Link>
            </TooltipTrigger>
            <TooltipContent
              side="right"
              sideOffset={8}
              className="border border-solid border-white bg-slate-500/80 text-white"
            >
              Visualization
            </TooltipContent>
          </Tooltip> */}
        </div>

        {/* Settings */}
        {!isSuperAdminRoute && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Link
                href="/dashboard/settings/my-account"
                className={`rounded-sm p-2 hover:bg-background/25 hover:opacity-50 ${
                  modifiedPathName === "/dashboard/settings" &&
                  "!bg-white [&_img]:brightness-0 [&_img]:saturate-100 [&_img]:contrast-150"
                }`}
              >
                <Image
                  src="/icons/navbar/Settings.svg"
                  alt="Settings"
                  width={20}
                  height={20}
                />
              </Link>
            </TooltipTrigger>
            <TooltipContent
              side="right"
              sideOffset={8}
              className="border border-solid border-white bg-slate-500/80 text-white"
            >
              Settings
            </TooltipContent>
          </Tooltip>
        )}
      </nav>
    </TooltipProvider>
  );
}

function Dropdown({
  title,
  icon,
  index,
  activeDropdown,
  active,
  setActiveDropdown,
  children,
}: {
  title: string;
  icon: ReactNode;
  index: number;
  active: boolean;
  activeDropdown: number | null;
  setActiveDropdown: React.Dispatch<React.SetStateAction<number | null>>;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [toolTip, setTooltip] = useState(false);
  const [visibleTooltip, setVisibleTooltip] = useState(false);

  useEffect(() => {
    if (open) {
      setActiveDropdown(index);
    }
  }, [open]);

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <Tooltip open={!open && toolTip} onOpenChange={setTooltip}>
        <TooltipTrigger
          asChild
          onMouseEnter={() => setVisibleTooltip(true)}
          onMouseLeave={() => setVisibleTooltip(false)}
        >
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className={cn(
                "rounded-sm p-2 hover:bg-background/25",
                open &&
                  activeDropdown === index &&
                  "!bg-white [&_img]:brightness-0 [&_img]:saturate-100 [&_img]:contrast-150",
                active &&
                  "!bg-white [&_img]:brightness-0 [&_img]:saturate-100 [&_img]:contrast-150",
              )}
            >
              {icon}
            </button>
          </DropdownMenuTrigger>
        </TooltipTrigger>

        {visibleTooltip && (
          <TooltipContent
            side="right"
            sideOffset={8}
            className="border border-solid border-white bg-slate-500/80 text-white"
          >
            {title}
          </TooltipContent>
        )}
      </Tooltip>

      <DropdownMenuContent
        side="right"
        align="start"
        sideOffset={8}
        className="-m-4 space-y-1 border-none bg-transparent p-4 shadow-none"
      >
        {children}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
