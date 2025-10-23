import type { IconButtonProps } from "@mui/material/IconButton";

import { useCallback, useEffect, useState, useTransition } from "react";

import Avatar from "@mui/material/Avatar";
import Badge from "@mui/material/Badge";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Divider from "@mui/material/Divider";
import IconButton from "@mui/material/IconButton";
import List from "@mui/material/List";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemText from "@mui/material/ListItemText";
import Popover from "@mui/material/Popover";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";

import { fToNow } from "src/utils/formatDate";

import { getNotifications } from "@/actions/notification/getNotifications";
import {
  markAsAllRead,
  markAsReadById,
} from "@/actions/notification/markAsRead";
import { pusher } from "@/lib/pusher/client";
import { errorToast } from "@/lib/toast";
import { useGetCurrentUser } from "@/utils/useGetCurrentUser";
import { Notification } from "@prisma/client";
import Image from "next/image";
import Link from "next/link";
import { Scrollbar } from "src/components/scrollbar";
import { Bell, CheckCheck, Clock } from "lucide-react";

// ----------------------------------------------------------------------

// type NotificationItemProps = {
//   id: string;
//   type: string;
//   title: string;
//   isUnRead: boolean;
//   description: string;
//   avatarUrl: string | null;
//     postedAt: string | number | Date | null;
//   createdAt:
// };

export type NotificationsPopoverProps = IconButtonProps;

const takeLimit = 5;
const maxLimit = 100;

// Modern, aesthetic UI redesign (design-only)
// Logic and state untouched

export function NotificationsPopover({
  sx,
  ...other
}: NotificationsPopoverProps) {
  const sessionUser = useGetCurrentUser();
  const [notifications, setNotifications] = useState([] as Notification[]);
  const [limit, setLimit] = useState(takeLimit);
  const [totalUnRead, setTotalUnRead] = useState(0);
  const userId = sessionUser?.id;
  const [isViewAll, setIsViewAll] = useState(false);

  // TODO: future: use react-query for caching and background updates
  // const { data, isLoading, isFetched } = useQuery({
  //   queryKey: queryKeys.getNotifications(Number(userId)),
  //   queryFn: async () => {
  //     const response = await getNotifications({
  //       userId: Number(userId),
  //       limit,
  //     });
  //     if (response.type === 'success') {
  //       return response.data;
  //     }
  //     return { notifications: [], count: 0 };
  //   },
  //   enabled: !!userId,
  // });

  // console.log({ data, isLoading, isFetched });

  // useEffect(() => {
  //   if (isFetched) {
  //     setNotifications(data?.notifications || []);
  //     setTotalUnRead(data?.count || 0);
  //   }
  // }, [isFetched]);

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

  const [openPopover, setOpenPopover] = useState<HTMLButtonElement | null>(
    null
  );

  useEffect(() => {
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
  }, []);

  const handleViewAllNotifications = useCallback(() => {
    setIsViewAll(true);
    setLimit(maxLimit);
  }, [notifications]);

  const handleOpenPopover = useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) => {
      setOpenPopover(event.currentTarget);
    },
    []
  );

  const handleClosePopover = useCallback(() => {
    setOpenPopover(null);
  }, []);

  const handleLinkClick = useCallback(() => {
    setOpenPopover(null);
  }, []);

  const handleMarkAllAsRead = useCallback(async () => {
    const updated = await markAsAllRead(Number(userId));
    if (updated.type === "success") {
      setNotifications(notifications.map((n) => ({ ...n, isUnRead: false })));
      setOpenPopover(null);
      setTotalUnRead(0);
    } else {
      errorToast("Failed to mark all as read");
    }
  }, [notifications]);

  const handleMarkAsReadById = async (id: number) => {
    const updated = await markAsReadById(id);
    if (updated.type === "success") {
      setNotifications(
        notifications.map((n) => (n.id === id ? { ...n, isUnRead: false } : n))
      );
      setTotalUnRead((prev) => prev - 1);
    } else {
      errorToast("Failed to mark all as read");
    }
  };

  return (
    <>
      <IconButton
        color={openPopover ? "primary" : "default"}
        onClick={handleOpenPopover}
        sx={sx}
        {...other}
      >
        <Badge badgeContent={totalUnRead} color="error">
          <svg
            viewBox="-1.28 -1.28 18.56 18.56"
            xmlns="http://www.w3.org/2000/svg"
            fill="currentColor"
            className="h-5 w-5 sm:h-7 sm:w-7 text-white sm:text-[#6571FF]"
            stroke="currentColor"
            stroke-width="0.41600000000000004"
          >
            <g id="SVGRepo_bgCarrier" stroke-width="0"></g>
            <g
              id="SVGRepo_tracerCarrier"
              stroke-linecap="round"
              stroke-linejoin="round"
            ></g>
            <g id="SVGRepo_iconCarrier">
              {" "}
              <path d="M8 16a2 2 0 0 0 2-2H6a2 2 0 0 0 2 2zM8 1.918l-.797.161A4.002 4.002 0 0 0 4 6c0 .628-.134 2.197-.459 3.742-.16.767-.376 1.566-.663 2.258h10.244c-.287-.692-.502-1.49-.663-2.258C12.134 8.197 12 6.628 12 6a4.002 4.002 0 0 0-3.203-3.92L8 1.917zM14.22 12c.223.447.481.801.78 1H1c.299-.199.557-.553.78-1C2.68 10.2 3 6.88 3 6c0-2.42 1.72-4.44 4.005-4.901a1 1 0 1 1 1.99 0A5.002 5.002 0 0 1 13 6c0 .88.32 4.2 1.22 6z"></path>{" "}
            </g>
          </svg>
        </Badge>
      </IconButton>

      <Popover
        open={!!openPopover}
        anchorEl={openPopover}
        onClose={handleClosePopover}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
        slotProps={{
          paper: {
            sx: {
              width: 400,
              maxHeight: 700,
              p: 0,
              borderRadius: 3,
              overflow: "hidden",
              boxShadow: 5,
              bgcolor: "background.paper",
              display: "flex",
              flexDirection: "column",
            },
          },
        }}
      >
        <Box
          px={3}
          py={2}
          display="flex"
          alignItems="center"
          justifyContent="space-between"
        >
          <Box>
            <Typography variant="h6">Notifications</Typography>
            <Typography variant="body2" color="text.secondary">
              {totalUnRead > 0
                ? `You have ${totalUnRead} unread notifications`
                : "All caught up!"}
            </Typography>
          </Box>
          {totalUnRead > 0 && (
            <Tooltip title="Mark all as read">
              <IconButton onClick={handleMarkAllAsRead} color="primary">
                <CheckCheck size={20} />
              </IconButton>
            </Tooltip>
          )}
        </Box>

        <Divider />

        <Scrollbar sx={{ minHeight: 240, maxHeight: 400 }}>
          <List disablePadding>
            {notifications.map((n, i) => (
              <NotificationItem
                key={n.id}
                notification={n}
                onMarkAsReadById={handleMarkAsReadById}
                onLinkClick={handleLinkClick}
              />
            ))}
          </List>
        </Scrollbar>

        {!isViewAll && (
          <>
            <Divider />
            <Box p={2}>
              <Button
                onClick={handleViewAllNotifications}
                fullWidth
                variant="text"
                sx={{ color: "text.primary" }}
              >
                View All
              </Button>
            </Box>
          </>
        )}
      </Popover>
    </>
  );
}

