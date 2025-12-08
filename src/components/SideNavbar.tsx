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
  MessageCircleMore,
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
  "Communication Hub": MessageCircleMore,
  // "/icons/navbar/Sales.svg": GitBranch,
  Pipelines: SquareActivity,
  // "/icons/navbar/Task.svg": CheckSquare,
  "Task and Activity Management": Calendar,
  // "/icons/navbar/Analytics.svg": BarChart3,
  "Analytics and Reporting": ChartPie,
  // "/icons/navbar/Invoices.svg": FileText,
  Invoices: FileText,
  // "/icons/navbar/Payments.svg": CreditCard, /icons/navbar/coin.svg
  Payments: CreditCard,
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
      <nav className="fixed z-10 hidden h-screen flex-col items-center gap-6 overflow-y-auto overflow-x-hidden bg-gradient-to-b from-white via-slate-50/80 to-white dark:from-slate-50 dark:via-slate-100/80 dark:to-slate-50 backdrop-blur-xl px-4 py-8 sm:flex lg:w-[100px] shadow-[16px_0_32px_rgba(0,0,0,0.08)] border-r border-slate-200/60">
        <Link href="/" className="relative mb-4 group">
          <Image
            src="/images/solution/logo1.png"
            alt="Company Logo"
            width={40}
            height={40}
          />
          <div className="absolute -right-3 -top-2 rotate-12 transform rounded-lg bg-gradient-to-r from-[#6571FF] to-[#5a66ee] px-1.5 py-0.5 text-[7px] font-bold tracking-widest text-white shadow-lg backdrop-blur-md border border-white/20">
            Beta
          </div>
        </Link>

        <div className="w-8 h-px bg-gradient-to-r from-transparent via-slate-300 to-transparent mb-6" />

        <div className="mb-auto mt-8 flex flex-col items-center gap-3">
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
                        className="w-5 h-5 opacity-85 transition-all duration-300"
                      />
                    ) : (
                      IconComponent && (
                        <IconComponent
                          className={cn(
                            "w-5 h-5 transition-all duration-300",
                            modifiedPathName === item.path
                              ? "text-white drop-shadow-md"
                              : "text-slate-700 hover:text-slate-900"
                          )}
                        />
                      )
                    )}
                    {item.title === "Communication Hub" &&
                      notificationShowPermission &&
                      totalMessageCount > 0 && (
                        <span className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-r from-[#6571FF] to-[#7c3aed] text-[10px] font-bold text-white shadow-[0_4px_16px_rgba(101,113,255,0.5)] ring-2 ring-slate-900 animate-pulse">
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
                      className="cursor-pointer rounded-xl bg-white dark:bg-slate-50 backdrop-blur-md shadow-[0_4px_16px_rgba(0,0,0,0.08)] hover:bg-slate-50 dark:hover:bg-slate-100 hover:shadow-[0_8px_24px_rgba(101,113,255,0.12)] border border-slate-200/80 dark:border-slate-300/60 focus:bg-slate-50 dark:focus:bg-slate-100 transition-all duration-200 min-w-[220px] overflow-hidden"
                    >
                      <Link
                        href={subnavItem.link}
                        className="flex items-center justify-between w-full px-4 py-3"
                      >
                        <span className="text-slate-800 dark:text-slate-900 font-medium text-sm">
                          {subnavItem.title}
                        </span>
                        {subnavItem.link ===
                          "/dashboard/communication/client" &&
                          hasClientCommunicationPermission &&
                          unReadClientCount > 0 && (
                            <span className="ml-2 flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-r from-[#6571FF] to-[#7c3aed] text-[10px] font-bold text-white shadow-[0_4px_12px_rgba(101,113,255,0.5)]">
                              {unReadClientCount > 99
                                ? "99+"
                                : unReadClientCount}
                            </span>
                          )}
                        {subnavItem.title === "Internal" &&
                          hasInternalCommunicationPermission &&
                          unreadMessageCount.internalCount > 0 && (
                            <span className="ml-2 flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-r from-[#6571FF] to-[#7c3aed] text-[10px] font-bold text-white shadow-[0_4px_12px_rgba(101,113,255,0.5)]">
                              {unreadMessageCount.internalCount > 99
                                ? "99+"
                                : unreadMessageCount.internalCount}
                            </span>
                          )}
                        {subnavItem.title === "Collaboration" &&
                          hasCollaborationCommunicationPermission &&
                          unreadMessageCount.collaborationCount > 0 && (
                            <span className="ml-2 flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-r from-[#6571FF] to-[#7c3aed] text-[10px] font-bold text-white shadow-[0_4px_12px_rgba(101,113,255,0.5)]">
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
                        "rounded-2xl p-3 transition-all duration-300 backdrop-blur-sm flex items-center justify-center border",
                        modifiedPathName === item.path
                          ? "bg-gradient-to-br from-[#6571FF] to-[#7c3aed] shadow-[0_8px_24px_rgba(101,113,255,0.3)] hover:shadow-[0_12px_32px_rgba(101,113,255,0.4)] scale-110 border-[#6571FF]/40"
                          : "bg-slate-100 dark:bg-slate-200 border-slate-300/70 dark:border-slate-400/70 hover:bg-slate-150 dark:hover:bg-slate-250 hover:border-slate-400 dark:hover:border-slate-500 hover:shadow-[0_8px_20px_rgba(101,113,255,0.15)] hover:-translate-y-0.5"
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
                              ? "brightness-0 invert opacity-100 drop-shadow-lg"
                              : "opacity-85 hover:opacity-100"
                          )}
                        />
                      ) : (
                        IconComponent && (
                          <IconComponent
                            className={cn(
                              "w-5 h-5 transition-all duration-300",
                              modifiedPathName === item.path
                                ? "text-white drop-shadow-md"
                                : "text-slate-600 hover:text-slate-800"
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
                    sideOffset={12}
                    className="rounded-xl bg-white dark:bg-slate-50 backdrop-blur-md px-3 py-2 text-sm font-medium text-slate-800 dark:text-slate-900 shadow-[0_8px_32px_rgba(0,0,0,0.12)] border border-slate-200/70 dark:border-slate-300/60 z-[999]"
                  >
                    {item.title}
                  </TooltipContent>
                )}
              </Tooltip>
            );
          })}
        </div>

        {!isSuperAdminRoute && (
          <>
            <div className="w-8 h-px bg-gradient-to-r from-transparent via-slate-300 to-transparent mt-6 mb-4" />
            <Tooltip>
              <TooltipTrigger asChild>
                <Link
                  href="/dashboard/settings/my-account"
                  className={cn(
                    "rounded-2xl p-3 transition-all duration-300 backdrop-blur-sm flex items-center justify-center border",
                    modifiedPathName === "/dashboard/settings"
                      ? "bg-gradient-to-br from-[#6571FF] to-[#7c3aed] shadow-[0_8px_24px_rgba(101,113,255,0.3)] hover:shadow-[0_12px_32px_rgba(101,113,255,0.4)] scale-110 -translate-y-1 border-[#6571FF]/40"
                      : "bg-slate-100 dark:bg-slate-200 border-slate-300/70 dark:border-slate-400/70 hover:bg-slate-150 dark:hover:bg-slate-250 hover:border-slate-400 dark:hover:border-slate-500 hover:shadow-[0_8px_20px_rgba(101,113,255,0.15)] hover:-translate-y-0.5"
                  )}
                >
                  <Settings
                    className={cn(
                      "w-5 h-5 transition-all duration-300",
                      modifiedPathName === "/dashboard/settings"
                        ? "text-white drop-shadow-md"
                        : "text-slate-600 hover:text-slate-800"
                    )}
                  />
                </Link>
              </TooltipTrigger>
              <TooltipContent
                side="right"
                sideOffset={12}
                className="rounded-xl bg-white dark:bg-slate-50 backdrop-blur-md px-3 py-2 text-sm font-medium text-slate-800 dark:text-slate-900 shadow-[0_8px_32px_rgba(0,0,0,0.12)] border border-slate-200/70 dark:border-slate-300/60 z-[999]"
              >
                Settings
              </TooltipContent>
            </Tooltip>
          </>
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
                "rounded-2xl p-3 transition-all duration-300 backdrop-blur-sm flex items-center justify-center border",
                (open && activeDropdown === index) || active
                  ? "bg-gradient-to-br from-[#6571FF] to-[#7c3aed] shadow-[0_8px_24px_rgba(101,113,255,0.3)] scale-110 -translate-y-1 border-[#6571FF]/40"
                  : "bg-slate-100 dark:bg-slate-200 border-slate-300/70 dark:border-slate-400/70 hover:bg-slate-150 dark:hover:bg-slate-250 hover:border-slate-400 dark:hover:border-slate-500 hover:shadow-[0_8px_20px_rgba(101,113,255,0.15)] hover:-translate-y-0.5"
              )}
            >
              {icon}
            </button>
          </DropdownMenuTrigger>
        </TooltipTrigger>

        {visibleTooltip && (
          <TooltipContent
            side="right"
            sideOffset={12}
            className="rounded-xl bg-white dark:bg-slate-50 backdrop-blur-md px-3 py-2 text-sm font-medium text-slate-800 dark:text-slate-900 shadow-[0_8px_32px_rgba(0,0,0,0.12)] border border-slate-200/70 dark:border-slate-300/60 z-[999]"
          >
            {title}
          </TooltipContent>
        )}
      </Tooltip>

      <DropdownMenuContent
        side="right"
        align="start"
        sideOffset={12}
        className="space-y-1.5 border-none bg-transparent p-2 shadow-none"
      >
        {children}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
