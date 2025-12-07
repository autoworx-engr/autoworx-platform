"use client";

import getClientByUnreadMsg from "@/actions/communication/client/getUnreadMessageCount";
import fetchUnreadInternalMessageCount from "@/actions/communication/internal/fetchUnreadInternalMessageCount";
import { useServerGet } from "@/hooks/useServerGet";
import { cn } from "@/lib/cn";
import { PermissionsResult } from "@/lib/getPermissions";
import { FEATURE_PERMISSIONS_MAP } from "@/lib/routePermissionsMap";
import { useCompanyFeaturePermissionStore } from "@/stores/companyFeaturePermissionStore";
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
import { useSession } from "next-auth/react";
import { filterNavList } from "@/lib/navListAuthorization";
import {
  BarChart3,
  Calendar,
  ChartPie,
  CheckSquare,
  CreditCard,
  FileText,
  GitBranch,
  LayoutDashboard,
  LucideIcon,
  MessageSquare,
  Package,
  Settings,
  SquareActivity,
  Users,
} from "lucide-react";

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

const iconMap: Record<string, React.ComponentType<any> | string> = {
  // "/icons/navbar/Dashboard.svg": LayoutDashboard,
  Dashboard: LayoutDashboard,
  // "/icons/navbar/Community.svg": MessageSquare,
  "Communication Hub": "/icons/navbar/message.svg",
  // "/icons/navbar/Sales.svg": GitBranch,
  Pipelines: SquareActivity,
  // "/icons/navbar/Task.svg": CheckSquare,
  "Task and Activity Management": Calendar,
  // "/icons/navbar/Analytics.svg": BarChart3,
  "Analytics and Reporting": ChartPie,
  // "/icons/navbar/Invoices.svg": FileText,
  Invoices: FileText,
  // "/icons/navbar/Payments.svg": CreditCard,
  Payments: "/icons/navbar/coin.svg",
  // "/icons/navbar/Inventory.svg": Package,
  Inventory: Package,
  // "/icons/navbar/Employee.png": Users,
  Directory: Users,
  // "/icons/navbar/Settings.svg": Settings,
  Settings: Settings,
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
    (state) => state.clientConversationTrack
  );

  const { data: unreadInternalMessageCountData } = useServerGet(
    fetchUnreadInternalMessageCount
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
  // Helper: Check if company feature permission allows access to this route
  function canAccessCompanyFeatureRoute(route: string): boolean {
    if (!companyFeaturePermission || companyFeaturePermission.length === 0)
      return true;
    const routeWithoutQuery = route.split("?")[0];
    const featureKey = FEATURE_PERMISSIONS_MAP[routeWithoutQuery];
    if (!featureKey) return true;
    if (Array.isArray(featureKey)) {
      return featureKey.some((key) =>
        companyFeaturePermission.some(
          (perm) => perm.permission_name === key && perm.enabled
        )
      );
    }
    return companyFeaturePermission.some(
      (perm) => perm.permission_name === featureKey && perm.enabled
    );
  }
  // First filter by permissions, then by company feature permission
  const [filteredNavList, setFilteredNavList] = useState(() => {
    // Permission-based filtering
    let permissionFiltered = filterNavList(navList, permissions);
    // Company feature permission filtering
    return permissionFiltered
      .filter((item) => !item.link || canAccessCompanyFeatureRoute(item.link))
      .map((item) => {
        if (item.subnav) {
          const filteredSubnav = item.subnav.filter((sub) =>
            canAccessCompanyFeatureRoute(sub.link)
          );
          return {
            ...item,
            subnav: filteredSubnav.length > 0 ? filteredSubnav : null,
          };
        }
        return item;
      });
  });

  useEffect(() => {
    // Permission-based filtering
    let permissionFiltered = filterNavList(navList, permissions);
    // Company feature permission filtering
    setFilteredNavList(
      permissionFiltered
        .filter((item) => !item.link || canAccessCompanyFeatureRoute(item.link))
        .map((item) => {
          if (item.subnav) {
            const filteredSubnav = item.subnav.filter((sub) =>
              canAccessCompanyFeatureRoute(sub.link)
            );
            return {
              ...item,
              subnav: filteredSubnav.length > 0 ? filteredSubnav : null,
            };
          }
          return item;
        })
    );
  }, [companyFeaturePermission, navList, permissions]);

  const unReadClientCount = clientConversations?.length || 0;

  // const fetchClientByUnreadMsg = async () => {
  //     try {
  //         const data = await getClientByUnreadMsg(companyId as number);
  //         if (data && data?.length > 0) {
  //             setClientConversations(data);
  //         }
  //     } catch (err) {
  //         console.error(err);
  //     }
  // };

  // // Filter navList and subnavs by company feature permission
  // const [filteredNavList, setFilteredNavList] = useState(() =>
  //     navList
  //         .filter(
  //             item => !item.link || canAccessCompanyFeatureRoute(item.link)
  //         )
  //         .map(item => {
  //             if (item.subnav) {
  //                 const filteredSubnav = item.subnav.filter(sub =>
  //                     canAccessCompanyFeatureRoute(sub.link)
  //                 );
  //                 return {
  //                     ...item,
  //                     subnav:
  //                         filteredSubnav.length > 0 ? filteredSubnav : null,
  //                 };
  //             }
  //             return item;
  //         })
  // );

  // const unReadClientCount = clientConversations?.length || 0;

  useEffect(() => {
    pusher
      .subscribe(`client-notify-${companyId}`)
      .bind("client-notify", (data: ClientConversationTrack) => {
        if (!data) return;
        setClientConversations((prevClients) => {
          if (!prevClients) return [data];
          const findConversation = prevClients?.find(
            (conversation) => conversation?.clientId === data?.clientId
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
    (hasClientCommunicationPermission ? unReadClientCount : 0) +
    (hasCollaborationCommunicationPermission
      ? unreadMessageCount.collaborationCount
      : 0) +
    (hasInternalCommunicationPermission ? unreadMessageCount.internalCount : 0);

  return (
    <TooltipProvider delayDuration={200}>
      <nav className="fixed z-10 hidden h-screen flex-col items-center gap-8 overflow-y-auto overflow-x-hidden bg-gradient-to-b from-gray-50 to-gray-100 backdrop-blur-xl px-3 py-12 sm:flex lg:w-[5%] shadow-[8px_0_24px_rgba(0,0,0,0.06)] border-r border-white/50">
        <Link href="/" className="relative">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-500 via-cyan-500 to-blue-600 flex items-center justify-center shadow-[0_8px_16px_rgba(59,130,246,0.3)] hover:shadow-[0_12px_24px_rgba(59,130,246,0.4)] transition-all duration-300 hover:scale-105">
            <Image
              src="/icons/logo1.webp"
              alt="Company Logo"
              width={24}
              height={24}
              className="brightness-0 invert"
            />
          </div>
          <div className="absolute -right-2 -top-1 rotate-12 transform rounded-md bg-gradient-to-r from-cyan-400 to-blue-500 px-1.5 py-0.5 text-[7px] font-bold tracking-wider text-white shadow-lg backdrop-blur-sm">
            Beta
          </div>
        </Link>

        <div className="mb-auto mt-16 flex flex-col items-center gap-3">
          {filteredNavList.map((item, index) => {
            const IconComponent = iconMap[item.title];
            const isCustomSvg = typeof IconComponent === "string";
            return item.subnav ? (
              <Dropdown
                key={index}
                title={item.title}
                index={index}
                activeDropdown={activeDropdown}
                setActiveDropdown={setActiveDropdown}
                active={modifiedPathName === item.path ? true : false}
                icon={
                  <span className="relative inline-flex items-center justify-center">
                    {isCustomSvg ? (
                      <Image
                        src={IconComponent as string}
                        alt={item.title}
                        width={20}
                        height={20}
                        className="w-5 h-5 opacity-60"
                      />
                    ) : (
                      IconComponent && (
                        <IconComponent className="w-5 h-5 text-gray-700" />
                      )
                    )}
                    {item.title === "Communication Hub" &&
                      notificationShowPermission &&
                      totalMessageCount > 0 && (
                        <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-br from-red-500 to-pink-600 text-[10px] font-semibold text-white shadow-[0_4px_12px_rgba(239,68,68,0.5)] ring-2 ring-white">
                          {totalMessageCount > 99 ? "99+" : totalMessageCount}
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
                      className="cursor-pointer rounded-xl bg-white/80 backdrop-blur-md shadow-[0_4px_16px_rgba(0,0,0,0.08)] hover:bg-white hover:shadow-[0_8px_24px_rgba(59,130,246,0.15)] border border-white/50 focus:bg-white transition-all duration-200 min-w-[200px]"
                    >
                      <Link
                        href={subnavItem.link}
                        className="flex items-center justify-between w-full"
                      >
                        <span className="text-gray-700 font-medium text-sm">
                          {subnavItem.title}
                        </span>
                        {subnavItem.link ===
                          "/dashboard/communication/client" &&
                          hasClientCommunicationPermission &&
                          unReadClientCount > 0 && (
                            <span className="ml-2 flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-red-500 to-pink-600 text-[10px] font-semibold text-white shadow-[0_4px_12px_rgba(239,68,68,0.4)]">
                              {unReadClientCount > 99
                                ? "99+"
                                : unReadClientCount}
                            </span>
                          )}
                        {subnavItem.title === "Internal" &&
                          hasInternalCommunicationPermission &&
                          unreadMessageCount.internalCount > 0 && (
                            <span className="ml-2 flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-red-500 to-pink-600 text-[10px] font-semibold text-white shadow-[0_4px_12px_rgba(239,68,68,0.4)]">
                              {unreadMessageCount.internalCount > 99
                                ? "99+"
                                : unreadMessageCount.internalCount}
                            </span>
                          )}
                        {subnavItem.title === "Collaboration" &&
                          hasCollaborationCommunicationPermission &&
                          unreadMessageCount.collaborationCount > 0 && (
                            <span className="ml-2 flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-red-500 to-pink-600 text-[10px] font-semibold text-white shadow-[0_4px_12px_rgba(239,68,68,0.4)]">
                              {unreadMessageCount.collaborationCount > 99
                                ? "99+"
                                : unreadMessageCount.collaborationCount}
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
                        "rounded-2xl p-2.5 transition-all duration-300 backdrop-blur-sm",
                        modifiedPathName === item.path
                          ? "bg-gradient-to-br from-blue-500 to-cyan-500 shadow-[0_8px_20px_rgba(59,130,246,0.35)] hover:shadow-[0_12px_28px_rgba(59,130,246,0.45)] scale-105"
                          : " hover:bg-white/60 bg-[#e0e0e0] hover:bg-[#e8e8e8] shadow-[-12px -12px 24px 5px rgba(255, 255, 255, 0.035),12px 12px 24px 5px rgba(0, 0, 0, 0.07)] shadow-[inset_-3px_-3px_8px_rgba(255,255,255,0.8),inset_3px_3px_8px_rgba(0,0,0,0.08)]"
                      )}
                      href={item.link}
                    >
                      {isCustomSvg ? (
                        <Image
                          src={IconComponent as string}
                          alt={item.title}
                          width={20}
                          height={20}
                          className={cn(
                            "w-5 h-5 transition-all duration-300",
                            modifiedPathName === item.path
                              ? "brightness-0 invert opacity-100"
                              : "opacity-60"
                          )}
                        />
                      ) : (
                        IconComponent && (
                          <IconComponent
                            className={cn(
                              "w-5 h-5 transition-all duration-300",
                              modifiedPathName === item.path
                                ? "text-white drop-shadow-md"
                                : "text-gray-700"
                            )}
                          />
                        )
                      )}
                    </Link>
                  )}
                </TooltipTrigger>
                {visibleTooltip === index && (
                  <TooltipContent
                    side="right"
                    sideOffset={8}
                    className="rounded-xl bg-white/90 backdrop-blur-md px-3 py-2 text-sm font-medium text-gray-700 shadow-[0_8px_24px_rgba(0,0,0,0.12)] border border-white/50 z-[999]"
                  >
                    {item.title}
                  </TooltipContent>
                )}
              </Tooltip>
            );
          })}
        </div>

        {!isSuperAdminRoute && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Link
                href="/dashboard/settings/my-account"
                className={cn(
                  "rounded-[25px] p-2.5 transition-all duration-300 backdrop-blur-sm",
                  modifiedPathName === "/dashboard/settings"
                    ? "bg-gradient-to-br from-blue-500 to-cyan-500 shadow-[0_8px_20px_rgba(59,130,246,0.35)] hover:shadow-[0_12px_28px_rgba(59,130,246,0.45)] scale-105"
                    : "hover:bg-white/60 bg-[#e0e0e0] hover:bg-[#e8e8e8] shadow-[-12px -12px 24px 5px rgba(255, 255, 255, 0.035),12px 12px 24px 5px rgba(0, 0, 0, 0.07)] shadow-[inset_-3px_-3px_8px_rgba(255,255,255,0.8),inset_3px_3px_8px_rgba(0,0,0,0.08)]"
                )}
              >
                {/* <Image
                  src="/icons/navbar/Settings.svg"
                  alt="Settings"
                  width={20}
                  height={20}
                  className={cn(
                    "opacity-60",
                    modifiedPathName === "/dashboard/settings" && "brightness-0 invert opacity-100"
                  )}
                /> */}
                <Settings
                  className={cn(
                    "w-5 h-5 transition-all duration-300",
                    modifiedPathName === "/dashboard/settings"
                      ? "text-white drop-shadow-md"
                      : "text-gray-700"
                  )}
                />
              </Link>
            </TooltipTrigger>
            <TooltipContent
              side="right"
              sideOffset={8}
              className="rounded-xl bg-white/90 backdrop-blur-md px-3 py-2 text-sm font-medium text-gray-700 shadow-[0_8px_24px_rgba(0,0,0,0.12)] border border-white/50 z-[999]"
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
                "rounded-2xl p-2.5 transition-all duration-300 backdrop-blur-sm",
                (open && activeDropdown === index) || active
                  ? "bg-gradient-to-br from-blue-500 to-cyan-500 shadow-[0_8px_20px_rgba(59,130,246,0.35)] scale-105"
                  : "hover:bg-white/60 bg-[#e0e0e0] hover:bg-[#e8e8e8] shadow-[-12px -12px 24px 5px rgba(255, 255, 255, 0.035),12px 12px 24px 5px rgba(0, 0, 0, 0.07)] shadow-[inset_-3px_-3px_8px_rgba(255,255,255,0.8),inset_3px_3px_8px_rgba(0,0,0,0.08)]"
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
            className="rounded-xl bg-white/90 backdrop-blur-md px-3 py-2 text-sm font-medium text-gray-700 shadow-[0_8px_24px_rgba(0,0,0,0.12)] border border-white/50 z-[999]"
          >
            {title}
          </TooltipContent>
        )}
      </Tooltip>

      <DropdownMenuContent
        side="right"
        align="start"
        sideOffset={8}
        className="space-y-2 border-none bg-transparent p-2 shadow-none"
      >
        {children}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