function NotificationItem({
  notification,
  onMarkAsReadById,
  onLinkClick,
}: any) {
  const { avatarUrl, title } = renderContent(notification);
  const [pending, startTransition] = useTransition();
  return (
    <ListItemButton
      sx={{
        px: 3,
        py: 2,
        alignItems: "start",
        borderBottom: "1px solid #f0f0f0",
        ...(notification.isUnRead && {
          bgcolor: "#f0f5ff",
        }),
      }}
    >
      <Link
        href={notification.redirectUrl || "#"}
        className="flex items-start gap-3"
        onClick={onLinkClick}
      >
        <Avatar sx={{ width: 36, height: 36, bgcolor: "#8E97FF" }}>
          {avatarUrl}
        </Avatar>
        <ListItemText
          primary={title}
          secondary={
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ display: "flex", alignItems: "center", mt: 0.5 }}
            >
              <Clock size={14} className="mr-1" />
              {fToNow(notification.createdAt)}
            </Typography>
          }
        />
      </Link>
      {notification.isUnRead && (
        <Tooltip title="Mark as read">
          <IconButton
            onClick={() =>
              startTransition(() => onMarkAsReadById(notification.id))
            }
            disabled={pending}
          >
            <CheckCheck className="text-xl text-blue-500" />
          </IconButton>
        </Tooltip>
      )}
    </ListItemButton>
  );
}

// ----------------------------------------------------------------------

function renderContent(notification: Notification) {
  const title = (
    <Typography variant="subtitle2">
      {notification.title}
      <Typography
        component="span"
        variant="body2"
        sx={{ color: "text.secondary" }}
      >
        &nbsp; {notification.description}
      </Typography>
    </Typography>
  );

  if (notification.type === "task") {
    return {
      avatarUrl: (
        <Image
          width={24}
          height={24}
          alt={notification.title}
          src={"/icons/navbar/Task.svg"}
        />
      ),
      title,
    };
  }
  if (notification.type === "message") {
    return {
      avatarUrl: (
        <Image
          width={24}
          height={24}
          alt={notification.title}
          src="/icons/navbar/Community.svg"
        />
      ),
      title,
    };
  }
  if (notification.type === "inventory") {
    return {
      avatarUrl: (
        <Image
          width={24}
          height={24}
          alt={notification.title}
          src="/icons/navbar/Inventory.svg"
        />
      ),
      title,
    };
  }
  if (notification.type === "invoice") {
    return {
      avatarUrl: (
        <Image
          width={24}
          height={24}
          alt={notification.title}
          src="/icons/navbar/Invoices.svg"
        />
      ),
      title,
    };
  }
  if (notification.type === "pipelines") {
    return {
      avatarUrl: (
        <Image
          width={24}
          height={24}
          alt={notification.title}
          src="/icons/navbar/Sales.svg"
        />
      ),
      title,
    };
  }
  if (notification.type === "directory") {
    return {
      avatarUrl: (
        <Image
          width={24}
          height={24}
          alt={notification.title}
          src="/icons/navbar/Employee.png"
        />
      ),
      title,
    };
  }
  if (notification.type === "payment") {
    return {
      avatarUrl: (
        <Image
          width={24}
          height={24}
          alt={notification.title}
          src="/icons/navbar/Payments.svg"
        />
      ),
      title,
    };
  }

  return {
    avatarUrl: notification.avatarUrl ? (
      <Image
        width={24}
        height={24}
        alt={notification.title}
        src={notification.avatarUrl}
      />
    ) : null,
    title,
  };
}
