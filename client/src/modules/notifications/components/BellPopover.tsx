"use client";

import { useState, useRef, useEffect } from "react";
import { Bell, ExternalLink, Settings } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { APP_ROUTES } from "@/config/url";
import { useNotifications, useUnreadCount, useMarkAllAsRead, useMarkAsRead } from "../hooks/useNotifications";
import { timeAgo, NotificationIcon } from "../utils/notifications-ui";
import { cn } from "@/shared/lib/utils";
import type { Notification } from "../types/notification";

function NotificationItem({
  notification,
  onMarkRead,
}: {
  notification: Notification;
  onMarkRead: (id: string) => void;
}) {
  const router = useRouter();

  const handleClick = () => {
    if (!notification.read) {
      onMarkRead(notification.id);
    }
    if (notification.link) {
      router.push(notification.link);
    }
  };

  return (
    <button
      onClick={handleClick}
      className={cn(
        "w-full text-left px-3 py-2.5 flex items-start gap-2 transition-colors hover:bg-muted/50",
        !notification.read && "bg-primary/5"
      )}
    >
      <NotificationIcon type={notification.type} />
      <div className="flex-1 min-w-0">
        <p className={cn("text-sm truncate", !notification.read && "font-semibold")}>
          {notification.title}
        </p>
        {notification.body && (
          <p className="text-xs text-muted-foreground truncate mt-0.5">
            {notification.body}
          </p>
        )}
        <p className="text-[10px] text-muted-foreground/60 mt-1">
          {timeAgo(notification.createdAt)}
        </p>
      </div>
      {!notification.read && (
        <span className="w-2 h-2 rounded-full bg-primary shrink-0 mt-1.5" />
      )}
    </button>
  );
}

export function BellPopover() {
  const [isOpen, setIsOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const { data: unreadCount = 0 } = useUnreadCount();
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } = useNotifications();
  const markAsRead = useMarkAsRead();
  const markAllAsRead = useMarkAllAsRead();

  const allNotifications = data?.pages.flatMap((page) => page.data) ?? [];

  // Close on click outside
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(e.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  // Close on escape
  useEffect(() => {
    if (!isOpen) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false);
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen]);

  return (
    <>
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-1.5 rounded-lg hover:bg-muted transition-colors"
        title="Notifications"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full min-w-[16px] h-4 flex items-center justify-center px-1">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div
          ref={popoverRef}
          className="absolute top-full right-0 mt-2 w-80 bg-popover border rounded-xl shadow-xl overflow-hidden z-50"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-3 py-2.5 border-b">
            <span className="text-sm font-semibold">Notifications</span>
            <div className="flex items-center gap-1">
              <Link
                href={APP_ROUTES.NOTIFICATIONS.INDEX}
                onClick={() => setIsOpen(false)}
                className="p-1 rounded-md hover:bg-muted transition-colors"
                title="View all"
              >
                <ExternalLink className="h-4 w-4" />
              </Link>
              <Link
                href={APP_ROUTES.SETTINGS.NOTIFICATIONS}
                onClick={() => setIsOpen(false)}
                className="p-1 rounded-md hover:bg-muted transition-colors"
                title="Notification settings"
              >
                <Settings className="h-4 w-4" />
              </Link>
            </div>
          </div>

          {/* Notification list */}
          <div className="max-h-80 overflow-y-auto">
            {allNotifications.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">
                No new notifications
              </div>
            ) : (
              <>
                {allNotifications.slice(0, 10).map((notification) => (
                  <NotificationItem
                    key={notification.id}
                    notification={notification}
                    onMarkRead={(id) => markAsRead.mutate(id)}
                  />
                ))}
                {hasNextPage && (
                  <button
                    onClick={() => fetchNextPage()}
                    disabled={isFetchingNextPage}
                    className="w-full py-2 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                  >
                    {isFetchingNextPage ? "Loading..." : "Load more"}
                  </button>
                )}
              </>
            )}
          </div>

          {/* Footer */}
          {unreadCount > 0 && (
            <div className="border-t p-2">
              <button
                onClick={() => markAllAsRead.mutate()}
                disabled={markAllAsRead.isPending}
                className="w-full py-1.5 text-xs text-center text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-md transition-colors"
              >
                {markAllAsRead.isPending ? "Marking..." : "Mark all as read"}
              </button>
            </div>
          )}
        </div>
      )}
    </>
  );
}
