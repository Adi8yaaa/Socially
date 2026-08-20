"use client";

import { getNotifications, getUnreadNotificationCount, markNotificationsAsRead } from "@/actions/notification.action";
import { Avatar, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { BellIcon, HeartIcon, MessageCircleIcon, UserPlusIcon } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

type Notifications = Awaited<ReturnType<typeof getNotifications>>;

function notificationText(type: string) {
  if (type === "LIKE") return "liked your post";
  if (type === "COMMENT") return "commented on your post";
  if (type === "FOLLOW") return "started following you";
  if (type === "MENTION") return "mentioned you";
  if (type === "MESSAGE") return "sent you a message";
  if (type === "REACTION") return "reacted to your post";
  if (type === "REPOST") return "shared your post";
  return "sent a notification";
}

function NotificationIcon({ type }: { type: string }) {
  if (type === "LIKE" || type === "REACTION") return <HeartIcon className="size-4 text-red-500" />;
  if (type === "COMMENT" || type === "MESSAGE" || type === "MENTION") return <MessageCircleIcon className="size-4 text-blue-500" />;
  return <UserPlusIcon className="size-4 text-green-500" />;
}

export default function NotificationDropdown() {
  const [open, setOpen] = useState(false);
  const [count, setCount] = useState(0);
  const [notifications, setNotifications] = useState<Notifications>([]);

  useEffect(() => {
    let active = true;
    const refresh = async () => {
      const [nextCount, nextNotifications] = await Promise.all([getUnreadNotificationCount(), getNotifications(6)]);
      if (!active) return;
      setCount(nextCount);
      setNotifications(nextNotifications);
    };
    refresh();
    const interval = setInterval(refresh, 30000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  const handleOpen = async () => {
    setOpen((value) => !value);
    const unreadIds = notifications.filter((notification) => !notification.read).map((notification) => notification.id);
    if (!open && unreadIds.length > 0) {
      await markNotificationsAsRead(unreadIds);
      setCount(0);
      setNotifications((items) => items.map((item) => ({ ...item, read: true })));
    }
  };

  return (
    <div className="relative">
      <Button variant="ghost" className="relative flex items-center gap-2" onClick={handleOpen}>
        <BellIcon className="w-4 h-4" />
        <span className="hidden lg:inline">Notifications</span>
        {count > 0 && (
          <span className="absolute -right-1 -top-1 grid min-w-5 place-items-center rounded-full bg-red-500 px-1 text-xs font-semibold text-white">
            {count > 99 ? "99+" : count}
          </span>
        )}
      </Button>
      {open && (
        <div className="absolute right-0 z-50 mt-2 w-80 overflow-hidden rounded-md border bg-background shadow-lg">
          <div className="flex items-center justify-between border-b px-4 py-3">
            <p className="font-semibold">Notifications</p>
            <Link href="/notifications" className="text-sm text-primary hover:underline" onClick={() => setOpen(false)}>
              View all
            </Link>
          </div>
          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <p className="p-4 text-sm text-muted-foreground">No notifications yet</p>
            ) : (
              notifications.map((notification) => (
                <Link
                  key={notification.id}
                  href={notification.type === "MESSAGE" ? "/messages" : "/notifications"}
                  className="flex gap-3 border-b p-3 hover:bg-muted/40"
                  onClick={() => setOpen(false)}
                >
                  <Avatar className="size-9">
                    <AvatarImage src={notification.creator.image ?? "/avatar.png"} />
                  </Avatar>
                  <div className="min-w-0 flex-1 text-sm">
                    <div className="flex items-center gap-2">
                      <NotificationIcon type={notification.type} />
                      <span className="truncate">
                        <span className="font-medium">{notification.creator.name ?? notification.creator.username}</span>{" "}
                        {notificationText(notification.type)}
                      </span>
                    </div>
                    {notification.post?.content && <p className="truncate text-muted-foreground">{notification.post.content}</p>}
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
