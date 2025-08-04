import type { IconButtonProps } from "@mui/material/IconButton";

import { useCallback, useEffect, useState, useTransition } from "react";

import Avatar from "@mui/material/Avatar";
import Badge from "@mui/material/Badge";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Divider from "@mui/material/Divider";
import IconButton from "@mui/material/IconButton";
import List from "@mui/material/List";
import ListItemAvatar from "@mui/material/ListItemAvatar";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemText from "@mui/material/ListItemText";
import ListSubheader from "@mui/material/ListSubheader";
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
import { CiClock2 } from "react-icons/ci";
import { IoCheckmarkDone } from "react-icons/io5";
import { MdOutlineNotifications } from "react-icons/md";
import { Scrollbar } from "src/components/scrollbar";

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

export type NotificationsPopoverProps = IconButtonProps & {
  data?: Notification[];
};

const takeLimit = 5;
const maxLimit = 100;

export function NotificationsPopover({
  data = [],
  sx,
  ...other
}: NotificationsPopoverProps) {
  const sessionUser = useGetCurrentUser();
  const [notifications, setNotifications] = useState(data);
  const [limit, setLimit] = useState(takeLimit);
  const [totalUnRead, setTotalUnRead] = useState(0);
  const userId = sessionUser?.id;

  const [isViewAll, setIsViewAll] = useState(false);

  // get all notification for user
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
    if (userId) {
      fetchNotifications();
    }
  }, [limit, userId]);

  const [openPopover, setOpenPopover] = useState<HTMLButtonElement | null>(
    null
  );

  // pusher implement my notification
  useEffect(() => {
    let ignore = false;
    // Enable pusher logging - don't include this in production
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
    // setIsViewAll(false);
    // setLimit(takeLimit);
  }, []);

  const handleLinkClick = useCallback(() => {
    setOpenPopover(null);
  }, []);

  // Click to mark all notifications as read
  const handleMarkAllAsRead = useCallback(async () => {
    const updatedNotifications = await markAsAllRead(Number(userId));
    if (updatedNotifications.type === "success") {
      const updateNotificationState = notifications.map((notification) => ({
        ...notification,
        isUnRead: false,
      }));
      setOpenPopover(null);
      setNotifications(updateNotificationState);
      setTotalUnRead(0);
    } else {
      errorToast("Failed to mark all as read");
    }
  }, [notifications]);

  // handle mark as read by id
  const handleMarkAsReadById = async (notificationId: number) => {
    const updatedNotifications = await markAsReadById(notificationId);
    if (updatedNotifications.type === "success") {
      const updateNotificationState = notifications.map((notification) => {
        if (notification.id === notificationId) {
          return {
            ...notification,
            isUnRead: false,
          };
        }
        return notification;
      });
      setNotifications(updateNotificationState);
      setTotalUnRead((prevUnRead) => prevUnRead - 1);
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
          <MdOutlineNotifications className="h-5 w-5 sm:h-7 sm:w-7 text-white sm:text-[#6571FF]" />
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
              width: 360,
              maxHeight: 700,
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
            },
          },
        }}
      >
        <Box
          display="flex"
          alignItems="center"
          sx={{ py: 2, pl: 2.5, pr: 1.5 }}
        >
          <Box sx={{ flexGrow: 1 }}>
            <Typography variant="subtitle1">Notifications</Typography>
            <Typography variant="body2" sx={{ color: "text.secondary" }}>
              You have {totalUnRead} unread messages
            </Typography>
          </Box>

          {totalUnRead > 0 && (
            <Tooltip title=" Mark all as read">
              <IconButton color="primary" onClick={handleMarkAllAsRead}>
                <IoCheckmarkDone className="text-xl" />
              </IconButton>
            </Tooltip>
          )}
        </Box>

        <Divider sx={{ borderStyle: "dashed" }} />

        <Scrollbar
          fillContent
          sx={{ minHeight: 240, maxHeight: { xs: 360, sm: "none" } }}
        >
          <List
            disablePadding
            subheader={
              <ListSubheader
                disableSticky
                sx={{ py: 1, px: 2.5, typography: "overline" }}
              >
                New
              </ListSubheader>
            }
          >
            {notifications.slice(0, 2).map((notification) => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                onMarkAsReadById={handleMarkAsReadById}
                onLinkClick={handleLinkClick}
              />
            ))}
          </List>

          <List
            disablePadding
            className="overflow-y-auto"
            subheader={
              <ListSubheader
                disableSticky
                sx={{ py: 1, px: 2.5, typography: "overline" }}
              >
                Before that
              </ListSubheader>
            }
          >
            {notifications.slice(2).map((notification) => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                onMarkAsReadById={handleMarkAsReadById}
                onLinkClick={handleLinkClick}
              />
            ))}
          </List>
        </Scrollbar>

        {!isViewAll && (
          <>
            <Divider sx={{ borderStyle: "dashed" }} />
            <Box sx={{ p: 1 }}>
              <Button
                onClick={handleViewAllNotifications}
                fullWidth
                disableRipple
                color="inherit"
              >
                View all
              </Button>
            </Box>
          </>
        )}
      </Popover>
    </>
  );
}

// ----------------------------------------------------------------------

function NotificationItem({
  notification,
  onMarkAsReadById,
  onLinkClick,
}: {
  notification: Notification;
  onMarkAsReadById: (id: number) => void;
  onLinkClick: () => void;
}) {
  const { avatarUrl, title } = renderContent(notification);
  const [pending, startTransition] = useTransition();
  return (
    <ListItemButton
      // LinkComponent={Link}
      // href={notification.redirectUrl || ""}
      sx={{
        py: 1.5,
        px: 2.5,
        mt: "1px",
        ...(notification.isUnRead && {
          bgcolor: "action.selected",
        }),
      }}
    >
      <Link
        className="flex items-center"
        href={notification.redirectUrl || ""}
        onClick={onLinkClick}
      >
        <ListItemAvatar>
          <Avatar sx={{ bgcolor: "background.neutral" }}>{avatarUrl}</Avatar>
        </ListItemAvatar>
        <ListItemText
          primary={title}
          secondary={
            <Typography
              variant="caption"
              sx={{
                mt: 0.5,
                gap: 0.5,
                display: "flex",
                alignItems: "center",
                color: "text.disabled",
              }}
            >
              <CiClock2 className="text-sm" />
              {fToNow(notification.createdAt)}
            </Typography>
          }
        />
      </Link>
      {notification.isUnRead && (
        <ListItemText className="shrink-0">
          <Tooltip
            onClick={() =>
              startTransition(() => onMarkAsReadById(notification.id))
            }
            title="Mark as read"
          >
            <IconButton disabled={pending} color="primary">
              <IoCheckmarkDone className="text-xl" />
            </IconButton>
          </Tooltip>
        </ListItemText>
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
