import { cn } from "@/lib/utils";
import {
  Bell,
  CheckCheck,
  CheckCircle,
  Clock,
  Layers,
  Store,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import React, { useEffect, useState, useTransition } from "react";
import { fToNow } from "src/utils/formatDate";

// Shadcn UI Components
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

// Logic Imports
import { getNotifications } from "@/actions/notification/getNotifications";
import {
  markAsAllRead,
  markAsReadById,
} from "@/actions/notification/markAsRead";
import { pusher } from "@/lib/pusher/client";
import { errorToast } from "@/lib/toast";
import { useGetCurrentUser } from "@/utils/useGetCurrentUser";
import { Notification } from "@prisma/client";

const takeLimit = 5;
const maxLimit = 100;

export function NotificationsPopover() {
  const sessionUser = useGetCurrentUser();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [limit, setLimit] = useState(takeLimit);
  const [totalUnRead, setTotalUnRead] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [isViewAll, setIsViewAll] = useState(false);
  const userId = sessionUser?.id;

  // --- Data Fetching Logic ---
  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const response = await getNotifications({
          userId: Number(userId),
          limit,
        });
        if (response.type === "success") {
          setNotifications(response.data.notifications);
          setTotalUnRead(response.data.count);
        }
      } catch (err) {
        console.error(err);
      }
    };
    if (userId) fetchNotifications();
  }, [limit, userId]);

  // --- Real-time Pusher Logic ---
  useEffect(() => {
    if (!userId) return;
    let ignore = false;
    pusher
      .subscribe(`noti-${userId}`)
      .bind("notification", function (data: Notification) {
        if (!ignore) {
          setNotifications((prev) => [data, ...prev]);
          setTotalUnRead((prev) => prev + 1);
        }
      });
    return () => {
      ignore = true;
      pusher.unsubscribe(`noti-${userId}`);
    };
  }, [userId]);

  const handleMarkAllAsRead = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = await markAsAllRead(Number(userId));
    if (updated.type === "success") {
      setNotifications(notifications.map((n) => ({ ...n, isUnRead: false })));
      setTotalUnRead(0);
    } else {
      errorToast("Failed to mark all as read");
    }
  };

  const handleMarkReadById = async (id: number) => {
    const updated = await markAsReadById(id);
    if (updated.type === "success") {
      setNotifications(
        notifications.map((n) => (n.id === id ? { ...n, isUnRead: false } : n)),
      );
      setTotalUnRead((prev) => Math.max(0, prev - 1));
    } else {
      errorToast("Failed to mark all as read");
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <button className="relative h-9 w-9 rounded-full p-1">
          <svg
            viewBox="-1.28 -1.28 18.56 18.56"
            xmlns="http://www.w3.org/2000/svg"
            fill="currentColor"
            className="h-5 w-5 sm:h-7 sm:w-7 text-white sm:text-primary"
            stroke="currentColor"
            strokeWidth="0.41600000000000004"
          >
            <g id="SVGRepo_bgCarrier" strokeWidth="0"></g>
            <g
              id="SVGRepo_tracerCarrier"
              strokeLinecap="round"
              strokeLinejoin="round"
            ></g>
            <g id="SVGRepo_iconCarrier">
              {" "}
              <path d="M8 16a2 2 0 0 0 2-2H6a2 2 0 0 0 2 2zM8 1.918l-.797.161A4.002 4.002 0 0 0 4 6c0 .628-.134 2.197-.459 3.742-.16.767-.376 1.566-.663 2.258h10.244c-.287-.692-.502-1.49-.663-2.258C12.134 8.197 12 6.628 12 6a4.002 4.002 0 0 0-3.203-3.92L8 1.917zM14.22 12c.223.447.481.801.78 1H1c.299-.199.557-.553.78-1C2.68 10.2 3 6.88 3 6c0-2.42 1.72-4.44 4.005-4.901a1 1 0 1 1 1.99 0A5.002 5.002 0 0 1 13 6c0 .88.32 4.2 1.22 6z"></path>{" "}
            </g>
          </svg>
          {totalUnRead > 0 && (
            <Badge className="absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full border-2 border-white bg-red-500 hover:bg-red-600 p-0 text-[10px] font-bold text-white">
              {totalUnRead > 99 ? "99+" : totalUnRead}
            </Badge>
          )}
        </button>
      </PopoverTrigger>

      <PopoverContent
        align="end"
        className="w-[380px] rounded-[2rem] p-0 shadow-2xl border-slate-100 overflow-hidden"
      >
        <div className="flex items-center justify-between p-5">
          <div className="space-y-0.5">
            <h3 className="text-lg font-semibold text-slate-700">
              Notifications
            </h3>
            <p className="text-xs font-medium text-slate-500">
              {totalUnRead > 0
                ? `You have ${totalUnRead} unread updates`
                : "All caught up!"}
            </p>
          </div>
          {totalUnRead > 0 && (
            <Button
              variant="ghost"
              size="icon"
              className="text-primary"
              onClick={handleMarkAllAsRead}
            >
              <CheckCheck size={18} />
            </Button>
          )}
        </div>

        <Separator />

        <ScrollArea className="h-[400px]">
          {notifications.length > 0 ? (
            <div className="flex flex-col">
              {notifications.map((n) => (
                <NotificationItem
                  key={n.id}
                  notification={n}
                  setIsOpen={setIsOpen}
                  onMarkRead={handleMarkReadById}
                />
              ))}
            </div>
          ) : (
            <div className="flex h-[300px] flex-col items-center justify-center text-slate-300">
              <Layers size={40} className="mb-2 opacity-20" />
              <p className="text-sm font-medium">No notifications yet</p>
            </div>
          )}
        </ScrollArea>

        {!isViewAll && notifications.length > 0 && (
          <div className="p-3 bg-slate-50/50 hover:bg-slate-100 border-t border-slate-200">
            <button
              className="w-full font-semibold text-primary"
              onClick={() => {
                setLimit(maxLimit);
                setIsViewAll(true);
              }}
            >
              View All
            </button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

// A completed task is filtered out of the calendar, so linking to it would land
// the user on a day with nothing to see. These stay read-only.
const COMPLETED_TASK_TITLES = new Set([
  "Task Completed",
  "Assigned Task Completed",
]);

function NotificationItem({ notification, setIsOpen, onMarkRead }: any) {
  const [isPending, startTransition] = useTransition();
  const { avatarUrl, title } = renderContent(notification);
  const isNavigable =
    !!notification.redirectUrl &&
    notification.redirectUrl !== "/" &&
    !COMPLETED_TASK_TITLES.has(notification.title);

  const handleAction = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (notification.isUnRead)
      startTransition(() => onMarkRead(notification.id));
  };

  return (
    <div
      className={cn(
        "group relative flex items-start gap-4 p-4 transition-all hover:bg-slate-50",
        notification.isUnRead && "bg-primary/[0.02]",
      )}
    >
      <div
        className={cn(
          "mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl",
          notification.isUnRead
            ? "bg-primary text-white shadow-lg shadow-primary/30"
            : "bg-primary/20 text-primary",
        )}
      >
        {avatarUrl}
      </div>

      <div className="flex flex-1 min-w-0 flex-col gap-1">
        {isNavigable ? (
          <Link
            href={notification.redirectUrl}
            onClick={() => {
              setIsOpen(false);
              if (notification.isUnRead) onMarkRead(notification.id);
            }}
            className="text-sm font-semibold leading-tight text-slate-700"
          >
            {title}
          </Link>
        ) : (
          <span className="text-sm font-semibold leading-tight text-slate-700">
            {title}
          </span>
        )}
        <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
          <Clock size={12} />
          {fToNow(notification.createdAt)}
        </div>
      </div>

      {notification.isUnRead && (
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 text-primary hover:text-primary/80"
          onClick={handleAction}
          disabled={isPending}
        >
          <CheckCircle size={6} strokeWidth={2.5} className="animate-pulse" />
        </Button>
      )}
    </div>
  );
}

function renderContent(notification: Notification) {
  const notiType = notification.type ?? "";

  const title = (
    <span>
      {notification.title}{" "}
      <span className="font-medium text-slate-400">
        {notification.description}
      </span>
    </span>
  );

  const getIcon = (src: string) => (
    <Image
      width={20}
      height={20}
      alt=""
      src={src}
      className="brightness-0 invert"
    />
  );

  const typeMap: Record<string, string> = {
    task: "/icons/navbar/Task.svg",
    message: "/icons/navbar/Community.svg",
    inventory: "/icons/navbar/Inventory.svg",
    invoice: "/icons/navbar/Invoices.svg",
    payment: "/icons/navbar/Payments.svg",
  };

  const iconMap: Record<string, React.ReactNode> = {
    virtualShop: <Store size={22} />,
  };

  return {
    avatarUrl:
      iconMap[notiType] ??
      (typeMap[notiType] ? getIcon(typeMap[notiType]) : <Bell size={18} />),
    title,
  };
}
