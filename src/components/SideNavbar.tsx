"use client";

import getClientByUnreadMsg from "@/actions/communication/client/getUnreadMessageCount";
import fetchUnreadInternalMessageCount from "@/actions/communication/internal/fetchUnreadInternalMessageCount";
import { useServerGet } from "@/hooks/useServerGet";
import { cn } from "@/lib/cn";
import { PermissionsResult } from "@/lib/getPermissions";
import { filterNavList } from "@/lib/navListAuthorization";
import { pusher } from "@/lib/pusher/client";
import { useClientCommunicationStore } from "@/stores/client-store";
import { useGetCurrentUser } from "@/utils/useGetCurrentUser";
import { ClientConversationTrack } from "@prisma/client";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ReactNode, useEffect, useState } from "react";
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

type TProps = {
  navList: {
    title: string;
    icon: string;
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

  const { data: unreadInternalMessageCountData } = useServerGet(
    fetchUnreadInternalMessageCount,
  );

  useEffect(() => {
    if (unreadInternalMessageCountData?.data) {
      setUnreadMessageCount(unreadInternalMessageCountData.data);
    }
  }, [unreadInternalMessageCountData?.data]);

  const userPermissions = permissions?.userPermissions;
  const companyUserPermissions = permissions?.companyPermissions;
  // check if user has permission to view notification
  const notificationShowPermission =
    permissions?.role === "Admin"
      ? true
      : (userPermissions?.communicationHubClients ??
        //@ts-ignore
        companyUserPermissions?.communicationHubClients);
  const [visibleTooltip, setVisibleTooltip] = useState<number | null>(null);
  const [activeDropdown, setActiveDropdown] = useState<number | null>(null);
  const filteredNavList = filterNavList(navList, permissions);

  const unReadClientCount = clientConversations?.length || 0;

  useEffect(() => {
    pusher
      .subscribe(`client-notify-${companyId}`)
      .bind("client-notify", (data: ClientConversationTrack) => {
        if (!data) return;
        setClientConversations((prevClients) => {
          if (!prevClients) return [data];
          const findConversation = prevClients?.find(
            (conversation) => conversation?.clientId === data?.clientId,
          );
          if (findConversation) {
            return prevClients;
          } else {
            return [...prevClients, data];
          }
        });
      });
    return () => {
      pusher.unbind("client-notify").unsubscribe(`client-notify-${companyId}`);
    };
  }, [pathName]);

  const fetchClientByUnreadMsg = async () => {
    try {
      const data = await getClientByUnreadMsg(companyId as number);
      if (data && data?.length > 0) {
        console.log("Client data from sidenav", data);
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
    if (clientConversationTrack) {
      setClientConversations((prevClients) => {
        return prevClients.filter((client) => {
          if (
            client.clientId === clientConversationTrack.clientId &&
            clientConversationTrack.smsIsRead &&
            clientConversationTrack.emailIsRead
          ) {
            return false;
          }
          return true;
        });
      });
    }
  }, [clientConversationTrack]);

  const totalMessageCount =
    unReadClientCount +
    unreadMessageCount.collaborationCount +
    unreadMessageCount.internalCount;

  console.log("Total message count", unReadClientCount);
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
          <div className="py-0.1 let absolute right-4 top-12 rotate-12 transform gap-2 rounded-md border border-white bg-gradient-to-r from-[#00b8b0] to-[#0098da] px-1 text-[8px] font-bold tracking-wider text-black shadow-lg">
            Beta
          </div>
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
                  <span className="relative">
                    <Image
                      src={item.icon}
                      alt={item.title}
                      width={20}
                      height={20}
                    />
                    {item.title === "Communication Hub" &&
                      notificationShowPermission &&
                      totalMessageCount > 0 && (
                        <span className="absolute -right-5 -top-4 rounded-full bg-red-500 px-2 py-1 text-xs text-white">
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
                          notificationShowPermission &&
                          unReadClientCount > 0 && (
                            <span className="ml-2 rounded-full bg-red-500 px-2 py-1 text-xs text-white">
                              {unReadClientCount}
                            </span>
                          )}
                        {subnavItem.title === "Internal" &&
                          notificationShowPermission &&
                          unreadMessageCount.internalCount > 0 && (
                            <span className="ml-2 rounded-full bg-red-500 px-2 py-1 text-xs text-white">
                              {unreadMessageCount.internalCount}
                            </span>
                          )}
                        {subnavItem.title === "Collaboration" &&
                          notificationShowPermission &&
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
                        modifiedPathName === item.path && "!bg-black invert",
                      )}
                      href={item.link}
                    >
                      <Image
                        src={item.icon}
                        alt={item.title}
                        width={20}
                        height={20}
                      />
                    </Link>
                  )}
                </TooltipTrigger>
                {visibleTooltip === index && (
                  <TooltipContent
                    side="right"
                    sideOffset={8}
                    className="border border-solid border-white bg-slate-500/80 text-white"
                  >
                    {item.title}
                  </TooltipContent>
                )}
              </Tooltip>
            ),
          )}
        </div>

        {/* Settings */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Link
              href="/dashboard/settings/my-account"
              className={`rounded-sm p-2 hover:bg-background/25 hover:opacity-50 ${
                modifiedPathName === "/dashboard/settings" && "!bg-black invert"
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
                open && activeDropdown === index && "!bg-black invert",
                active && "!bg-black invert",
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
